"use server";

/**
 * Legacy Data Import — Server Action
 *
 * Processes pre-parsed contribution records:
 *  1. Resolves phone numbers → Member UUIDs
 *  2. Filters out duplicates (member_id + month + year)
 *  3. Batch-inserts validated records into Contributions
 *  4. Writes a direct AuditLog entry
 *
 * RBAC: Only TREASURER and PRESIDENT may execute this action.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { hasRequiredRole } from "@/lib/auth/helpers";
import type { ParsedContribution, FileParseResult } from "@/lib/import/parser";
import type { MemberRole, PaymentChannel } from "@/types/database.types";
import { logAudit } from "@/lib/audit/logger";

// ============================================================
// Constants
// ============================================================

const IMPORT_ALLOWED_ROLES: MemberRole[] = ["TREASURER", "PRESIDENT"];
/** Maximum rows per import to prevent edge-network timeouts while keeping atomicity */
const MAX_INSERT_LIMIT = 5000;

// ============================================================
// Types
// ============================================================

export interface ImportSummary {
    inserted: number;
    duplicatesSkipped: number;
    unmappedRows: number;
    /** Phone numbers that could not be matched to a member */
    unmappedPhones: string[];
    errors: string[];
}

// Result for the pre-import resolution step (used by the preview page)
export interface ResolvedPreview {
    /** Contributions that will be inserted (member resolved, not a duplicate) */
    toInsert: Array<ParsedContribution & { member_id: string }>;
    /** Rows whose phone number doesn't match any member */
    unmappedPhones: string[];
    /** Contributions that already exist in the DB */
    duplicates: Array<{ phone: string; month: number; year: number }>;
}

// Return type for both actions
export interface ActionResult<T> {
    data?: T;
    error?: string;
}

// ============================================================
// Helper — require TREASURER or PRESIDENT access
// ============================================================

async function requireImportAccess(): Promise<{ id: string; role: MemberRole }> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("UNAUTHORIZED: Non authentifié");
    }
    const role = session.user.role as MemberRole;
    if (!hasRequiredRole(role, IMPORT_ALLOWED_ROLES)) {
        throw new Error("UNAUTHORIZED: Accès refusé. Réservé au Trésorier ou au Président.");
    }
    return { id: session.user.id as string, role };
}

// ============================================================
// Action 1 — previewImport
//
// Resolves phones → member IDs and identifies duplicates.
// Called BEFORE the user confirms the import.
// ============================================================

export async function previewImport(
    parseResult: FileParseResult,
    defaultChannel: PaymentChannel
): Promise<ActionResult<ResolvedPreview>> {
    let actor: { id: string; role: MemberRole };
    try {
        actor = await requireImportAccess();
    } catch (e) {
        return { error: (e as Error).message };
    }

    void actor; // used later in confirmImport

    const supabase = createServerSupabaseClient();

    // Gather all phone numbers from valid rows
    const validContributions = parseResult.rows
        .filter((r) => r.isValid)
        .flatMap((r) => r.contributions);

    if (validContributions.length === 0) {
        return {
            data: {
                toInsert: [],
                unmappedPhones: [],
                duplicates: [],
            },
        };
    }

    const uniquePhones = [...new Set(validContributions.map((c) => c.phone))];

    // Fetch matching members by phone
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membersRaw, error: membersError } = await (supabase.from("Members") as any)
        .select("id, phone")
        .in("phone", uniquePhones);

    if (membersError) {
        return { error: `Erreur lors de la récupération des membres: ${membersError.message}` };
    }

    const members = (membersRaw ?? []) as { id: string; phone: string }[];
    const phoneToMemberId = new Map<string, string>(
        members.map((m) => [m.phone, m.id])
    );

    const unmappedPhones: string[] = uniquePhones.filter(
        (p) => !phoneToMemberId.has(p)
    );

    // Build resolved contributions (only for mapped members)
    const resolved: Array<ParsedContribution & { member_id: string }> = [];
    for (const contrib of validContributions) {
        const memberId = phoneToMemberId.get(contrib.phone);
        if (!memberId) continue;
        resolved.push({
            ...contrib,
            payment_channel: defaultChannel,
            member_id: memberId,
        });
    }

    if (resolved.length === 0) {
        return {
            data: {
                toInsert: [],
                unmappedPhones,
                duplicates: [],
            },
        };
    }

    // Check for existing duplicates: (member_id, month, year)
    // We query using an `or` filter over all resolved contributions
    // Build a unique key list
    const memberYearPairs = [
        ...new Set(resolved.map((c) => `${c.member_id}__${c.year}`)),
    ];

    const duplicateSet = new Set<string>();
    const duplicatesFound: Array<{ phone: string; month: number; year: number }> = [];

    // Query existing contributions for the relevant (member_id, year) pairs
    for (const pair of memberYearPairs) {
        const [memberId, yearStr] = pair.split("__");
        const year = parseInt(yearStr, 10);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingRaw, error: dupError } = await (supabase.from("Contributions") as any)
            .select("member_id, month, year")
            .eq("member_id", memberId)
            .eq("year", year);

        if (dupError) {
            console.warn("[previewImport] Failed to check duplicates:", dupError.message);
            continue;
        }

        const existing = (existingRaw ?? []) as { member_id: string; month: number; year: number }[];
        for (const row of existing) {
            duplicateSet.add(`${row.member_id}__${row.month}__${row.year}`);
        }
    }

    // Filter out duplicates from toInsert
    const toInsert: Array<ParsedContribution & { member_id: string }> = [];
    for (const contrib of resolved) {
        const key = `${contrib.member_id}__${contrib.month}__${contrib.year}`;
        if (duplicateSet.has(key)) {
            // Find the matching phone for the report
            const phone = contrib.phone;
            duplicatesFound.push({ phone, month: contrib.month, year: contrib.year });
        } else {
            toInsert.push(contrib);
            // Add to set to prevent double-insertion within the same file
            duplicateSet.add(key);
        }
    }

    return {
        data: {
            toInsert,
            unmappedPhones,
            duplicates: duplicatesFound,
        },
    };
}

