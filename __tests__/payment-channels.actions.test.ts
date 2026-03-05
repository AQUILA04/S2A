/**
 * Unit / Integration tests for Payment Channel Server Actions (Story 2.1)
 * Follows the pattern established in __tests__/members.actions.test.ts
 *
 * Mocks:
 *  - @/lib/supabase/client — chainable Supabase builder mock
 *  - next-auth — session control
 *  - @/lib/audit/logger — logAudit spy
 */

// ============================================================
// Mock: lib/supabase/client (chainable builder)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChain(overrides: Record<string, any> = {}): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {
        select: jest.fn(() => chain),
        insert: jest.fn(() => chain),
        update: jest.fn(() => chain),
        delete: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        order: jest.fn(() => chain),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        ...overrides,
    };
    return chain;
}

// eslint-disable-next-line prefer-const
let mockFromReturn = buildChain();

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(() => ({
        from: jest.fn(() => mockFromReturn),
    })),
}));

// ============================================================
// Mock: next-auth (session control)
// ============================================================
let mockSession: { user: { id: string; role: string } } | null = {
    user: { id: "treasurer-uuid-001", role: "TREASURER" },
};

jest.mock("next-auth", () => ({
    getServerSession: jest.fn(() => Promise.resolve(mockSession)),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
    authOptions: {},
}));

// ============================================================
// Mock: lib/audit/logger
// ============================================================
jest.mock("@/lib/audit/logger", () => ({
    logAudit: jest.fn(() => Promise.resolve()),
}));

import { logAudit } from "@/lib/audit/logger";
import {
    createPaymentChannelSchema,
    updatePaymentChannelSchema,
} from "@/app/admin/settings/payment-channels/schema";
import {
    getPaymentChannels,
    createPaymentChannel,
    updatePaymentChannel,
    deletePaymentChannel,
    togglePaymentChannel,
} from "@/app/admin/settings/payment-channels/actions";

// Reset before each test
beforeEach(() => {
    jest.clearAllMocks();
    mockSession = { user: { id: "treasurer-uuid-001", role: "TREASURER" } };
    mockFromReturn = buildChain();
});

// ============================================================
// 1. Zod schema — createPaymentChannelSchema
// ============================================================

describe("createPaymentChannelSchema — Zod validation", () => {
    const valid = {
        provider_name: "Moov Flooz",
        channel_type: "MOBILE_MONEY" as const,
        account_number: "+228 90 00 00 00",
        instructions: "Transfer to this number",
    };

    it("passes for a complete valid payload", () => {
        expect(createPaymentChannelSchema.safeParse(valid).success).toBe(true);
    });

    it("passes when instructions is omitted (optional)", () => {
        const { instructions: _i, ...rest } = valid;
        expect(createPaymentChannelSchema.safeParse(rest).success).toBe(true);
    });

    it("fails when provider_name is empty", () => {
        const result = createPaymentChannelSchema.safeParse({ ...valid, provider_name: "" });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.errors.map((e) => e.path[0])).toContain("provider_name");
        }
    });

    it("fails when account_number is empty", () => {
        const result = createPaymentChannelSchema.safeParse({ ...valid, account_number: "" });
        expect(result.success).toBe(false);
    });

    it("fails for an invalid channel_type", () => {
        const result = createPaymentChannelSchema.safeParse({ ...valid, channel_type: "CRYPTO" });
        expect(result.success).toBe(false);
    });
});

// ============================================================
// 2. Zod schema — updatePaymentChannelSchema
// ============================================================

describe("updatePaymentChannelSchema — Zod validation", () => {
    it("passes for partial updates (toggle only)", () => {
        expect(updatePaymentChannelSchema.safeParse({ is_active: false }).success).toBe(true);
    });

    it("passes for a full update", () => {
        expect(updatePaymentChannelSchema.safeParse({
            provider_name: "Western Union",
            channel_type: "INTL_TRANSFER",
            account_number: "AMICALE-S2A-001",
            instructions: null,
            is_active: true,
        }).success).toBe(true);
    });

    it("passes for empty object (no-op update)", () => {
        expect(updatePaymentChannelSchema.safeParse({}).success).toBe(true);
    });
});

// ============================================================
// 3. RBAC — only TREASURER / TRESORIER_ADJOINT / PRESIDENT can write
// ============================================================

