"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { hashPassword } from "@/lib/auth/helpers";
import type {
    Member,
    MemberRole,
} from "@/types/database.types";
import {
    createMemberSchema,
    updateMemberSchema,
    type ActionResult,
    type ValidatedMemberJson,
} from "./types";
import { logAudit } from "@/lib/audit/logger";
import { revalidatePath } from "next/cache";
import {
    normalizePhoneToE164,
    sendActivationOtp,
} from "@/lib/services/activation-otp.service";

// (schemas and ActionResult are imported from ./types — do NOT re-export from a 'use server' file)

// ============================================================
// Constants
// ============================================================

const MEMBERS_WRITE_ROLES: MemberRole[] = ["SG", "SG_ADJOINT", "PRESIDENT"];
const PAGE_SIZE = 20;

// ============================================================
// Helper — get session and verify role
// ============================================================

async function requireWriteAccess(): Promise<{ id: string; role: MemberRole }> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("UNAUTHORIZED: Not authenticated");
    }
    const role = session.user.role as MemberRole;
    if (!MEMBERS_WRITE_ROLES.includes(role)) {
        throw new Error("UNAUTHORIZED: Insufficient permissions to write Members");
    }
    return { id: session.user.id as string, role };
}

async function requireReadAccess(): Promise<{ id: string; role: MemberRole }> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("UNAUTHORIZED: Not authenticated");
    }
    return { id: session.user.id as string, role: session.user.role as MemberRole };
}

// ============================================================
// Task 1.1 — getMembers (paginated)
// ============================================================

export async function getMembers(
    page: number = 1,
    search?: string,
    filter?: string
): Promise<ActionResult<{ members: Member[]; totalCount: number; totalPages: number }>> {
    await requireReadAccess();

    const supabase = createServerSupabaseClient();
    const offset = (page - 1) * PAGE_SIZE;

    let query = supabase
        .from("Members")
        .select("*", { count: "exact" })
        .eq("role", "MEMBER");

    if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (filter === "active") {
        query = query.eq("status", "ACTIVE");
    } else if (filter === "inactive") {
        query = query.eq("status", "INACTIVE");
    }

    const { data, error, count } = await query
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
        return { error: `Failed to fetch members: ${error.message}` };
    }

    const totalCount = count ?? 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

    return {
        data: {
            members: (data as Member[]) ?? [],
            totalCount,
            totalPages,
        },
    };
}

// ============================================================
// Task 1.2 — createMember
// ============================================================

export async function createMember(
    rawData: unknown
): Promise<ActionResult<Member>> {
    // 1. Role guard
    let actor: { id: string; role: MemberRole };
    try {
        actor = await requireWriteAccess();
    } catch (e) {
        return { error: (e as Error).message };
    }

    // 2. Zod validation
    const parsed = createMemberSchema.safeParse(rawData);
    if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        parsed.error.errors.forEach((err) => {
            const field = err.path.join(".");
            if (!fieldErrors[field]) fieldErrors[field] = [];
            fieldErrors[field].push(err.message);
        });
        return { error: "Validation failed", fieldErrors };
    }

    const memberData = parsed.data;

    const e164Phone = normalizePhoneToE164(memberData.phone);
    if (!e164Phone) {
        return {
            error: "Validation failed",
            fieldErrors: {
                phone: ["Numéro invalide (format Togo attendu, ex. +22890123456)"],
            },
        };
    }

    // Placeholder hash until member completes OTP activation
    const password_hash = await hashPassword(crypto.randomUUID());

    const supabase = createServerSupabaseClient();

    // 4. Insert member
    const insertPayload = {
        ...memberData,
        phone: e164Phone,
        password_hash,
        status: "ACTIVE" as const,
        account_status: "PENDING_ACTIVATION" as const,
    };

    const { data: createdMember, error: insertError } = await supabase
        .from("Members")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertPayload as any)
        .select()
        .single();

    if (insertError) {
        // Resolve unique constraint violations into field-level messages
        if (insertError.code === "23505") {
            const detail = insertError.message ?? "";
            if (detail.toLowerCase().includes("email")) {
                return {
                    error: "Validation failed",
                    fieldErrors: { email: ["This email address is already in use"] },
                };
            }
            if (detail.toLowerCase().includes("phone")) {
                return {
                    error: "Validation failed",
                    fieldErrors: { phone: ["This phone number is already in use"] },
                };
            }
            return {
                error: "Validation failed",
                fieldErrors: { _form: ["A member with these details already exists"] },
            };
        }
        return { error: `Failed to create member: ${insertError.message}` };
    }

    await logAudit({
        actor_id: actor.id,
        action_type: "CREATE_MEMBER",
        metadata: {
            new_value: createdMember as Record<string, unknown>,
        },
    });

    const member = createdMember as Member;
    const otpResult = await sendActivationOtp(
        e164Phone,
        member.id,
        `s2a-activation-${member.id}`
    );
    if (!otpResult.ok) {
        console.warn(
            `[createMember] OTP send failed for member ${member.id}: ${otpResult.error}`
        );
    }

    return { data: member };
}

