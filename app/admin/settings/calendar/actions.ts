"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit/logger";
import { revalidatePath } from "next/cache";
import type { BlackoutMonth, MemberRole } from "@/types/database.types";
import { blackoutMonthSchema, type BlackoutMonthPayload } from "./schema";

export interface ActionResult<T = void> {
    data?: T;
    error?: string;
    fieldErrors?: Record<string, string[]>;
}

export async function toggleBlackoutMonth(
    year: number,
    month: number,
    isActive: boolean,
    reason?: string
): Promise<ActionResult<BlackoutMonth>> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "UNAUTHORIZED: Not authenticated" };

    const role = session.user.role as MemberRole;
    if (role !== "PRESIDENT") return { error: "UNAUTHORIZED: Only President can manage calendar settings" };

    const parsed = blackoutMonthSchema.safeParse({ year, month, isActive, reason });
    if (!parsed.success) {
        return { error: "Validation failed" };
    }

    const supabase = createServerSupabaseClient();

    // Fetch old state for audit log (AC 4: old_value + new_value required)
    const { data: existingRecord } = await supabase.from("BlackoutMonths")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

    const payload = { year, month, is_active: isActive, reason: reason ?? "" };

    const { data: upserted, error } = await supabase.from("BlackoutMonths")
        .upsert(payload, { onConflict: 'unique_blackout_month_year' })
        .select()
        .single();

    if (error || !upserted) {
        return { error: `Failed to update calendar: ${error?.message}` };
    }

    await logAudit({
        actor_id: session.user.id,
        action_type: "TOGGLE_BLACKOUT_MONTH",
        metadata: {
            old_value: (existingRecord ?? null) as Record<string, unknown> | null,
            new_value: upserted as Record<string, unknown>,
        },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin/members");
    revalidatePath("/admin/settings/calendar");

    return { data: upserted as BlackoutMonth };
}

export async function getBlackoutMonthsByYear(
    year: number
): Promise<ActionResult<BlackoutMonth[]>> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "UNAUTHORIZED: Not authenticated" };

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from("BlackoutMonths")
        .select("*")
        .eq("year", year)
        .order("month", { ascending: true });

    if (error) {
        return { error: `Failed to fetch calendar: ${error.message}` };
    }

    return { data: (data as BlackoutMonth[]) ?? [] };
}
