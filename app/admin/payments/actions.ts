"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit/logger";
import { multiMonthContributionSchema, type ActionResult } from "@/lib/validations/contribution";
import { revalidatePath } from "next/cache";

export async function recordDirectPayment(
    rawData: unknown
): Promise<ActionResult<{ count: number }>> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: "UNAUTHORIZED: Not authenticated" };
    }
    const role = session.user.role;
    if (role !== "PRESIDENT" && role !== "TREASURER" && role !== "TRESORIER_ADJOINT") {
        return { error: "UNAUTHORIZED: Insufficient permissions to record payments directly (requires Treasurer or President rights)" };
    }
    const actor_id = session.user.id as string;

    const parsed = multiMonthContributionSchema.safeParse(rawData);
    if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        parsed.error.errors.forEach((err) => {
            const field = err.path.join(".");
            if (!fieldErrors[field]) fieldErrors[field] = [];
            fieldErrors[field].push(err.message);
        });
        return { error: "Validation failed", fieldErrors };
    }

    const data = parsed.data;
    const { member_id, amount, months, year, payment_channel, reference_id } = data;

    const supabase = createServerSupabaseClient();

    // Verify digital reference ID uniqueness
    if (payment_channel !== "CASH" && reference_id) {
        const { count, error: checkError } = await supabase
            .from("Contributions")
            .select("*", { count: 'exact', head: true })
            .eq("reference_id", reference_id);

        if (checkError) {
            return { error: `Failed to verify reference ID: ${checkError.message}` };
        }
        if (count && count > 0) {
            return {
                error: "Validation failed",
                fieldErrors: { reference_id: ["This reference ID has already been used"] }
            };
        }
    }

    // Split amount
    const amountPerMonth = Math.floor(amount / months.length);
    const remainder = amount % months.length;

    const contributionsToInsert = months.map((month, index) => {
        // Add the remainder to the first month
        const adjustedAmount = index === 0 ? amountPerMonth + remainder : amountPerMonth;

        return {
            member_id,
            amount: adjustedAmount,
            month,
            year,
            payment_channel,
            reference_id: reference_id || null, // Ensure empty string becomes null for CASH uniqueness skip
            status: "VALIDATED" as const,
            validator_id: actor_id,
            validated_at: new Date().toISOString()
        };
    });

    const { data: insertedRecords, error: insertError } = await supabase
        .from("Contributions")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(contributionsToInsert as any)
        .select();

    if (insertError) {
        console.error("Insert error:", insertError);
        return { error: `Failed to record contributions: ${insertError.message}. This may be because a contribution for one of these months already exists.` };
    }

    await logAudit({
        actor_id,
        action_type: "RECORD_DIRECT_PAYMENT",
        metadata: {
            target_member_id: member_id,
            total_amount: amount,
            channel: payment_channel,
            months_covered: months,
            year: year
        }
    });

    revalidatePath('/admin/members');

    return { data: { count: months.length } };
}
