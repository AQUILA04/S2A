"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit/logger";
import type { MemberRole, PaymentChannel, PaymentChannelRow } from "@/types/database.types";
import { z } from "zod";

// ============================================================
// Types
// ============================================================

import {
    createPaymentChannelSchema,
    updatePaymentChannelSchema,
    paymentChannelIdSchema,
} from "./schema";

export interface ActionResult<T = void> {
    data?: T;
    error?: string;
    fieldErrors?: Record<string, string[]>;
}

// ============================================================
// RBAC — Payment channels writable by TREASURER, TRESORIER_ADJOINT, PRESIDENT
// ============================================================

const PAYMENT_WRITE_ROLES: MemberRole[] = ["TREASURER", "TRESORIER_ADJOINT", "PRESIDENT"];

async function requirePaymentWriteAccess(): Promise<{ id: string; role: MemberRole }> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("UNAUTHORIZED: Not authenticated");
    }
    const role = session.user.role as MemberRole;
    if (!PAYMENT_WRITE_ROLES.includes(role)) {
        throw new Error("UNAUTHORIZED: Only Treasurer, Deputy Treasurer, or President can manage payment channels");
    }
    return { id: session.user.id as string, role };
}

async function requirePaymentReadAccess(): Promise<{ id: string; role: MemberRole }> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("UNAUTHORIZED: Not authenticated");
    }
    return { id: session.user.id as string, role: session.user.role as MemberRole };
}

// ============================================================
// getPaymentChannels — fetch all (or only active)
// ============================================================

export async function getPaymentChannels(
    activeOnly = false
): Promise<ActionResult<PaymentChannelRow[]>> {
    try {
        await requirePaymentReadAccess();
    } catch (e) {
        return { error: (e as Error).message };
    }

    const supabase = createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from("PaymentChannels") as any).select("*").order("created_at", { ascending: true });
    if (activeOnly) {
        query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
        return { error: `Failed to fetch payment channels: ${error.message}` };
    }

    return { data: (data as PaymentChannelRow[]) ?? [] };
}

// ============================================================
// createPaymentChannel
// ============================================================

export async function createPaymentChannel(
    rawData: unknown
): Promise<ActionResult<PaymentChannelRow>> {
    let actor: { id: string; role: MemberRole };
    try {
        actor = await requirePaymentWriteAccess();
    } catch (e) {
        return { error: (e as Error).message };
    }

    const parsed = createPaymentChannelSchema.safeParse(rawData);
    if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        parsed.error.errors.forEach((err) => {
            const field = err.path.join(".");
            if (!fieldErrors[field]) fieldErrors[field] = [];
            fieldErrors[field].push(err.message);
        });
        return { error: "Validation failed", fieldErrors };
    }

    const supabase = createServerSupabaseClient();

    const insertPayload = {
        ...parsed.data,
        updated_by: actor.id,
        is_active: true,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error: insertError } = await (supabase.from("PaymentChannels") as any)
        .insert(insertPayload)
        .select()
        .single();

    if (insertError) {
        return { error: `Failed to create payment channel: ${insertError.message}` };
    }

    await logAudit({
        actor_id: actor.id,
        action_type: "CREATE_PAYMENT_CHANNEL",
        metadata: {
            new_value: created as Record<string, unknown>,
        },
    });

    return { data: created as PaymentChannelRow };
}

// ============================================================
// updatePaymentChannel — update fields or toggle is_active
// ============================================================

export async function updatePaymentChannel(
    id: string,
    rawData: unknown
): Promise<ActionResult<PaymentChannelRow>> {
    let actor: { id: string; role: MemberRole };
    try {
        actor = await requirePaymentWriteAccess();
    } catch (e) {
        return { error: (e as Error).message };
    }

    if (!id) return { error: "Payment channel ID is required" };
    const idParsed = paymentChannelIdSchema.safeParse(id);
    if (!idParsed.success) return { error: idParsed.error.errors[0].message };

    const parsed = updatePaymentChannelSchema.safeParse(rawData);
    if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        parsed.error.errors.forEach((err) => {
            const field = err.path.join(".");
            if (!fieldErrors[field]) fieldErrors[field] = [];
            fieldErrors[field].push(err.message);
        });
        return { error: "Validation failed", fieldErrors };
    }

    const supabase = createServerSupabaseClient();

    // Fetch old state for audit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: oldChannel, error: fetchError } = await (supabase.from("PaymentChannels") as any)
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !oldChannel) {
        return { error: `Payment channel not found: ${fetchError?.message ?? "unknown"}` };
    }

    const updatePayload = {
        ...parsed.data,
        updated_by: actor.id,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabase.from("PaymentChannels") as any)
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

    if (updateError) {
        return { error: `Failed to update payment channel: ${updateError.message}` };
    }

    await logAudit({
        actor_id: actor.id,
        action_type: "UPDATE_PAYMENT_CHANNEL",
        metadata: {
            old_value: oldChannel as Record<string, unknown>,
            new_value: updated as Record<string, unknown>,
        },
    });

    return { data: updated as PaymentChannelRow };
}

// ============================================================
// deletePaymentChannel — soft delete (sets is_active = false)
//   Hard delete is also provided as a separate action but
//   is_active toggle is the preferred approach.
// ============================================================

export async function deletePaymentChannel(
    id: string
): Promise<ActionResult> {
    let actor: { id: string; role: MemberRole };
    try {
        actor = await requirePaymentWriteAccess();
    } catch (e) {
        return { error: (e as Error).message };
    }

    if (!id) return { error: "Payment channel ID is required" };
    const idParsed = paymentChannelIdSchema.safeParse(id);
    if (!idParsed.success) return { error: idParsed.error.errors[0].message };

    const supabase = createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: oldChannel, error: fetchError } = await (supabase.from("PaymentChannels") as any)
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !oldChannel) {
        return { error: `Payment channel not found: ${fetchError?.message ?? "unknown"}` };
    }

    // Perform a soft delete as requested by architecture
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase.from("PaymentChannels") as any)
        .update({ is_active: false, updated_by: actor.id })
        .eq("id", id);

    if (deleteError) {
        return { error: `Failed to delete payment channel: ${deleteError.message}` };
    }

    await logAudit({
        actor_id: actor.id,
        action_type: "DELETE_PAYMENT_CHANNEL",
        metadata: {
            old_value: oldChannel as Record<string, unknown>,
            new_value: { is_active: false },
        },
    });

    return {};
}

// ============================================================
// togglePaymentChannel — convenience wrapper for is_active
// ============================================================

export async function togglePaymentChannel(
    id: string,
    is_active: boolean
): Promise<ActionResult<PaymentChannelRow>> {
    return updatePaymentChannel(id, { is_active });
}
