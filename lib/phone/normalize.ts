/**
 * Normalizes phone numbers to E.164 for Notification Hub OTP calls.
 * Primary target: Togo (+228).
 */

const TOGO_CARRIER_PREFIX =
    /^(90|91|92|93|70|71|99|98|97|96|79|78)\d{6}$/;

/** Strip spaces, dashes, dots, parentheses. */
function stripFormatting(raw: string): string {
    return raw.replace(/[\s\-().]/g, "");
}

/**
 * Normalize a phone string to E.164 (+228XXXXXXXX for Togo).
 * Returns null if the number cannot be normalized to a valid Togo mobile.
 */
export function normalizePhoneToE164(raw: string): string | null {
    if (!raw?.trim()) return null;

    let digits = stripFormatting(raw.trim());

    if (digits.startsWith("+")) {
        digits = digits.slice(1);
    }

    if (digits.startsWith("00")) {
        digits = digits.slice(2);
    }

    if (digits.startsWith("228")) {
        const national = digits.slice(3);
        if (!TOGO_CARRIER_PREFIX.test(national)) return null;
        return `+228${national}`;
    }

    if (digits.startsWith("0") && digits.length === 9) {
        const national = digits.slice(1);
        if (!TOGO_CARRIER_PREFIX.test(national)) return null;
        return `+228${national}`;
    }

    if (digits.length === 8 && TOGO_CARRIER_PREFIX.test(digits)) {
        return `+228${digits}`;
    }

    return null;
}

/** Mask phone for logs (PII). */
export function maskPhone(e164: string): string {
    if (e164.length <= 4) return "****";
    return `****${e164.slice(-4)}`;
}
