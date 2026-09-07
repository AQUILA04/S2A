/**
 * Signed httpOnly cookie ticket proving OTP verification during /activate step 2.
 * Uses HMAC-SHA256 with NEXTAUTH_SECRET — no extra deps.
 */

import { createHmac, timingSafeEqual } from "crypto";

export const ACTIVATION_COOKIE = "s2a_activation";
const TICKET_TTL_MS = 15 * 60 * 1000; // 15 minutes

type TicketPayload = {
    memberId: string;
    exp: number;
};

function getSecret(): string {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error("[activation-ticket] NEXTAUTH_SECRET is required");
    }
    return secret;
}

function sign(body: string): string {
    return createHmac("sha256", getSecret()).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

/** Encode memberId into a signed ticket string (value for the cookie). */
export function createActivationTicket(memberId: string, now = Date.now()): string {
    const payload: TicketPayload = {
        memberId,
        exp: now + TICKET_TTL_MS,
    };
    const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    return `${body}.${sign(body)}`;
}

/** Verify ticket and return memberId, or null if invalid/expired. */
export function verifyActivationTicket(
    ticket: string | undefined | null,
    now = Date.now()
): string | null {
    if (!ticket || !ticket.includes(".")) return null;

    const [body, signature] = ticket.split(".");
    if (!body || !signature) return null;
    if (!safeEqual(sign(body), signature)) return null;

    try {
        const payload = JSON.parse(
            Buffer.from(body, "base64url").toString("utf8")
        ) as TicketPayload;
        if (!payload.memberId || typeof payload.exp !== "number") return null;
        if (payload.exp < now) return null;
        return payload.memberId;
    } catch {
        return null;
    }
}

export const activationCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/activate",
    maxAge: 15 * 60,
};
