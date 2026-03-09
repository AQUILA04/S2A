"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { contributionSchema, type ActionResult } from "@/lib/validations/contribution";
import type { Contribution } from "@/types/database.types";

export async function createContribution(
    rawData: unknown
): Promise<ActionResult<Contribution>> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: "UNAUTHORIZED: Not authenticated" };
    }
    const memberId = session.user.id as string;

    const parsed = contributionSchema.safeParse(rawData);
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
    const supabase = createServerSupabaseClient();

    // Check for duplicate reference_id if not CASH
    if (data.payment_channel !== "CASH" && data.reference_id) {
        const { data: existing, error: checkError } = await supabase
            .from("Contributions")
            .select("id")
            .eq("reference_id", data.reference_id)
            .single();

        if (checkError && checkError.code !== "PGRST116") { // PGRST116 means zero rows
            return { error: `Failed to check reference ID: ${checkError.message}` };
        }

        if (existing) {
            return {
                error: "Validation failed",
                fieldErrors: { reference_id: ["This reference ID has already been submitted"] },
            };
        }
    }

    const insertPayload = {
        member_id: memberId,
        amount: data.amount,
        month: data.month,
        year: data.year,
        payment_channel: data.payment_channel,
        reference_id: data.payment_channel === "CASH" ? null : data.reference_id,
        status: "PENDING" as const,
        validator_id: null,
        validated_at: null,
    };

    const { data: created, error: insertError } = await supabase
        .from("Contributions")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertPayload as any)
        .select()
        .single();

    if (insertError) {
        return { error: `Failed to create contribution: ${insertError.message}` };
    }

    return { data: created as Contribution };
}
