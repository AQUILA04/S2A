"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { hashPassword } from "@/lib/auth/helpers";
import type {
    Member,
    MemberRole,
    Database,
} from "@/types/database.types";

// ============================================================
// Constants
// ============================================================

const MEMBERS_WRITE_ROLES: MemberRole[] = ["SG", "SG_ADJOINT", "PRESIDENT"];
const PAGE_SIZE = 20;

// ============================================================
// Zod Schemas
// ============================================================

export const createMemberSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().min(1, "Phone number is required"),
    join_date: z.string().min(1, "Join date is required"),
    monthly_fee: z
        .number({ invalid_type_error: "Monthly fee must be a number" })
        .min(0, "Monthly fee must be ≥ 0"),
    role: z.enum(["MEMBER", "PRESIDENT", "SG", "SG_ADJOINT", "TREASURER", "TRESORIER_ADJOINT"]),
    password: z.string().min(8, "Initial password must be at least 8 characters"),
});

export const updateMemberSchema = z.object({
    first_name: z.string().min(1, "First name is required").optional(),
    last_name: z.string().min(1, "Last name is required").optional(),
    phone: z.string().min(1, "Phone number is required").optional(),
    monthly_fee: z
        .number({ invalid_type_error: "Monthly fee must be a number" })
        .min(0, "Monthly fee must be ≥ 0")
        .optional(),
    role: z
        .enum(["MEMBER", "PRESIDENT", "SG", "SG_ADJOINT", "TREASURER", "TRESORIER_ADJOINT"])
        .optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    account_status: z.enum(["PENDING_ACTIVATION", "ACTIVE"]).optional(),
});

// ============================================================
// Types
// ============================================================

export interface ActionResult<T> {
    data?: T;
    error?: string;
    fieldErrors?: Record<string, string[]>;
}

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
    page: number = 1
): Promise<ActionResult<{ members: Member[]; totalCount: number; totalPages: number }>> {
    await requireReadAccess();

    const supabase = createServerSupabaseClient();
    const offset = (page - 1) * PAGE_SIZE;

    const { data, error, count } = await supabase
        .from("Members")
        .select("*", { count: "exact" })
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
        return { error: `Failed to fetch members: ${error.message}` };
    }

    const totalCount = count ?? 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

    const { password, ...memberData } = parsed.data;

    // 3. Hash the initial password
    const password_hash = await hashPassword(password);

    const supabase = createServerSupabaseClient();

    // 4. Insert member
    const insertPayload = {
        ...memberData,
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

    // 5. Write AuditLog — CREATE_MEMBER
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: auditError } = await (supabase.from("AuditLogs") as any).insert({
        actor_id: actor.id,
        action_type: "CREATE_MEMBER",
        metadata: {
            new_value: createdMember as Record<string, unknown>,
        },
    });

    if (auditError) {
        // Non-fatal — log but do not roll back the member creation
        console.warn("[createMember] Failed to write AuditLog:", auditError.message);
    }

    return { data: createdMember as Member };
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

    // 5. Write AuditLog — UPDATE_MEMBER
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: auditError } = await (supabase.from("AuditLogs") as any).insert({
        actor_id: actor.id,
        action_type: "UPDATE_MEMBER",
        metadata: {
            old_value: oldMember as Record<string, unknown>,
            new_value: updatedMember as Record<string, unknown>,
        },
    });

    if (auditError) {
        console.warn("[updateMember] Failed to write AuditLog:", auditError.message);
    }

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