describe("createPaymentChannel — RBAC enforcement", () => {
    const validInput = {
        provider_name: "Moov Flooz",
        channel_type: "MOBILE_MONEY" as const,
        account_number: "+228 90 00 00 00",
    };

    it("allows TREASURER to create", async () => {
        mockSession = { user: { id: "treasurer-001", role: "TREASURER" } };
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({
                data: { id: "new-id", ...validInput, is_active: true, created_at: "", updated_at: "", updated_by: null, instructions: null },
                error: null,
            }),
        });
        mockFromReturn = chain;
        const result = await createPaymentChannel(validInput);
        expect(result.error).toBeUndefined();
    });

    it("allows PRESIDENT to create", async () => {
        mockSession = { user: { id: "president-001", role: "PRESIDENT" } };
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({
                data: { id: "new-id", ...validInput, is_active: true, created_at: "", updated_at: "", updated_by: null, instructions: null },
                error: null,
            }),
        });
        mockFromReturn = chain;
        const result = await createPaymentChannel(validInput);
        expect(result.error).toBeUndefined();
    });

    it("allows TRESORIER_ADJOINT to create", async () => {
        mockSession = { user: { id: "adjoint-001", role: "TRESORIER_ADJOINT" } };
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({
                data: { id: "new-id", ...validInput, is_active: true, created_at: "", updated_at: "", updated_by: null, instructions: null },
                error: null,
            }),
        });
        mockFromReturn = chain;
        const result = await createPaymentChannel(validInput);
        expect(result.error).toBeUndefined();
    });

    it("rejects MEMBER role with UNAUTHORIZED error", async () => {
        mockSession = { user: { id: "member-001", role: "MEMBER" } };
        const result = await createPaymentChannel(validInput);
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });

    it("rejects SG role with UNAUTHORIZED error", async () => {
        mockSession = { user: { id: "sg-001", role: "SG" } };
        const result = await createPaymentChannel(validInput);
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });

    it("rejects unauthenticated call with UNAUTHORIZED error", async () => {
        mockSession = null;
        const result = await createPaymentChannel(validInput);
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });
});

// ============================================================
// 4. createPaymentChannel — success path writes audit log
// ============================================================

describe("createPaymentChannel — audit logging", () => {
    it("writes a CREATE_PAYMENT_CHANNEL audit entry with new_value", async () => {
        const newChannel = {
            id: "channel-uuid-001",
            provider_name: "Moov Flooz",
            channel_type: "MOBILE_MONEY",
            account_number: "+228 90 00 00 00",
            instructions: null,
            is_active: true,
            created_at: "2026-03-05T00:00:00Z",
            updated_at: "2026-03-05T00:00:00Z",
            updated_by: "treasurer-uuid-001",
        };

        const chain = buildChain({
            single: jest.fn().mockResolvedValue({ data: newChannel, error: null }),
        });
        mockFromReturn = chain;

        await createPaymentChannel({
            provider_name: "Moov Flooz",
            channel_type: "MOBILE_MONEY",
            account_number: "+228 90 00 00 00",
        });

        expect(logAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                actor_id: "treasurer-uuid-001",
                action_type: "CREATE_PAYMENT_CHANNEL",
                metadata: expect.objectContaining({ new_value: newChannel }),
            })
        );
    });
});

// ============================================================
// 5. updatePaymentChannel — validation errors
// ============================================================

describe("updatePaymentChannel — validation", () => {
    it("returns error when id is missing", async () => {
        const result = await updatePaymentChannel("", { is_active: false });
        expect(result.error).toMatch(/ID is required/i);
    });

    it("returns fieldErrors on Zod validation failure", async () => {
        const result = await updatePaymentChannel("123e4567-e89b-12d3-a456-426614174000", {
            provider_name: "", // invalid — required
        });
        expect(result.error).toBe("Validation failed");
        expect(result.fieldErrors?.provider_name).toBeDefined();
    });
});

// ============================================================
// 6. updatePaymentChannel — writes UPDATE_PAYMENT_CHANNEL audit log
// ============================================================

