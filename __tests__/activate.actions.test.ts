jest.mock("@/lib/services/activation-otp.service", () => ({
    normalizePhoneToE164: jest.requireActual("@/lib/phone/normalize").normalizePhoneToE164,
    verifyActivationOtp: jest.fn(),
    sendActivationOtp: jest.fn(),
}));

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(),
}));

const mockCookieGet = jest.fn();
const mockCookieSet = jest.fn();

jest.mock("next/headers", () => ({
    cookies: jest.fn(async () => ({
        get: mockCookieGet,
        set: mockCookieSet,
    })),
}));

import { verifyActivationOtp } from "@/lib/services/activation-otp.service";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import {
    completeActivationWithPassword,
    verifyActivationOtpOnly,
} from "@/app/activate/actions";
import {
    ACTIVATION_COOKIE,
    createActivationTicket,
} from "@/lib/auth/activation-ticket";

process.env.NEXTAUTH_SECRET = "test-secret-for-activation-ticket";

const mockVerifyActivationOtp = verifyActivationOtp as jest.Mock;
const mockCreateClient = createServerSupabaseClient as jest.Mock;

function buildSupabaseMock(members: { id: string; phone: string; account_status: string }[]) {
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const updateSecondEq = jest.fn().mockReturnValue({ eq: updateEq });
    const update = jest.fn().mockReturnValue({
        eq: updateSecondEq,
    });

    return {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: members, error: null }),
            }),
            update,
        })),
        __update: update,
        __updateEq: updateEq,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe("verifyActivationOtpOnly", () => {
    it("sets activation cookie and does not activate the account", async () => {
        const client = buildSupabaseMock([
            {
                id: "member-1",
                phone: "+22890123456",
                account_status: "PENDING_ACTIVATION",
            },
        ]);
        mockCreateClient.mockReturnValue(client);
        mockVerifyActivationOtp.mockResolvedValue({
            valid: true,
            reason: "VALID",
            message: "Code vérifié avec succès.",
        });

        const result = await verifyActivationOtpOnly({
            phone: "+22890123456",
            code: "123456",
        });

        expect(result.data?.verified).toBe(true);
        expect(mockCookieSet).toHaveBeenCalledWith(
            ACTIVATION_COOKIE,
            expect.any(String),
            expect.objectContaining({ httpOnly: true, path: "/activate" })
        );
        expect(client.__update).not.toHaveBeenCalled();
    });

    it("returns field error when OTP is invalid", async () => {
        mockCreateClient.mockReturnValue(
            buildSupabaseMock([
                {
                    id: "member-1",
                    phone: "+22890123456",
                    account_status: "PENDING_ACTIVATION",
                },
            ])
        );
        mockVerifyActivationOtp.mockResolvedValue({
            valid: false,
            reason: "INVALID",
            message: "Code incorrect. Veuillez réessayer.",
        });

        const result = await verifyActivationOtpOnly({
            phone: "+22890123456",
            code: "000000",
        });

        expect(result.fieldErrors?.code).toBeDefined();
        expect(mockCookieSet).not.toHaveBeenCalled();
    });
});

describe("completeActivationWithPassword", () => {
    it("activates member when ticket cookie is valid", async () => {
        const ticket = createActivationTicket("member-1");
        mockCookieGet.mockReturnValue({ value: ticket });

        const client = buildSupabaseMock([]);
        mockCreateClient.mockReturnValue(client);

        const result = await completeActivationWithPassword({
            password: "SecurePass123",
            confirmPassword: "SecurePass123",
        });

        expect(result.data?.activated).toBe(true);
        expect(client.__update).toHaveBeenCalledWith(
            expect.objectContaining({
                account_status: "ACTIVE",
                must_change_password: false,
            })
        );
        expect(mockCookieSet).toHaveBeenCalledWith(
            ACTIVATION_COOKIE,
            "",
            expect.objectContaining({ maxAge: 0 })
        );
    });

    it("rejects password mismatch", async () => {
        const result = await completeActivationWithPassword({
            password: "SecurePass123",
            confirmPassword: "Different123",
        });

        expect(result.fieldErrors?.confirmPassword).toBeDefined();
    });

    it("rejects missing or expired ticket", async () => {
        mockCookieGet.mockReturnValue(undefined);

        const result = await completeActivationWithPassword({
            password: "SecurePass123",
            confirmPassword: "SecurePass123",
        });

        expect(result.error).toMatch(/expirée/i);
    });
});
