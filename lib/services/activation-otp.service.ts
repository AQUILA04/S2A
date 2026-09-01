/**
 * S2A account activation OTP — delegates to Notification Hub.
 */

import { randomUUID } from "crypto";
import { normalizePhoneToE164, maskPhone } from "@/lib/phone/normalize";
import {
    sendOtp,
    verifyOtp,
    NotificationHubError,
    type OtpVerifyReason,
    type OtpSendResponse,
} from "@/lib/services/notification-hub.client";

export interface ActivationOtpResult {
    ok: boolean;
    error?: string;
    sendResponse?: OtpSendResponse;
}

const REASON_MESSAGES: Record<OtpVerifyReason, string> = {
    VALID: "Code vérifié avec succès.",
    INVALID: "Code incorrect. Veuillez réessayer.",
    EXPIRED: "Code expiré. Demandez un nouveau code.",
    MAX_ATTEMPTS: "Trop de tentatives. Demandez un nouveau code ou réessayez plus tard.",
};

export function otpVerifyReasonMessage(reason: OtpVerifyReason): string {
    return REASON_MESSAGES[reason] ?? "Vérification impossible.";
}

function mapHubError(error: unknown): string {
    if (error instanceof NotificationHubError) {
        if (error.code === "OTP_RESEND_COOLDOWN") {
            return "Veuillez patienter avant de renvoyer un code.";
        }
        if (error.code === "OTP_NOT_CONFIGURED") {
            return "Le service de vérification est temporairement indisponible.";
        }
        if (error.status === 401) {
            return "Erreur d'authentification du service de notification.";
        }
    }
    return "Impossible d'envoyer le code de vérification. Réessayez plus tard.";
}

/**
 * Send activation OTP after member creation.
 * Idempotency key is scoped to this send operation (memberId + timestamp bucket for creation).
 */
export async function sendActivationOtp(
    phone: string,
    memberId: string,
    idempotencyKey?: string
): Promise<ActivationOtpResult> {
    const e164 = normalizePhoneToE164(phone);
    if (!e164) {
        return { ok: false, error: "Numéro de téléphone invalide (format Togo attendu)." };
    }

    const key = idempotencyKey ?? `s2a-activation-${memberId}-${randomUUID()}`;

    try {
        const sendResponse = await sendOtp(e164, key);
        return { ok: true, sendResponse };
    } catch (error) {
        console.error(
            `[activation-otp] send failed for member=${memberId} phone=${maskPhone(e164)}:`,
            error instanceof Error ? error.message : error
        );
        return { ok: false, error: mapHubError(error) };
    }
}

/**
 * Verify OTP code for account activation.
 */
export async function verifyActivationOtp(
    phone: string,
    code: string
): Promise<{ valid: boolean; reason: OtpVerifyReason; message: string }> {
    const e164 = normalizePhoneToE164(phone);
    if (!e164) {
        return {
            valid: false,
            reason: "INVALID",
            message: "Numéro de téléphone invalide.",
        };
    }

    try {
        const result = await verifyOtp(e164, code);
        return {
            valid: result.valid,
            reason: result.reason,
            message: otpVerifyReasonMessage(result.reason),
        };
    } catch (error) {
        console.error(
            `[activation-otp] verify failed for phone=${maskPhone(e164)}:`,
            error instanceof Error ? error.message : error
        );
        return {
            valid: false,
            reason: "INVALID",
            message: mapHubError(error),
        };
    }
}

/** Exported for phone normalization on member insert. */
export { normalizePhoneToE164 };
