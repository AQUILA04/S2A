"use server";

import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit/logger";
import { revalidatePath } from "next/cache";
import { normalizePhoneToE164, maskPhone } from "@/lib/phone/normalize";
import { sendSmsNotification } from "@/lib/services/notification-hub.client";
import type { ActionResult } from "@/lib/validations/contribution";
import type { Contribution, Member } from "@/types/database.types";

// ============================================================
// Types
// ============================================================

export interface PendingContribution extends Omit<Contribution, "member_id"> {
    member_id: string;
    member_name: string; // Joined from Members table
}

// ============================================================
// Allowed roles for validation actions (RBAC)
// ============================================================
const VALIDATION_ROLES = ["TREASURER", "TRESORIER_ADJOINT", "PRESIDENT"];

function formatAmountCfa(amount: number): string {
    return `${new Intl.NumberFormat("fr-FR").format(amount)} CFA`;
}

async function notifyMemberPaymentOutcome(params: {
    contributionId: string;
    memberId: string;
    amount: number;
    action: "APPROVE" | "REJECT";
    reason?: string;
}): Promise<void> {
    const supabase = createServerSupabaseClient();
    const { data: member, error } = await supabase
        .from("Members")
        .select("phone, first_name")
        .eq("id", params.memberId)
        .maybeSingle<Pick<Member, "phone" | "first_name">>();

    if (error || !member?.phone) {
        console.warn(
            `[validatePayment] Skip SMS: no phone for member=${params.memberId}`,
            error?.message
        );
        return;
    }

    const e164 = normalizePhoneToE164(member.phone);
    if (!e164) {
        console.warn(
            `[validatePayment] Skip SMS: invalid phone for member=${params.memberId}`
        );
        return;
    }

    const amountLabel = formatAmountCfa(params.amount);
    const body =
        params.action === "APPROVE"
            ? `Amicale S2A: votre paiement de ${amountLabel} a ete valide.`
            : `Amicale S2A: votre declaration de ${amountLabel} a ete rejetee.${
                  params.reason ? ` Motif: ${params.reason.trim()}` : ""
              }`;

    try {
        await sendSmsNotification(
            e164,
            body,
            `s2a-validation-${params.contributionId}-${params.action}-${randomUUID()}`
        );
    } catch (err) {
        console.error(
            `[validatePayment] SMS failed for ${maskPhone(e164)} contribution=${params.contributionId}:`,
            err instanceof Error ? err.message : err
        );
    }
}

// ============================================================
// getPendingContributions — Server-side data fetch
// ============================================================

/**
 * Fetches all PENDING contributions joined with member first/last names.
 * Ordered by created_at desc (most recent first).
 */
export async function getPendingContributions(): Promise<
    ActionResult<PendingContribution[]>
> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: "UNAUTHORIZED: Not authenticated" };
    }
    if (!VALIDATION_ROLES.includes(session.user.role)) {
        return { error: "UNAUTHORIZED: Insufficient permissions" };
    }

    const supabase = createServerSupabaseClient();

    // Fetch pending contributions
    const { data: contributions, error: contribError } = await supabase
        .from("Contributions")
        .select("*")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .returns<Contribution[]>();

    if (contribError) {
        console.error("[getPendingContributions] Error:", contribError);
        return { error: `Failed to load pending contributions: ${contribError.message}` };
    }

    if (!contributions || contributions.length === 0) {
        return { data: [] };
    }

    // Collect unique member IDs to batch-fetch names
    const memberIds = [...new Set((contributions as Contribution[]).map((c) => c.member_id))];

    const { data: members, error: membersError } = await supabase
        .from("Members")
        .select("id, first_name, last_name")
        .in("id", memberIds)
        .returns<Pick<Member, "id" | "first_name" | "last_name">[]>();

    if (membersError) {
        console.error("[getPendingContributions] Members error:", membersError);
        return { error: `Failed to load member names: ${membersError.message}` };
    }

    // Build a lookup map: member_id → full name
    const memberMap = new Map<string, string>(
        (members ?? []).map((m) => [
            m.id,
            `${m.first_name} ${m.last_name}`,
        ])
    );

    // Enrich contributions with member_name
    const enriched: PendingContribution[] = (contributions ?? []).map((c) => ({
        ...c,
        member_name: memberMap.get(c.member_id) ?? "Membre inconnu",
    }));

    return { data: enriched };
}

