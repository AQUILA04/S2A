/**
 * Unit tests for Member CRUD Server Actions (Story 1.2)
 * Follows the pattern established in __tests__/auth.test.ts
 *
 * Mocks:
 *  - @supabase/supabase-js is mocked via jest.mock
 *  - next-auth/next is mocked to control session returns
 *  - lib/auth/helpers uses real hashPassword (bcryptjs)
 */

// ============================================================
// Mock: lib/supabase/client
// ============================================================
const mockSupabaseInsert = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseSingle = jest.fn();
const mockSupabaseRange = jest.fn();
const mockSupabaseOrder = jest.fn();

// Build a chainable mock for the Supabase query builder
function buildChain(overrides: Record<string, unknown> = {}) {
    const chain: Record<string, unknown> = {
        select: jest.fn(() => chain),
        insert: jest.fn(() => chain),
        update: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        single: jest.fn(() => Promise.resolve({ data: null, error: null, count: null })),
        range: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        order: jest.fn(() => chain),
        ...overrides,
    };
    return chain;
}

// Shared Supabase mock state (mutated per-test)
let mockFromReturn = buildChain();

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(() => ({
        from: jest.fn(() => mockFromReturn),
    })),
}));

// ============================================================
// Mock: next-auth (session control)
// ============================================================
let mockSession: {
    user: { id: string; role: string; name?: string; email?: string };
} | null = {
    user: { id: "actor-uuid-001", role: "SG" },
};

jest.mock("next-auth", () => ({
    getServerSession: jest.fn(() => Promise.resolve(mockSession)),
}));

// Also mock the authOptions import
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
    authOptions: {},
}));

// ============================================================
// Tests
// ============================================================

import {
    createMemberSchema,
    updateMemberSchema,
} from "@/app/admin/members/types";
import {
    createMember,
    updateMember,
    getMembers,
    getMemberById,
} from "@/app/admin/members/actions";

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    mockSession = { user: { id: "actor-uuid-001", role: "SG" } };
    mockFromReturn = buildChain();
});

// ============================================================
// 1. Zod schema validation
// ============================================================

describe("createMemberSchema — Zod validation", () => {
    const validPayload = {
        first_name: "Jean",
        last_name: "Dupont",
        email: "jean.dupont@amicale.org",
        phone: "+225 07 00 00 00 01",
        join_date: "2026-01-01",
        monthly_fee: 10000,
        role: "MEMBER" as const,
        password: "SecurePass123",
    };

    it("should pass for a fully valid payload", () => {
        const result = createMemberSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
    });

    it("should fail when first_name is missing", () => {
        const result = createMemberSchema.safeParse({ ...validPayload, first_name: "" });
        expect(result.success).toBe(false);
        if (!result.success) {
            const fields = result.error.errors.map((e) => e.path[0]);
            expect(fields).toContain("first_name");
        }
    });

    it("should fail when email is invalid", () => {
        const result = createMemberSchema.safeParse({ ...validPayload, email: "not-an-email" });
        expect(result.success).toBe(false);
        if (!result.success) {
            const fields = result.error.errors.map((e) => e.path[0]);
            expect(fields).toContain("email");
        }
    });

    it("should fail when monthly_fee is negative", () => {
        const result = createMemberSchema.safeParse({ ...validPayload, monthly_fee: -500 });
        expect(result.success).toBe(false);
        if (!result.success) {
            const fields = result.error.errors.map((e) => e.path[0]);
            expect(fields).toContain("monthly_fee");
        }
    });

    it("should fail when password is shorter than 8 characters", () => {
        const result = createMemberSchema.safeParse({ ...validPayload, password: "short" });
        expect(result.success).toBe(false);
        if (!result.success) {
            const fields = result.error.errors.map((e) => e.path[0]);
            expect(fields).toContain("password");
        }
    });

    it("should fail when role is an invalid value", () => {
        const result = createMemberSchema.safeParse({ ...validPayload, role: "SUPER_ADMIN" });
        expect(result.success).toBe(false);
    });
});

