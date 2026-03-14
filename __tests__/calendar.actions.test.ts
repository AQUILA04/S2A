/**
 * Unit / Integration tests for Calendar Settings Server Actions (Story 2.5)
 */

function buildChain(overrides: Record<string, any> = {}): any {
    const chain: Record<string, any> = {
        select: jest.fn(() => chain),
        insert: jest.fn(() => chain),
        upsert: jest.fn(() => chain),
        update: jest.fn(() => chain),
        delete: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        order: jest.fn(() => chain),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        ...overrides,
    };
    return chain;
}

let mockFromReturn = buildChain();

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(() => ({
        from: jest.fn(() => mockFromReturn),
    })),
}));

let mockSession: { user: { id: string; role: string } } | null = {
    user: { id: "president-uuid-001", role: "PRESIDENT" },
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

import { logAudit } from "@/lib/audit/logger";
import { revalidatePath } from "next/cache";
import { blackoutMonthSchema } from "@/app/admin/settings/calendar/schema";
import { toggleBlackoutMonth, getBlackoutMonthsByYear } from "@/app/admin/settings/calendar/actions";

beforeEach(() => {
    jest.clearAllMocks();
    mockSession = { user: { id: "president-uuid-001", role: "PRESIDENT" } };
    mockFromReturn = buildChain();
});

describe("blackoutMonthSchema — Zod validation", () => {
    it("passes for valid payload (is_active true with reason)", () => {
        expect(blackoutMonthSchema.safeParse({ year: 2024, month: 5, isActive: true, reason: "Covid" }).success).toBe(true);
    });

    it("passes for valid payload (is_active false without reason)", () => {
        expect(blackoutMonthSchema.safeParse({ year: 2024, month: 5, isActive: false }).success).toBe(true);
    });

    it("fails when making active but no reason is provided", () => {
        const res = blackoutMonthSchema.safeParse({ year: 2024, month: 5, isActive: true });
        expect(res.success).toBe(false);
    });
});

describe("toggleBlackoutMonth — RBAC and Logic", () => {
    it("allows PRESIDENT to toggle", async () => {
        const mockReturn = { id: "123", year: 2024, month: 5, is_active: true, reason: "Covid", created_at: "" };
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({ data: mockReturn, error: null })
        });
        mockFromReturn = chain;

        const result = await toggleBlackoutMonth(2024, 5, true, "Covid");
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
    });

    it("rejects TREASURER to toggle", async () => {
        mockSession = { user: { id: "tr", role: "TREASURER" } };
        const result = await toggleBlackoutMonth(2024, 5, true, "Covid");
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });

    it("audits the action when toggling", async () => {
        const mockReturn = { id: "123", year: 2024, month: 5, is_active: true, reason: "Covid", created_at: "" };
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({ data: mockReturn, error: null })
        });
        mockFromReturn = chain;

        await toggleBlackoutMonth(2024, 5, true, "Covid");

        expect(logAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                action_type: "TOGGLE_BLACKOUT_MONTH",
            })
        );
    });

    it("revalidates cache paths", async () => {
        const mockReturn = { id: "123", year: 2024, month: 5, is_active: true, reason: "Covid", created_at: "" };
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({ data: mockReturn, error: null })
        });
        mockFromReturn = chain;

        await toggleBlackoutMonth(2024, 5, true, "Covid");

        expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
        expect(revalidatePath).toHaveBeenCalledWith("/admin/members");
        expect(revalidatePath).toHaveBeenCalledWith("/admin/settings/calendar");
    });
});

describe("getBlackoutMonthsByYear", () => {
    it("fetches data for a specific year", async () => {
        const chain = buildChain({
            order: jest.fn().mockResolvedValue({ data: [], error: null })
        });
        mockFromReturn = chain;

        const result = await getBlackoutMonthsByYear(2024);
        expect(result.error).toBeUndefined();
    });
});
