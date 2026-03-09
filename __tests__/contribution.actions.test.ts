/**
 * Unit / Integration tests for Contribution Server Actions (Story 2.2)
 *
 * Mocks:
 *  - @/lib/supabase/client — chainable Supabase builder mock
 *  - next-auth — session control
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
        eq: jest.fn(() => chain),
        single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116', message: "0 rows" } })),
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
    user: { id: "member-uuid-001", role: "MEMBER" },
};

jest.mock("next-auth", () => ({
    getServerSession: jest.fn(() => Promise.resolve(mockSession)),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
    authOptions: {},
}));

import { createContribution } from "@/app/dashboard/payment/actions";

// Reset before each test
beforeEach(() => {
    jest.clearAllMocks();
    mockSession = { user: { id: "member-uuid-001", role: "MEMBER" } };
    mockFromReturn = buildChain();
});

describe("createContribution Server Action", () => {
    const validCashInput = {
        amount: 5000,
        month: 1,
        year: 2026,
        payment_channel: "CASH",
    };

    const validDigitalInput = {
        amount: 5000,
        month: 1,
        year: 2026,
        payment_channel: "MOBILE_MONEY",
        reference_id: "TXN123456789",
    };

    it("returns UNAUTHORIZED if user is not authenticated", async () => {
        mockSession = null;
        const result = await createContribution(validCashInput);
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });

    it("fails if Zod validation fails", async () => {
        const result = await createContribution({
            ...validCashInput,
            amount: -100, // invalid amount
        });
        expect(result.error).toMatch(/Validation failed/i);
        expect(result.fieldErrors?.amount).toBeDefined();
    });

    it("inserts CASH contribution effectively (no reference check needed)", async () => {
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({
                data: { id: "contrib-001", ...validCashInput, status: "PENDING" },
                error: null,
            }),
        });
        mockFromReturn = chain;

        const result = await createContribution(validCashInput);
        expect(result.error).toBeUndefined();
        expect(result.data?.status).toBe("PENDING");
    });

    it("checks for duplicate reference_id for digital channels and fails if it exists", async () => {
        const checkDuplicateChain = buildChain({
            // Mock that a record with the given reference_id is found
            single: jest.fn().mockResolvedValue({
                data: { id: "existing-contrib-001" },
                error: null,
            }),
        });
        mockFromReturn = checkDuplicateChain;

        const result = await createContribution(validDigitalInput);
        expect(result.error).toMatch(/Validation failed/i);
        expect(result.fieldErrors?.reference_id).toBeDefined();
        expect(result.fieldErrors?.reference_id[0]).toMatch(/already been submitted/i);
    });

    it("inserts digital contribution if reference_id is unique", async () => {
        const chain = buildChain({
            single: jest.fn()
                // First call: `single()` for check duplicate duplicate check returns null
                .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: "0 rows" } })
                // Second call: `single()` for `insert` returns newly created record
                .mockResolvedValueOnce({
                    data: { id: "contrib-002", ...validDigitalInput, status: "PENDING" },
                    error: null,
                })
        });
        mockFromReturn = chain;

        const result = await createContribution(validDigitalInput);
        expect(result.error).toBeUndefined();
        expect(result.data?.id).toBe("contrib-002");
    });
});
