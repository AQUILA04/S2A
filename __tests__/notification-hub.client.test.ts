import {
    sendOtp,
    verifyOtp,
    resetNotificationHubTokenCache,
    NotificationHubError,
} from "@/lib/services/notification-hub.client";

const originalFetch = global.fetch;

beforeEach(() => {
    resetNotificationHubTokenCache();
    process.env.NOTIFICATION_HUB_BASE_URL = "http://localhost:8088";
    process.env.NOTIFICATION_HUB_TENANT_ID = "s2a";
    process.env.NOTIFICATION_HUB_OAUTH_ENABLED = "false";
});

afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NOTIFICATION_HUB_BASE_URL;
    delete process.env.NOTIFICATION_HUB_TENANT_ID;
    delete process.env.NOTIFICATION_HUB_OAUTH_ENABLED;
});

describe("notification-hub.client", () => {
    it("sendOtp posts to /v1/otp/send with tenant header in local mode", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 202,
            json: async () => ({
                sessionId: "sess-1",
                expiresAt: "2026-08-31T20:00:00Z",
                notificationId: null,
                channel: "SMS",
                provider: "twilio-verify",
            }),
        }) as unknown as typeof fetch;

        const result = await sendOtp("+22890123456", "idem-1");

        expect(result.provider).toBe("twilio-verify");
        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:8088/v1/otp/send",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    "X-Tenant-Id": "s2a",
                    "Idempotency-Key": "idem-1",
                    "X-App-Id": "s2a",
                }),
                body: JSON.stringify({ to: "+22890123456" }),
            })
        );
    });

    it("verifyOtp returns valid=false on HTTP 200", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ valid: false, reason: "INVALID" }),
        }) as unknown as typeof fetch;

        const result = await verifyOtp("+22890123456", "000000");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("INVALID");
    });

    it("throws NotificationHubError on HTTP error", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 422,
            text: async () => JSON.stringify({ code: "OTP_NOT_CONFIGURED" }),
        }) as unknown as typeof fetch;

        await expect(sendOtp("+22890123456")).rejects.toBeInstanceOf(
            NotificationHubError
        );
    });

    it("fetches OAuth token when enabled", async () => {
        process.env.NOTIFICATION_HUB_OAUTH_ENABLED = "true";
        process.env.NOTIFICATION_HUB_OAUTH_TOKEN_URI =
            "http://keycloak/token";
        process.env.NOTIFICATION_HUB_OAUTH_CLIENT_ID = "s2a";
        process.env.NOTIFICATION_HUB_OAUTH_CLIENT_SECRET = "secret";

        global.fetch = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "tok-abc",
                    expires_in: 300,
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 202,
                json: async () => ({
                    sessionId: "s",
                    expiresAt: "2026-08-31T20:00:00Z",
                    notificationId: null,
                    channel: "SMS",
                }),
            }) as unknown as typeof fetch;

        await sendOtp("+22890123456");

        const hubCall = (global.fetch as jest.Mock).mock.calls[1];
        expect(hubCall[1].headers.Authorization).toBe("Bearer tok-abc");
        expect(hubCall[1].headers["X-Tenant-Id"]).toBeUndefined();
    });
});