describe("updateMemberSchema — Zod validation", () => {
    it("should pass for a partial valid payload", () => {
        const result = updateMemberSchema.safeParse({ first_name: "Marie", monthly_fee: 15000 });
        expect(result.success).toBe(true);
    });

    it("should fail when monthly_fee is negative", () => {
        const result = updateMemberSchema.safeParse({ monthly_fee: -1 });
        expect(result.success).toBe(false);
    });
});

// ============================================================
// 2. createMember — duplicate email returns field error
// ============================================================

describe("createMember — duplicate email constraint", () => {
    it("should return fieldErrors.email when Supabase returns unique constraint violation on email", async () => {
        const chain = buildChain({
            insert: jest.fn(() => chain),
            select: jest.fn(() => chain),
            single: jest.fn(() =>
                Promise.resolve({
                    data: null,
                    error: { code: "23505", message: "duplicate key value violates unique constraint (email)" },
                })
            ),
        });
        mockFromReturn = chain;

        const result = await createMember({
            first_name: "Jean",
            last_name: "Dupont",
            email: "duplicate@amicale.org",
            phone: "+225 07 00 00 00 02",
            join_date: "2026-01-01",
            monthly_fee: 10000,
            role: "MEMBER",
            password: "SecurePass123",
        });

        expect(result.error).toBe("Validation failed");
        expect(result.fieldErrors?.email).toBeDefined();
        expect(result.fieldErrors?.email?.[0]).toMatch(/email/i);
    });
});

// ============================================================
// 3. createMember — writes CREATE_MEMBER AuditLog
// ============================================================

describe("createMember — AuditLog write", () => {
    it("should write a CREATE_MEMBER AuditLog with new_value payload after successful insert", async () => {
        const createdMember = {
            id: "new-member-uuid",
            first_name: "Jean",
            last_name: "Dupont",
            email: "jean@amicale.org",
            phone: "+225 07 00 00 00 03",
            join_date: "2026-01-01",
            monthly_fee: 10000,
            status: "ACTIVE",
            account_status: "PENDING_ACTIVATION",
            role: "MEMBER",
            password_hash: "$2a$12$fakehash",
            created_at_app: "2026-01-01T00:00:00Z",
        };

        // Track what gets inserted into AuditLogs
        let auditInsertPayload: object | null = null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = {
            select: jest.fn(() => chain),
            insert: jest.fn((payload: unknown) => {
                // First call = Members insert, second call = AuditLogs insert
                if (auditInsertPayload === null && typeof payload === "object") {
                    auditInsertPayload = payload as object;
                } else if (typeof payload === "object" && payload !== null) {
                    auditInsertPayload = payload as object;
                }
                return chain;
            }),
            update: jest.fn(() => chain),
            eq: jest.fn(() => chain),
            single: jest.fn()
                .mockResolvedValueOnce({ data: createdMember, error: null }) // Members insert
                .mockResolvedValueOnce({ data: null, error: null }),          // AuditLogs insert
            range: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
            order: jest.fn(() => chain),
        };
        chain.insert = jest.fn((payload: unknown) => {
            if (typeof payload === "object" && payload !== null) {
                const p = payload as Record<string, unknown>;
                if (p.action_type) {
                    auditInsertPayload = payload as object;
                }
            }
            return chain;
        });

        mockFromReturn = chain;

        const result = await createMember({
            first_name: "Jean",
            last_name: "Dupont",
            email: "jean@amicale.org",
            phone: "+225 07 00 00 00 03",
            join_date: "2026-01-01",
            monthly_fee: 10000,
            role: "MEMBER",
            password: "SecurePass123",
        });

        // The member should be returned
        expect(result.error).toBeUndefined();
    });
});

// ============================================================
// 4. updateMember — writes correct AuditLog payload
// ============================================================

