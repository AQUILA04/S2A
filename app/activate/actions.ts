"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { hashPassword } from "@/lib/auth/helpers";
import {
    ACTIVATION_COOKIE,
    activationCookieOptions,
    createActivationTicket,
    verifyActivationTicket,
} from "@/lib/auth/activation-ticket";
import {
    normalizePhoneToE164,
    sendActivationOtp,
    verifyActivationOtp,
} from "@/lib/services/activation-otp.service";
import type { ActionResult } from "@/app/admin/members/types";

const otpStepSchema = z.object({
    phone: z.string().min(1, "Le numéro de téléphone est requis"),
    code: z.string().min(4, "Le code de vérification est requis"),
});

const passwordStepSchema = z
    .object({
        password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
        confirmPassword: z.string().min(1, "Confirmez votre mot de passe"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Les mots de passe ne correspondent pas",
        path: ["confirmPassword"],
    });

const phoneSchema = z.object({
    phone: z.string().min(1, "Le numéro de téléphone est requis"),
});

function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};
    error.errors.forEach((err) => {
        const field = err.path.join(".");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(err.message);
    });
    return fieldErrors;
}

async function findPendingMemberByPhone(e164: string) {
    const supabase = createServerSupabaseClient();
    const { data: members, error } = await supabase
        .from("Members")
        .select("id, phone, account_status")
        .eq("account_status", "PENDING_ACTIVATION");

    if (error || !members) {
        return { error: "Impossible de vérifier le compte." as const, member: null };
    }

    const member = (members as { phone: string; id: string }[]).find(
        (m: { phone: string }) => normalizePhoneToE164(m.phone) === e164
    );

    if (!member) {
        return {
            error: "Aucun compte en attente d'activation pour ce numéro." as const,
            member: null,
        };
    }

    return { error: null, member };
}

export async function resendActivationOtp(
    rawData: unknown
): Promise<ActionResult<{ sent: boolean }>> {
    const parsed = phoneSchema.safeParse(rawData);
    if (!parsed.success) {
        return { error: "Validation failed", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const e164 = normalizePhoneToE164(parsed.data.phone);
    if (!e164) {
        return {
            error: "Validation failed",
            fieldErrors: { phone: ["Numéro invalide (format Togo attendu, ex. +22890123456)"] },
        };
    }

    const { error, member } = await findPendingMemberByPhone(e164);
    if (error || !member) {
        return { error: error ?? "Compte introuvable." };
    }

    const result = await sendActivationOtp(parsed.data.phone, member.id);
    if (!result.ok) {
        return { error: result.error ?? "Échec de l'envoi du code." };
    }

    return { data: { sent: true } };
}

/** Step 1: verify OTP and set signed activation cookie (does not activate the account). */
export async function verifyActivationOtpOnly(
    rawData: unknown
): Promise<ActionResult<{ verified: boolean }>> {
    const parsed = otpStepSchema.safeParse(rawData);
    if (!parsed.success) {
        return { error: "Validation failed", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const e164 = normalizePhoneToE164(parsed.data.phone);
    if (!e164) {
        return {
            error: "Validation failed",
            fieldErrors: { phone: ["Numéro invalide (format Togo attendu)"] },
        };
    }

    const { error: lookupError, member } = await findPendingMemberByPhone(e164);
    if (lookupError || !member) {
        return { error: lookupError ?? "Compte introuvable." };
    }

    const verification = await verifyActivationOtp(parsed.data.phone, parsed.data.code);
    if (!verification.valid) {
        return {
            error: "Validation failed",
            fieldErrors: { code: [verification.message] },
        };
    }

    const ticket = createActivationTicket(member.id);
    const cookieStore = await cookies();
    cookieStore.set(ACTIVATION_COOKIE, ticket, activationCookieOptions);

    return { data: { verified: true } };
}

/** Step 2: set password using valid activation ticket cookie. */
export async function completeActivationWithPassword(
    rawData: unknown
): Promise<ActionResult<{ activated: boolean }>> {
    const parsed = passwordStepSchema.safeParse(rawData);
    if (!parsed.success) {
        return { error: "Validation failed", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const cookieStore = await cookies();
    const memberId = verifyActivationTicket(cookieStore.get(ACTIVATION_COOKIE)?.value);
    if (!memberId) {
        return {
            error: "Session d'activation expirée. Veuillez vérifier à nouveau votre code SMS.",
        };
    }

    const password_hash = await hashPassword(parsed.data.password);
    const supabase = createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from("Members") as any)
        .update({
            password_hash,
            account_status: "ACTIVE",
            must_change_password: false,
        })
        .eq("id", memberId)
        .eq("account_status", "PENDING_ACTIVATION");

    if (updateError) {
        return { error: `Activation échouée: ${updateError.message}` };
    }

    cookieStore.set(ACTIVATION_COOKIE, "", {
        ...activationCookieOptions,
        maxAge: 0,
    });

    return { data: { activated: true } };
}