// ============================================================
// validatePayment — Approve or Reject a pending contribution
// ============================================================

/**
 * Validates (approves or rejects) a pending contribution.
 * RBAC: TREASURER, TRESORIER_ADJOINT, PRESIDENT only.
 *
 * On APPROVE: status → VALIDATED, validator_id set, validated_at set.
 * On REJECT: status → REJECTED, rejection reason stored in audit log metadata.
 * Audit trail written for both outcomes.
 * SMS notification via Notification Hub (Brevo) — failures are non-blocking.
 * Revalidates /admin/validation, /admin/members, /dashboard.
 */
export async function validatePayment(
    contributionId: string,
    action: "APPROVE" | "REJECT",
    reason?: string
): Promise<ActionResult<{ contributionId: string; status: string }>> {
    // ── 1. Auth ────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: "UNAUTHORIZED: Not authenticated" };
    }
    if (!VALIDATION_ROLES.includes(session.user.role)) {
        return { error: "UNAUTHORIZED: Insufficient permissions (requires Treasurer or President role)" };
    }
    const actor_id = session.user.id as string;

    // ── 2. Input validation ───────────────────────────────────
    if (!contributionId) {
        return { error: "Validation failed: contributionId is required" };
    }
    if (action === "REJECT" && (!reason || reason.trim() === "")) {
        return {
            error: "Validation failed",
            fieldErrors: { reason: ["Un motif de rejet est obligatoire"] },
        };
    }

    const newStatus = action === "APPROVE" ? "VALIDATED" : "REJECTED";

    const supabase = createServerSupabaseClient();

    // Load pending contribution (for SMS + safety)
    const { data: contribution, error: loadError } = await supabase
        .from("Contributions")
        .select("id, member_id, amount, status")
        .eq("id", contributionId)
        .eq("status", "PENDING")
        .maybeSingle<Pick<Contribution, "id" | "member_id" | "amount" | "status">>();

    if (loadError) {
        console.error("[validatePayment] Load error:", loadError);
        return { error: `Failed to load contribution: ${loadError.message}` };
    }
    if (!contribution) {
        return { error: "Contribution introuvable ou déjà traitée" };
    }

    const { error: updateError } = await supabase
        .from("Contributions")
        .update({
            status: newStatus,
            validator_id: actor_id,
            validated_at: new Date().toISOString(),
        })
        .eq("id", contributionId)
        .eq("status", "PENDING"); // Safety: only update if still PENDING

    if (updateError) {
        console.error("[validatePayment] DB update error:", updateError);
        return { error: `Failed to update contribution: ${updateError.message}` };
    }

    // ── 4. Audit log ──────────────────────────────────────────
    await logAudit({
        actor_id,
        action_type: "VALIDATE_PAYMENT",
        metadata: {
            contribution_id: contributionId,
            old_value: { status: "PENDING" },
            new_value: {
                status: newStatus,
                ...(action === "REJECT" && reason ? { rejection_reason: reason.trim() } : {}),
            },
        },
    });

    // ── 5. SMS via Notification Hub (non-blocking) ────────────
    await notifyMemberPaymentOutcome({
        contributionId,
        memberId: contribution.member_id,
        amount: contribution.amount,
        action,
        reason,
    });

    // ── 6. Revalidate ─────────────────────────────────────────
    revalidatePath("/admin/validation");
    revalidatePath("/admin/members");
    revalidatePath("/dashboard");

    return { data: { contributionId, status: newStatus } };
}