// ============================================================
// Task 1.3 — updateMember
// ============================================================

export async function updateMember(
    id: string,
    rawData: unknown
): Promise<ActionResult<Member>> {
    // 1. Role guard
    let actor: { id: string; role: MemberRole };
    try {
        actor = await requireWriteAccess();
    } catch (e) {
        return { error: (e as Error).message };
    }

    if (!id) {
        return { error: "Member ID is required" };
    }

    // 2. Zod validation
    const parsed = updateMemberSchema.safeParse(rawData);
    if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        parsed.error.errors.forEach((err) => {
            const field = err.path.join(".");
            if (!fieldErrors[field]) fieldErrors[field] = [];
            fieldErrors[field].push(err.message);
        });
        return { error: "Validation failed", fieldErrors };
    }

    const sanitizedData = parsed.data;
    const supabase = createServerSupabaseClient();

    // 3. Fetch old member state for AuditLog
    const { data: oldMember, error: fetchError } = await supabase
        .from("Members")
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !oldMember) {
        return { error: `Member not found: ${fetchError?.message ?? "unknown error"}` };
    }

    // 4. Perform update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedMember, error: updateError } = await (supabase.from("Members") as any)
        .update(sanitizedData)
        .eq("id", id)
        .select()
        .single();

    if (updateError) {
        return { error: `Failed to update member: ${updateError.message}` };
    }

    await logAudit({
        actor_id: actor.id,
        action_type: "UPDATE_MEMBER",
        metadata: {
            old_value: oldMember as Record<string, unknown>,
            new_value: updatedMember as Record<string, unknown>,
        },
    });

    return { data: updatedMember as Member };
}

// ============================================================
// Task 1.4 — getMemberById
// ============================================================

export async function getMemberById(
    id: string
): Promise<ActionResult<Member>> {
    await requireReadAccess();

    if (!id) {
        return { error: "Member ID is required" };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from("Members")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        return { error: `Member not found: ${error?.message ?? "unknown"}` };
    }

    return { data: data as Member };
}

// ============================================================
// Task 3 & 4 — bulkImportMembers
// ============================================================

