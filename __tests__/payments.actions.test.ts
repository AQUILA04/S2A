/**
 * Unit / Integration tests for Payments Server Actions (Story 2.3)
 *
 * Mocks:
 *  - @/lib/supabase/client — chainable Supabase builder mock
 *  - next-auth — session control
 *  - next/cache - revalidatePath mock
 *  - @/lib/audit/logger - logAudit mock
 */

// ============================================================
// Mocks
// ============================================================
const mockInsert = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChain(overrides: Record<string, any> = {}): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {
        select: jest.fn(() => chain),
        insert: jest.fn((data) => {
            mockInsert(data);
            return chain;
        }),
        eq: jest.fn(() => chain),
        // By default return no rows for select (meaning reference_id is unique)
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        ...overrides,
    };
    return chain;
}

// eslint-disable-next-line prefer-const
let mockFromReturn = buildChain();

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(() => ({
        from: jest.fn((table) => {
            // For Contributions checks, we might want to return { count: 0 } on select
            if (table === "Contributions") {
                return {
                    select: jest.fn(() => ({
                        eq: jest.fn(() => Promise.resolve({ count: 0, error: null }))
                    })),
                    ...mockFromReturn
                };
            }
            return mockFromReturn;
        }),
    })),
}));

let mockSession: { user: { id: string; role: string } } | null = {
    user: { id: "eb-uuid-001", role: "PRESIDENT" },
};

jest.mock("next-auth", () => ({
    getServerSession: jest.fn(() => Promise.resolve(mockSession)),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
    authOptions: {},
}));

jest.mock("@/lib/audit/logger", () => ({
    logAudit: jest.fn(() => Promise.resolve()),
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

import { recordDirectPayment } from "@/app/admin/payments/actions";

// Reset before each test
beforeEach(() => {
    jest.clearAllMocks();
    mockSession = { user: { id: "eb-uuid-001", role: "PRESIDENT" } };
    mockFromReturn = buildChain();
});

describe("recordDirectPayment Server Action", () => {
    const validBulkInput = {
        member_id: "123e4567-e89b-12d3-a456-426614174000",
        amount: 5000,
        months: [1, 2, 3, 4, 5], // 5 months
        year: 2024, // past year is valid for arrears
        payment_channel: "CASH",
    };

    it("returns UNAUTHORIZED if user is not authenticated", async () => {
        mockSession = null;
        const result = await recordDirectPayment(validBulkInput);
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });

    it("returns UNAUTHORIZED if user is not an EB member", async () => {
        mockSession = { user: { id: "member-uuid-001", role: "MEMBER" } };
        const result = await recordDirectPayment(validBulkInput);
        expect(result.error).toMatch(/UNAUTHORIZED: Insufficient permissions/i);
    });

    it("splits the amount evenly and inserts multiple records", async () => {
        // 5000 / 5 = 1000 per month
        mockFromReturn = buildChain({
            select: jest.fn().mockResolvedValue({ data: [], error: null })
        });

        const result = await recordDirectPayment(validBulkInput);
        expect(result.error).toBeUndefined();
        expect(result.data?.count).toBe(5);

        expect(mockInsert).toHaveBeenCalledTimes(1);
        const insertedData = mockInsert.mock.calls[0][0];

        // Should be an array of 5 objects
        expect(Array.isArray(insertedData)).toBe(true);
        expect(insertedData.length).toBe(5);

        // Check each record
        insertedData.forEach((record: any, index: number) => {
            expect(record.amount).toBe(1000);
            expect(record.month).toBe(index + 1);
            expect(record.status).toBe("VALIDATED");
            expect(record.validator_id).toBe("eb-uuid-001");
        });
    });

    it("handles remainders by adding to the first month", async () => {
        // 4000 for 3 months = 1333 per month, remainder 1
        // First month should be 1334, rest 1333
        const remainderInput = {
            ...validBulkInput,
            amount: 4000,
            months: [1, 2, 3],
        };

        mockFromReturn = buildChain({
            select: jest.fn().mockResolvedValue({ data: [], error: null })
        });

        const result = await recordDirectPayment(remainderInput);
        expect(result.error).toBeUndefined();

        expect(mockInsert).toHaveBeenCalledTimes(1);
        const insertedData = mockInsert.mock.calls[0][0];

        expect(insertedData[0].amount).toBe(1334);
        expect(insertedData[1].amount).toBe(1333);
        expect(insertedData[2].amount).toBe(1333);
    });
});
