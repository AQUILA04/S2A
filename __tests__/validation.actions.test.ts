/**
 * Unit / Integration tests for Validation Console Server Actions (Story 2.4)
 *
 * Mocks:
 *  - @/lib/supabase/client — chainable Supabase builder mock
 *  - next-auth — session control
 *  - next/cache — revalidatePath mock
 *  - @/lib/audit/logger — logAudit mock
 *
 * Coverage:
 *  - validatePayment: RBAC, APPROVE flow, REJECT flow (with/without reason)
 *  - getPendingContributions: success, error, empty
 */

// ============================================================
// Mock: lib/supabase/client (chainable builder)
// ============================================================

function mockResponse(data: any, error: any) {
    const p = Promise.resolve({ data, error });
    (p as any).returns = jest.fn(() => p);
    return p;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChain(overrides: Record<string, any> = {}): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {
        select: jest.fn(() => chain),
        update: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        in: jest.fn(() => mockResponse([], null)),
        order: jest.fn(() => mockResponse([], null)),
        single: jest.fn(() => mockResponse(null, null)),
        ...overrides,
    };
    return chain;
}

// eslint-disable-next-line prefer-const
let mockFromReturn = buildChain();

// Keep track of which table is accessed so we can differentiate
const mockFrom = jest.fn((table: string) => {
    mockLastTable = table;
    return mockFromReturn;
});
let mockLastTable = "";

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(() => ({
        from: mockFrom,
    })),
}));

// ============================================================
// Mock: next-auth
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
// Mock: next/cache
// ============================================================
const mockRevalidatePath = jest.fn();
jest.mock("next/cache", () => ({
    revalidatePath: mockRevalidatePath,
}));

// ============================================================
// Mock: logAudit
// ============================================================
const mockLogAudit = jest.fn(() => Promise.resolve());
jest.mock("@/lib/audit/logger", () => ({
    logAudit: mockLogAudit,
}));

// Lazy imports (after mocks are set up)
import { validatePayment, getPendingContributions } from "@/app/admin/validation/actions";

// ============================================================
// Setup
// ============================================================
beforeEach(() => {
    jest.clearAllMocks();
    mockSession = { user: { id: "treasurer-uuid-001", role: "TREASURER" } };
    mockFromReturn = buildChain();
    mockLastTable = "";
});

