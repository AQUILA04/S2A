"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit/logger";
import { revalidatePath } from "next/cache";
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
 * Simulated email/SMS notification logged (mail-dev placeholder).
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

    // ── 5. Notification (mail-dev placeholder) ────────────────
    const notifMessage = `[mail-dev] Notification: Contribution ${contributionId} → ${newStatus}${action === "REJECT" ? ` | Reason: ${reason}` : ""}`;
    console.log(notifMessage);

    // ── 6. Revalidate ─────────────────────────────────────────
    revalidatePath("/admin/validation");
    revalidatePath("/admin/members");
    revalidatePath("/dashboard");

    return { data: { contributionId, status: newStatus } };
}
