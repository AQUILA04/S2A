/**
 * HTTP client for Notification Hub OTP API.
 * @see notification-hub/backend/docs/OTP_CLIENT_INTEGRATION.md
 */

import { maskPhone } from "@/lib/phone/normalize";

export type OtpVerifyReason = "VALID" | "INVALID" | "EXPIRED" | "MAX_ATTEMPTS";

export interface OtpSendResponse {
    sessionId: string;
    expiresAt: string;
    notificationId: string | null;
    channel: string;
    provider?: string;
    providerReference?: string;
}

export interface OtpVerifyResponse {
    valid: boolean;
    reason: OtpVerifyReason;
}

export class NotificationHubError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly code?: string,
        readonly body?: string
    ) {
        super(message);
        this.name = "NotificationHubError";
    }
}

interface TokenCache {
    accessToken: string;
    expiresAtMs: number;
}

let tokenCache: TokenCache | null = null;

function getConfig() {
    const baseUrl = process.env.NOTIFICATION_HUB_BASE_URL?.replace(/\/$/, "");
    if (!baseUrl) {
        throw new NotificationHubError(
            "NOTIFICATION_HUB_BASE_URL is not configured",
            0
        );
    }

    const oauthEnabled = process.env.NOTIFICATION_HUB_OAUTH_ENABLED === "true";

    return {
        baseUrl,
        tenantId: process.env.NOTIFICATION_HUB_TENANT_ID ?? "s2a",
        oauthEnabled,
        tokenUri: process.env.NOTIFICATION_HUB_OAUTH_TOKEN_URI,
        clientId: process.env.NOTIFICATION_HUB_OAUTH_CLIENT_ID,
        clientSecret: process.env.NOTIFICATION_HUB_OAUTH_CLIENT_SECRET,
        refreshSkewSeconds: 30,
    };
}

async function fetchAccessToken(): Promise<string | null> {
    const config = getConfig();
    if (!config.oauthEnabled) return null;

    const now = Date.now();
    if (tokenCache && tokenCache.expiresAtMs > now) {
        return tokenCache.accessToken;
    }

    if (!config.tokenUri || !config.clientId || !config.clientSecret) {
        throw new NotificationHubError(
            "Notification Hub OAuth is enabled but token URI, client ID, or secret is missing",
            0
        );
    }

    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: config.clientId,
        client_secret: config.clientSecret,
    });

    const response = await fetch(config.tokenUri, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new NotificationHubError(
            "Failed to obtain Notification Hub OAuth token",
            response.status,
            undefined,
            text
        );
    }

    const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
    };

    tokenCache = {
        accessToken: data.access_token,
        expiresAtMs: now + (data.expires_in - config.refreshSkewSeconds) * 1000,
    };

    return tokenCache.accessToken;
}

async function buildHeaders(idempotencyKey?: string): Promise<HeadersInit> {
    const config = getConfig();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-App-Id": "s2a",
    };

    const token = await fetchAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    } else {
        headers["X-Tenant-Id"] = config.tenantId;
    }

    if (idempotencyKey) {
        headers["Idempotency-Key"] = idempotencyKey;
    }

    return headers;
}

async function parseProblemResponse(response: Response): Promise<NotificationHubError> {
    const text = await response.text();
    let code: string | undefined;
    try {
        const problem = JSON.parse(text) as { code?: string; title?: string; detail?: string };
        code = problem.code;
    } catch {
        // not JSON
    }
    return new NotificationHubError(
        `Notification Hub request failed (${response.status})`,
        response.status,
        code,
        text
    );
}

/** Reset cached OAuth token (for tests). */
export function resetNotificationHubTokenCache(): void {
    tokenCache = null;
}

/**
 * Request OTP delivery to an E.164 phone number via SMS (Brevo through hub internal OTP).
 */
export async function sendOtp(
    to: string,
    idempotencyKey?: string
): Promise<OtpSendResponse> {
    const config = getConfig();
    const response = await fetch(`${config.baseUrl}/v1/otp/send`, {
        method: "POST",
        headers: await buildHeaders(idempotencyKey),
        body: JSON.stringify({ to, channel: "SMS" }),
    });

    if (!response.ok) {
        throw await parseProblemResponse(response);
    }

    const data = (await response.json()) as OtpSendResponse;
    console.log(
        `[notification-hub] OTP send accepted for ${maskPhone(to)} session=${data.sessionId} provider=${data.provider ?? "?"}`
    );
    return data;
}

/**
 * Verify an OTP code. HTTP 200 even when invalid — check `valid` field.
 */
export async function verifyOtp(to: string, code: string): Promise<OtpVerifyResponse> {
    const config = getConfig();
    const response = await fetch(`${config.baseUrl}/v1/otp/verify`, {
        method: "POST",
        headers: await buildHeaders(),
        body: JSON.stringify({ to, code: code.trim(), channel: "SMS" }),
    });

    if (!response.ok) {
        throw await parseProblemResponse(response);
    }

    return (await response.json()) as OtpVerifyResponse;
}

export interface SmsNotificationResponse {
    id: string;
    status?: string;
}

/**
 * Queue a transactional SMS via Notification Hub (`POST /v1/notifications`).
 */
export async function sendSmsNotification(
    to: string,
    body: string,
    idempotencyKey?: string
): Promise<SmsNotificationResponse> {
    const config = getConfig();
    const response = await fetch(`${config.baseUrl}/v1/notifications`, {
        method: "POST",
        headers: await buildHeaders(idempotencyKey),
        body: JSON.stringify({
            channel: "SMS",
            to: [to],
            body,
        }),
    });

    if (!response.ok) {
        throw await parseProblemResponse(response);
    }

    const data = (await response.json()) as SmsNotificationResponse;
    console.log(
        `[notification-hub] SMS notification accepted for ${maskPhone(to)} id=${data.id}`
    );
    return data;
}