// ============================================================
// Action 2 — confirmImport
//
// Inserts the pre-resolved contributions into the DB in batches.
// Writes a single AuditLog entry on success.
// ============================================================

export async function confirmImport(
    toInsert: Array<ParsedContribution & { member_id: string }>
): Promise<ActionResult<ImportSummary>> {
    let actor: { id: string; role: MemberRole };
    try {
        actor = await requireImportAccess();
    } catch (e) {
        return { error: (e as Error).message };
    }

    if (!toInsert || toInsert.length === 0) {
        return {
            data: {
                inserted: 0,
                duplicatesSkipped: 0,
                unmappedRows: 0,
                unmappedPhones: [],
                errors: [],
            },
        };
    }

    const supabase = createServerSupabaseClient();

    // --- Final duplicate guard (belt-and-suspenders before DB insert) ---
    // Get all (member_id, month, year) combos that already exist, restricted by years in payload
    const memberIds = [...new Set(toInsert.map((c) => c.member_id))];
    const years = [...new Set(toInsert.map((c) => c.year))];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingContribsRaw, error: existingError } = await (supabase.from("Contributions") as any)
        .select("member_id, month, year")
        .in("member_id", memberIds)
        .in("year", years);

    if (existingError) {
        return { error: `Impossible de vérifier les doublons: ${existingError.message}` };
    }

    const existingContribs = (existingContribsRaw ?? []) as { member_id: string; month: number; year: number }[];
    const existingKeys = new Set(
        existingContribs.map(
            (c) => `${c.member_id}__${c.month}__${c.year}`
        )
    );

    let duplicatesSkipped = 0;
    const seenKeys = new Set<string>();
    const filtered: Array<{
        member_id: string;
        amount: number;
        month: number;
        year: number;
        payment_channel: PaymentChannel;
        status: "VALIDATED" | "PENDING" | "REJECTED";
        validator_id: string;
        validated_at: string;
        reference_id: null;
    }> = [];

    for (const contrib of toInsert) {
        const key = `${contrib.member_id}__${contrib.month}__${contrib.year}`;
        if (existingKeys.has(key) || seenKeys.has(key)) {
            duplicatesSkipped++;
            continue;
        }
        seenKeys.add(key);
        filtered.push({
            member_id: contrib.member_id,
            amount: contrib.amount,
            month: contrib.month,
            year: contrib.year,
            payment_channel: contrib.payment_channel,
            status: "VALIDATED" as const,
            validator_id: actor.id,
            validated_at: new Date().toISOString(),
            reference_id: null,
        });
    }

    if (filtered.length === 0) {
        return {
            data: {
                inserted: 0,
                duplicatesSkipped,
                unmappedRows: 0,
                unmappedPhones: [],
                errors: ["Aucune contribution nouvelle à importer (toutes en doublon)."],
            },
        };
    }

    if (filtered.length > MAX_INSERT_LIMIT) {
        return {
            data: {
                inserted: 0,
                duplicatesSkipped,
                unmappedRows: 0,
                unmappedPhones: [],
                errors: [`Fichier trop volumineux. Maximum ${MAX_INSERT_LIMIT} contributions par import. Veuillez diviser votre fichier.`],
            },
        };
    }

    // Single array insert is treated transactionally by PostgREST
    const errors: string[] = [];
    let inserted = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedData, error: insertError } = await (supabase.from("Contributions") as any)
        .insert(filtered)
        .select("id");

    if (insertError) {
        errors.push(`Erreur critique lors de l'insertion (import annulé) : ${insertError.message}`);
    } else {
        inserted = (insertedData as { id: string }[]).length;
    }

    await logAudit({
        actor_id: actor.id,
        action_type: "LEGACY_IMPORT",
        metadata: {
            inserted,
            duplicatesSkipped,
            errors: errors.length > 0 ? errors : undefined,
            importedAt: new Date().toISOString(),
        },
    });

    return {
        data: {
            inserted,
            duplicatesSkipped,
            unmappedRows: 0,
            unmappedPhones: [],
            errors,
        },
    };
}