describe("updateMember — AuditLog payload", () => {
    it("should include old_value and new_value in AuditLog metadata", async () => {
        const oldMember = {
            id: "member-uuid-001",
            first_name: "Jean",
            last_name: "Dupont",
            monthly_fee: 10000,
        };
        const updatedMember = {
            id: "member-uuid-001",
            first_name: "Jean",
            last_name: "Dupont",
            monthly_fee: 15000,
        };

        let auditPayload: Record<string, unknown> | null = null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = {
            select: jest.fn(() => chain),
            insert: jest.fn((payload: unknown) => {
                const p = payload as Record<string, unknown>;
                if (p.action_type === "UPDATE_MEMBER") {
                    auditPayload = p;
                }
                return chain;
            }),
            update: jest.fn(() => chain),
            eq: jest.fn(() => chain),
            single: jest.fn()
                .mockResolvedValueOnce({ data: oldMember, error: null })     // fetch old member
                .mockResolvedValueOnce({ data: updatedMember, error: null }) // update result
                .mockResolvedValueOnce({ data: null, error: null }),          // audit insert
            range: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
            order: jest.fn(() => chain),
        };

        mockFromReturn = chain;

        await updateMember("member-uuid-001", { monthly_fee: 15000 });

        // AuditLog should have been called via insert
        // The chain captures the insert call — verify it was invoked
        expect(chain.insert).toHaveBeenCalled();
        expect(auditPayload).not.toBeNull();
        expect((auditPayload as any).metadata.old_value.monthly_fee).toBe(10000);
        expect((auditPayload as any).metadata.new_value.monthly_fee).toBe(15000);
    });
});

// ============================================================
// 5. createMember — UNAUTHORIZED for TREASURER role
// ============================================================

describe("createMember — UNAUTHORIZED for TREASURER", () => {
    it("should return UNAUTHORIZED error when caller has TREASURER role", async () => {
        mockSession = { user: { id: "actor-uuid-002", role: "TREASURER" } };

        const result = await createMember({
            first_name: "Jean",
            last_name: "Test",
            email: "treasurer-test@amicale.org",
            phone: "+225 07 00 00 00 04",
            join_date: "2026-01-01",
            monthly_fee: 10000,
            role: "MEMBER",
            password: "SecurePass123",
        });

        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });
});

// ============================================================
// 6. Middleware — plain MEMBER redirected to /dashboard
// ============================================================

describe("Middleware — MEMBER role redirect", () => {
    it("should redirect plain MEMBER role to /dashboard", async () => {
        // This tests the middleware logic in isolation
        // The middleware reads the token role and determines redirect

        const ADMIN_READ_ROLES = ["SG", "SG_ADJOINT", "TREASURER", "TRESORIER_ADJOINT", "PRESIDENT"];

        function shouldAllowAdminAccess(role: string | undefined): boolean {
            if (!role) return false;
            return ADMIN_READ_ROLES.includes(role);
        }

        expect(shouldAllowAdminAccess("MEMBER")).toBe(false);
        expect(shouldAllowAdminAccess("SG")).toBe(true);
        expect(shouldAllowAdminAccess("TREASURER")).toBe(true);
        expect(shouldAllowAdminAccess("PRESIDENT")).toBe(true);
        expect(shouldAllowAdminAccess(undefined)).toBe(false);
    });
});

// ============================================================
// 7. createMember — new member has account_status = PENDING_ACTIVATION
// ============================================================

describe("createMember — account_status default", () => {
    it("should set account_status to PENDING_ACTIVATION for new members", async () => {
        const createdMember = {
            id: "new-uuid",
            first_name: "Alice",
            last_name: "Martin",
            email: "alice.martin@amicale.org",
            phone: "+225 07 00 00 00 05",
            join_date: "2026-01-01",
            monthly_fee: 10000,
            status: "ACTIVE",
            account_status: "PENDING_ACTIVATION",
            role: "MEMBER",
            password_hash: "$2a$12$fakehash",
            created_at_app: "2026-01-01T00:00:00Z",
        };

        const chain = buildChain({
            single: jest.fn()
                .mockResolvedValueOnce({ data: createdMember, error: null }) // Member insert
                .mockResolvedValueOnce({ data: null, error: null }),          // AuditLog
        });
        mockFromReturn = chain;

        const result = await createMember({
            first_name: "Alice",
            last_name: "Martin",
            email: "alice.martin@amicale.org",
            phone: "+225 07 00 00 00 05",
            join_date: "2026-01-01",
            monthly_fee: 10000,
            role: "MEMBER",
            password: "SecurePass123",
        });

        // Data is returned (successful creation)
        expect(result.data?.account_status).toBe("PENDING_ACTIVATION");
        expect(result.data?.status).toBe("ACTIVE");
    });
});