describe("updatePaymentChannel — audit logging", () => {
    it("writes old_value and new_value in audit metadata", async () => {
        const oldChannel = {
            id: "123e4567-e89b-12d3-a456-426614174000",
            provider_name: "Moov Flooz",
            channel_type: "MOBILE_MONEY",
            account_number: "+228 90",
            is_active: true,
        };
        const updatedChannel = { ...oldChannel, account_number: "+228 91 00 00 00" };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = buildChain({
            single: jest.fn()
                .mockResolvedValueOnce({ data: oldChannel, error: null })
                .mockResolvedValueOnce({ data: updatedChannel, error: null }),
        });
        mockFromReturn = chain;

        await updatePaymentChannel("123e4567-e89b-12d3-a456-426614174000", { account_number: "+228 91 00 00 00" });

        expect(logAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                action_type: "UPDATE_PAYMENT_CHANNEL",
                metadata: expect.objectContaining({
                    old_value: expect.objectContaining({ account_number: "+228 90" }),
                    new_value: expect.objectContaining({ account_number: "+228 91 00 00 00" }),
                }),
            })
        );
    });
});

// ============================================================
// 7. deletePaymentChannel — writes DELETE_PAYMENT_CHANNEL audit log
// ============================================================

describe("deletePaymentChannel — audit logging", () => {
    it("writes a DELETE_PAYMENT_CHANNEL audit entry with old_value", async () => {
        const oldChannel = {
            id: "223e4567-e89b-12d3-a456-426614174001",
            provider_name: "Old Bank",
            channel_type: "BANK_TRANSFER",
            account_number: "TG-001-000",
            is_active: false,
        };

        // Build a chainable update: .update().eq("id", id) resolves to { error: null }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateChain: any = {
            eq: jest.fn(() => Promise.resolve({ error: null })),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = buildChain({
            single: jest.fn().mockResolvedValueOnce({ data: oldChannel, error: null }),
            update: jest.fn(() => updateChain),
        });
        mockFromReturn = chain;

        await deletePaymentChannel("223e4567-e89b-12d3-a456-426614174001");

        expect(logAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                action_type: "DELETE_PAYMENT_CHANNEL",
                metadata: expect.objectContaining({
                    old_value: expect.objectContaining({ id: "223e4567-e89b-12d3-a456-426614174001" }),
                }),
            })
        );
    });

    it("returns UNAUTHORIZED error for MEMBER role", async () => {
        mockSession = { user: { id: "member-001", role: "MEMBER" } };
        const result = await deletePaymentChannel("223e4567-e89b-12d3-a456-426614174001");
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });
});

// ============================================================
// 8. togglePaymentChannel — delegates to updatePaymentChannel
// ============================================================

describe("togglePaymentChannel", () => {
    it("returns error when channel is not found", async () => {
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Row not found" },
            }),
        });
        mockFromReturn = chain;

        const result = await togglePaymentChannel("333e4567-e89b-12d3-a456-426614174000", false);
        expect(result.error).toMatch(/not found/i);
    });

    it("calls UPDATE_PAYMENT_CHANNEL audit when toggling", async () => {
        const oldChannel = {
            id: "444e4567-e89b-12d3-a456-426614174000",
            is_active: true,
        };
        const updatedChannel = { ...oldChannel, is_active: false };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = buildChain({
            single: jest.fn()
                .mockResolvedValueOnce({ data: oldChannel, error: null })
                .mockResolvedValueOnce({ data: updatedChannel, error: null }),
        });
        mockFromReturn = chain;

        const result = await togglePaymentChannel("444e4567-e89b-12d3-a456-426614174000", false);
        expect(result.error).toBeUndefined();
        expect(logAudit).toHaveBeenCalledWith(
            expect.objectContaining({ action_type: "UPDATE_PAYMENT_CHANNEL" })
        );
    });
});

// ============================================================
// 9. getPaymentChannels — RBAC read access (all roles)
// ============================================================

describe("getPaymentChannels — read access", () => {
    it("returns channels for authenticated MEMBER", async () => {
        mockSession = { user: { id: "member-001", role: "MEMBER" } };
        const chain = buildChain({
            // getPaymentChannels resolves query via order (not single)
            order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        });
        mockFromReturn = chain;

        const result = await getPaymentChannels(false);
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual([]);
    });

    it("returns UNAUTHORIZED for unauthenticated request", async () => {
        mockSession = null;
        const result = await getPaymentChannels(false);
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });
});