// ============================================================
// validatePayment tests
// ============================================================
describe("validatePayment Server Action", () => {
    const CONTRIBUTION_ID = "contrib-pending-001";

    it("returns UNAUTHORIZED if not authenticated", async () => {
        mockSession = null;
        const result = await validatePayment(CONTRIBUTION_ID, "APPROVE");
        expect(result.error).toMatch(/UNAUTHORIZED/i);
        expect(mockLogAudit).not.toHaveBeenCalled();
    });

    it("returns UNAUTHORIZED for MEMBER role", async () => {
        mockSession = { user: { id: "member-uuid-001", role: "MEMBER" } };
        const result = await validatePayment(CONTRIBUTION_ID, "APPROVE");
        expect(result.error).toMatch(/UNAUTHORIZED/i);
        expect(mockLogAudit).not.toHaveBeenCalled();
    });

    it("returns UNAUTHORIZED for SG role", async () => {
        mockSession = { user: { id: "sg-uuid-001", role: "SG" } };
        const result = await validatePayment(CONTRIBUTION_ID, "APPROVE");
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });

    it("allows TREASURER role to validate", async () => {
        mockSession = { user: { id: "treasurer-uuid-001", role: "TREASURER" } };
        const innerEq = jest.fn(() => Promise.resolve({ error: null }));
        const outerEq = jest.fn(() => ({ eq: innerEq }));
        mockFromReturn = buildChain({
            update: jest.fn(() => ({ eq: outerEq })),
        });
        const result = await validatePayment(CONTRIBUTION_ID, "APPROVE");
        expect(result.error).toBeUndefined();
    });

    it("allows TRESORIER_ADJOINT role to validate", async () => {
        mockSession = { user: { id: "adj-uuid-001", role: "TRESORIER_ADJOINT" } };
        const innerEq = jest.fn(() => Promise.resolve({ error: null }));
        const outerEq = jest.fn(() => ({ eq: innerEq }));
        mockFromReturn = buildChain({
            update: jest.fn(() => ({ eq: outerEq })),
        });
        const result = await validatePayment(CONTRIBUTION_ID, "APPROVE");
        expect(result.error).toBeUndefined();
    });

    it("allows PRESIDENT role to validate", async () => {
        mockSession = { user: { id: "president-uuid-001", role: "PRESIDENT" } };
        const innerEq = jest.fn(() => Promise.resolve({ error: null }));
        const outerEq = jest.fn(() => ({ eq: innerEq }));
        mockFromReturn = buildChain({
            update: jest.fn(() => ({ eq: outerEq })),
        });
        const result = await validatePayment(CONTRIBUTION_ID, "APPROVE");
        expect(result.error).toBeUndefined();
    });

    it("rejects when action is REJECT and no reason is provided", async () => {
        const result = await validatePayment(CONTRIBUTION_ID, "REJECT");
        expect(result.error).toMatch(/Validation failed/i);
        expect(result.fieldErrors?.reason).toBeDefined();
        expect(result.fieldErrors?.reason[0]).toMatch(/obligatoire/i);
        expect(mockLogAudit).not.toHaveBeenCalled();
    });

    it("rejects when action is REJECT and reason is empty string", async () => {
        const result = await validatePayment(CONTRIBUTION_ID, "REJECT", "   ");
        expect(result.error).toMatch(/Validation failed/i);
        expect(result.fieldErrors?.reason).toBeDefined();
    });

    it("approves a payment: calls DB update with VALIDATED status", async () => {
        const mockEq = jest.fn().mockReturnThis();
        mockFromReturn = buildChain({
            update: jest.fn(() => ({ eq: mockEq })),
        });
        // Final eq chain must resolve to { error: null }
        mockEq.mockReturnValue({ eq: jest.fn(() => mockResponse(null, null)) });

        const result = await validatePayment(CONTRIBUTION_ID, "APPROVE");

        expect(result.error).toBeUndefined();
        expect(result.data?.status).toBe("VALIDATED");
        expect(result.data?.contributionId).toBe(CONTRIBUTION_ID);
    });

    it("approves a payment: calls logAudit with correct metadata", async () => {
        const mockEq = jest.fn().mockReturnThis();
        mockFromReturn = buildChain({
            update: jest.fn(() => ({ eq: mockEq })),
        });
        mockEq.mockReturnValue({ eq: jest.fn(() => Promise.resolve({ error: null })) });

        await validatePayment(CONTRIBUTION_ID, "APPROVE");

        expect(mockLogAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                action_type: "VALIDATE_PAYMENT",
                metadata: expect.objectContaining({
                    contribution_id: CONTRIBUTION_ID,
                    old_value: { status: "PENDING" },
                    new_value: { status: "VALIDATED" },
                }),
            })
        );
    });

    it("approves a payment: calls revalidatePath for all required paths", async () => {
        const mockEq = jest.fn().mockReturnThis();
        mockFromReturn = buildChain({
            update: jest.fn(() => ({ eq: mockEq })),
        });
        mockEq.mockReturnValue({ eq: jest.fn(() => Promise.resolve({ error: null })) });

        await validatePayment(CONTRIBUTION_ID, "APPROVE");

        expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/validation");
        expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/members");
        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("rejects a payment with reason: returns REJECTED status and stores reason in audit", async () => {
        const mockEq = jest.fn().mockReturnThis();
        mockFromReturn = buildChain({
            update: jest.fn(() => ({ eq: mockEq })),
        });
        mockEq.mockReturnValue({ eq: jest.fn(() => Promise.resolve({ error: null })) });

        const REASON = "Référence introuvable dans les relevés bancaires";
        const result = await validatePayment(CONTRIBUTION_ID, "REJECT", REASON);

        expect(result.error).toBeUndefined();
        expect(result.data?.status).toBe("REJECTED");

        expect(mockLogAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                action_type: "VALIDATE_PAYMENT",
                metadata: expect.objectContaining({
                    new_value: expect.objectContaining({
                        status: "REJECTED",
                        rejection_reason: REASON,
                    }),
                }),
            })
        );
    });

    it("returns error when DB update fails", async () => {
        const mockEq = jest.fn().mockReturnThis();
        mockFromReturn = buildChain({
            update: jest.fn(() => ({ eq: mockEq })),
        });
        mockEq.mockReturnValue({
            eq: jest.fn(() => Promise.resolve({ error: { message: "DB failure" } })),
        });

        const result = await validatePayment(CONTRIBUTION_ID, "APPROVE");

        expect(result.error).toMatch(/Failed to update/i);
        expect(mockLogAudit).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
});

// ============================================================
// getPendingContributions tests
// ============================================================
describe("getPendingContributions Server Action", () => {
    it("returns UNAUTHORIZED if not authenticated", async () => {
        mockSession = null;
        const result = await getPendingContributions();
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });

    it("returns UNAUTHORIZED for MEMBER role", async () => {
        mockSession = { user: { id: "member-uuid-001", role: "MEMBER" } };
        const result = await getPendingContributions();
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });

    it("returns empty array when no pending contributions", async () => {
        mockFromReturn = buildChain({
            order: jest.fn(() => mockResponse([], null)),
        });

        const result = await getPendingContributions();
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual([]);
    });

    it("returns error if Contributions query fails", async () => {
        mockFromReturn = buildChain({
            order: jest.fn(() =>
                mockResponse(null, { message: "Connection timeout" })
            ),
        });

        const result = await getPendingContributions();
        expect(result.error).toMatch(/Failed to load pending/i);
    });
});