export async function bulkImportMembers(
    payload: ValidatedMemberJson[]
): Promise<ActionResult<{ successCount: number; failureCount: number; failedRows: { row: number; errors: string[] }[]; otpFailureCount?: number }>> {
    let actor: { id: string; role: MemberRole };
    try {
        actor = await requireWriteAccess();
    } catch (e) {
        return { error: (e as Error).message };
    }

    if (!payload || payload.length === 0) {
        return { error: "Aucune donnée fournie" };
    }

    const supabase = createServerSupabaseClient();
    
    // Track total successes and failures across chunks
    let totalSuccessCount = 0;
    const totalFailedRows: { row: number; errors: string[] }[] = [];
    const insertedForOtp: { id: string; phone: string }[] = [];

    // Process in chunks of 50 to prevent 414 URI Too Long limits
    const CHUNK_SIZE = 50;
    for (let c = 0; c < payload.length; c += CHUNK_SIZE) {
        const chunk = payload.slice(c, c + CHUNK_SIZE);
        const chunkEmails = chunk.map(m => m.email).filter(Boolean);
        const chunkPhoneValues = [
            ...new Set(
                chunk.flatMap((m) => {
                    const e164 = normalizePhoneToE164(m.phone);
                    return e164 ? [m.phone, e164] : [m.phone];
                })
            ),
        ];

        // Use separate .in() queries — PostgREST-style .or(email.in.(a,b),...) breaks when
        // emails contain commas/dots because parseOrExpression formerly split on every comma.
        const [emailResult, phoneResult] = await Promise.all([
            chunkEmails.length > 0
                ? supabase.from("Members").select("email, phone").in("email", chunkEmails)
                : Promise.resolve({ data: [], error: null }),
            chunkPhoneValues.length > 0
                ? supabase.from("Members").select("email, phone").in("phone", chunkPhoneValues)
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (emailResult.error || phoneResult.error) {
            const msg = emailResult.error?.message ?? phoneResult.error?.message ?? "unknown";
            return { error: `Validation de duplicata échouée pour un lot: ${msg}` };
        }

        const existingRows = [
            ...((emailResult.data as { email: string; phone: string }[] | null) ?? []),
            ...((phoneResult.data as { email: string; phone: string }[] | null) ?? []),
        ];

        const existingEmails = new Set(existingRows.map((m) => m.email));
        const existingPhones = new Set(
            existingRows.map((m) => normalizePhoneToE164(m.phone) ?? m.phone)
        );

        const toInsert = [];

        for (let i = 0; i < chunk.length; i++) {
            const member = chunk[i];
            const rowNum = c + i + 2; 
            const errors = [];
            const e164Phone = normalizePhoneToE164(member.phone);
            
            if (existingEmails.has(member.email)) {
                errors.push("Email existe déjà");
            }
            if (e164Phone && existingPhones.has(e164Phone)) {
                errors.push("Téléphone existe déjà");
            }

            if (errors.length > 0) {
                totalFailedRows.push({ row: rowNum, errors });
            } else if (!e164Phone) {
                totalFailedRows.push({
                    row: rowNum,
                    errors: ["Numéro invalide (format Togo attendu)"],
                });
            } else {
                const uniquePasswordHash = await hashPassword(crypto.randomUUID());
                const { address, ...memberDbData } = member;

                toInsert.push({
                    ...memberDbData,
                    phone: e164Phone,
                    password_hash: uniquePasswordHash,
                    status: "ACTIVE",
                    account_status: "PENDING_ACTIVATION",
                });
            }
        }

        if (toInsert.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: insertedRows, error: insertError } = await (supabase.from("Members") as any)
                .insert(toInsert)
                .select("id, phone");

            if (insertError) {
                 return { error: `Échec d'insertion pour un lot: ${insertError.message}` };
            }

            totalSuccessCount += toInsert.length;
            if (insertedRows) {
                insertedForOtp.push(
                    ...(insertedRows as { id: string; phone: string }[])
                );
            }
        }
    }

    // Send activation OTPs after insert — do not block the HTTP response on SMS fan-out
    // (44 parallel hub calls can exceed the action timeout and hide success from the UI).
    if (insertedForOtp.length > 0) {
        void Promise.allSettled(
            insertedForOtp.map((row) =>
                sendActivationOtp(row.phone, row.id, `s2a-activation-${row.id}`)
            )
        ).then((otpResults) => {
            const failed = otpResults.filter(
                (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
            ).length;
            if (failed > 0) {
                console.warn(
                    `[bulkImportMembers] OTP send failed for ${failed}/${insertedForOtp.length} members`
                );
            }
        });
    }

    if (totalSuccessCount > 0) {
        await logAudit({
            actor_id: actor.id,
            action_type: "MASS_IMPORT_MEMBERS",
            metadata: {
                success_count: totalSuccessCount,
                failure_count: totalFailedRows.length,
            },
        });

        revalidatePath("/admin/members");
        
        console.log(`[log] MASS_IMPORT_MEMBERS: ${totalSuccessCount} succeeded, ${totalFailedRows.length} failed. Implemented by ${actor.id}`);
    }

    return {
        data: {
            successCount: totalSuccessCount,
            failureCount: totalFailedRows.length,
            failedRows: totalFailedRows,
        },
    };
}
