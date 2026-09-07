let mockSession: { user: { id: string } } | null = {
    user: { id: "member-1" },
};

jest.mock("next-auth", () => ({
    getServerSession: jest.fn(() => Promise.resolve(mockSession)),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
    authOptions: {},
}));

jest.mock("@/lib/auth/helpers", () => ({
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
}));

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(),
}));

import { hashPassword, verifyPassword } from "@/lib/auth/helpers";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { changePassword } from "@/app/dashboard/account/password/actions";

const mockHashPassword = hashPassword as jest.Mock;
const mockVerifyPassword = verifyPassword as jest.Mock;
const mockCreateClient = createServerSupabaseClient as jest.Mock;

function buildClient() {
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq: updateEq });
    const fetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
            data: { password_hash: "existing-hash" },
            error: null,
        }),
        update,
    };

    return {
        from: jest.fn(() => fetchChain),
        update,
        updateEq,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockSession = { user: { id: "member-1" } };
});

describe("changePassword", () => {
    it("rejects unauthenticated users", async () => {
        mockSession = null;

        const result = await changePassword({
            currentPassword: "OldPassword123",
            newPassword: "NewPassword123",
            confirmPassword: "NewPassword123",
        });

        expect(result.error).toBe("Vous devez être connecté.");
        expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it("returns a field error when confirmation does not match", async () => {
        const result = await changePassword({
            currentPassword: "OldPassword123",
            newPassword: "NewPassword123",
            confirmPassword: "DifferentPassword123",
        });

        expect(result.fieldErrors?.confirmPassword).toBeDefined();
        expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it("rejects an incorrect current password", async () => {
        mockCreateClient.mockReturnValue(buildClient());
        mockVerifyPassword.mockResolvedValueOnce(false);

        const result = await changePassword({
            currentPassword: "WrongPassword123",
            newPassword: "NewPassword123",
            confirmPassword: "NewPassword123",
        });

        expect(result.fieldErrors?.currentPassword).toEqual([
            "Le mot de passe actuel est incorrect.",
        ]);
        expect(mockHashPassword).not.toHaveBeenCalled();
    });

    it("hashes and stores a valid new password", async () => {
        const client = buildClient();
        mockCreateClient.mockReturnValue(client);
        mockVerifyPassword
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);
        mockHashPassword.mockResolvedValue("new-hash");

        const result = await changePassword({
            currentPassword: "OldPassword123",
            newPassword: "NewPassword123",
            confirmPassword: "NewPassword123",
        });

        expect(result.data).toEqual({ updated: true });
        expect(mockHashPassword).toHaveBeenCalledWith("NewPassword123");
        expect(client.update).toHaveBeenCalledWith({ password_hash: "new-hash" });
        expect(client.updateEq).toHaveBeenCalledWith("id", "member-1");
    });
});
