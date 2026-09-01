jest.mock("@/lib/services/activation-otp.service", () => ({
    normalizePhoneToE164: jest.requireActual("@/lib/phone/normalize").normalizePhoneToE164,
    verifyActivationOtp: jest.fn(),
    sendActivationOtp: jest.fn(),
}));

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(),
}));

import { verifyActivationOtp } from "@/lib/services/activation-otp.service";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { activateAccount } from "@/app/activate/actions";

const mockVerifyActivationOtp = verifyActivationOtp as jest.Mock;
const mockCreateClient = createServerSupabaseClient as jest.Mock;

function buildSupabaseMock(members: { id: string; phone: string; account_status: string }[]) {
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const updateSecondEq = jest.fn().mockReturnValue({ eq: updateEq });

    return {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: members, error: null }),
            }),
            update: jest.fn().mockReturnValue({
                eq: updateSecondEq,
            }),
        })),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe("activateAccount", () => {
    it("activates member when OTP is valid", async () => {
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
            valid: true,
            reason: "VALID",
            message: "Code vérifié avec succès.",
        });

        const result = await activateAccount({
            phone: "+22890123456",
            code: "123456",
            password: "SecurePass123",
            confirmPassword: "SecurePass123",
        });

        expect(result.data?.activated).toBe(true);
        expect(mockVerifyActivationOtp).toHaveBeenCalledWith("+22890123456", "123456");
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

        const result = await activateAccount({
            phone: "+22890123456",
            code: "000000",
            password: "SecurePass123",
            confirmPassword: "SecurePass123",
        });

        expect(result.fieldErrors?.code).toBeDefined();
    });

    it("rejects password mismatch", async () => {
        const result = await activateAccount({
            phone: "+22890123456",
            code: "123456",
            password: "SecurePass123",
            confirmPassword: "Different123",
        });

        expect(result.fieldErrors?.confirmPassword).toBeDefined();
    });
});
