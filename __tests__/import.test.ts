/**
 * Unit & Integration Tests for Story 1.4: Legacy Data Import Tool
 *
 * Covers:
 *  - Task 1: Zod schema validation in the parser
 *  - Task 2: Server action RBAC (TREASURER/PRESIDENT only)
 *  - Task 2: Duplicate prevention logic
 *  - Task 4: Full test requirements per story acceptance criteria
 */

// ============================================================
// *** PART 1: Parser / Zod schema unit tests (no mocks)
// ============================================================

import { legacyRowSchema, parseLegacyFile, MONTH_INDEX } from "@/lib/import/parser";
import * as XLSX from "xlsx";

describe("legacyRowSchema — Zod validation", () => {
    const validRow = {
        noms: "Jean Dupont",
        "téléphone": "+22507000001",
        janvier: "5000",
        fevrier: "",
        mars: 0,
        avril: "10000",
        mai: "",
        juin: "",
        juillet: "",
        aout: "",
        septembre: "",
        octobre: "",
        novembre: "",
        decembre: "",
        annee: "2022",
    };

    it("should pass for a valid row with mixed string/number amounts", () => {
        const result = legacyRowSchema.safeParse(validRow);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.janvier).toBe(5000);
            expect(result.data.fevrier).toBe(0);
            expect(result.data.avril).toBe(10000);
            expect(result.data.annee).toBe(2022);
        }
    });

    it("should fail when noms is empty", () => {
        const result = legacyRowSchema.safeParse({ ...validRow, noms: "" });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.errors.map((e) => e.path.join("."));
            expect(paths).toContain("noms");
        }
    });

    it("should fail when téléphone is empty", () => {
        const result = legacyRowSchema.safeParse({ ...validRow, "téléphone": "" });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.errors.map((e) => e.path.join("."));
            expect(paths).toContain("téléphone");
        }
    });

    it("should fail when annee is before 2016", () => {
        const result = legacyRowSchema.safeParse({ ...validRow, annee: "2015" });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.errors.map((e) => e.path.join("."));
            expect(paths).toContain("annee");
        }
    });

    it("should coerce invalid amount strings to 0", () => {
        const result = legacyRowSchema.safeParse({ ...validRow, janvier: "INVALID" });
        expect(result.success).toBe(true);
        if (result.success) {
            // Non-numeric string should become 0
            expect(result.data.janvier).toBe(0);
        }
    });

    it("should accept null/undefined amounts as 0", () => {
        const result = legacyRowSchema.safeParse({ ...validRow, mars: null, avril: undefined });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.mars).toBe(0);
            expect(result.data.avril).toBe(0);
        }
    });

    it("should coerce numeric phone to string", () => {
        const result = legacyRowSchema.safeParse({ ...validRow, "téléphone": 22507000001 });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(typeof result.data.téléphone).toBe("string");
        }
    });
});

// ============================================================
// MONTH_INDEX sanity check
// ============================================================

describe("MONTH_INDEX constants", () => {
    it("should have janvier=1 and decembre=12", () => {
        expect(MONTH_INDEX["janvier"]).toBe(1);
        expect(MONTH_INDEX["decembre"]).toBe(12);
    });

    it("should have 12 entries", () => {
        expect(Object.keys(MONTH_INDEX).length).toBe(12);
    });
});

// ============================================================
// parseLegacyFile — integration test using real XLSX data
// ============================================================

describe("parseLegacyFile — Excel/CSV parsing", () => {
    /**
     * Builds a minimal XLSX Buffer from an array of row objects.
     */
    function buildXlsxBuffer(rows: object[]): Buffer {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    }

    it("should parse a valid row and generate 2 contributions (for 2 paid months)", () => {
        const rows = [
            {
                noms: "Alice Martin",
                "téléphone": "+22507000002",
                janvier: 5000,
                fevrier: 5000,
                mars: 0,
                avril: 0,
                mai: 0,
                juin: 0,
                juillet: 0,
                aout: 0,
                septembre: 0,
                octobre: 0,
                novembre: 0,
                decembre: 0,
                annee: 2022,
            },
        ];

        const buf = buildXlsxBuffer(rows);
        const result = parseLegacyFile(buf, "test.xlsx", "CASH");

        expect(result.totalRows).toBe(1);
        expect(result.validRows).toBe(1);
        expect(result.errorRows).toBe(0);
        expect(result.totalContributions).toBe(2);

        const row = result.rows[0];
        expect(row.isValid).toBe(true);
        expect(row.contributions).toHaveLength(2);
        expect(row.contributions[0].month).toBe(1); // janvier
        expect(row.contributions[1].month).toBe(2); // fevrier
        expect(row.contributions[0].year).toBe(2022);
        expect(row.contributions[0].payment_channel).toBe("CASH");
    });

    it("should mark a row as invalid when noms is missing", () => {
        const rows = [
            {
                noms: "",
                "téléphone": "+22507000003",
                janvier: 5000,
                fevrier: 0,
                mars: 0,
                avril: 0,
                mai: 0,
                juin: 0,
                juillet: 0,
                aout: 0,
                septembre: 0,
                octobre: 0,
                novembre: 0,
                decembre: 0,
                annee: 2022,
            },
        ];

        const buf = buildXlsxBuffer(rows);
        const result = parseLegacyFile(buf, "test.xlsx");

        expect(result.errorRows).toBe(1);
        expect(result.rows[0].isValid).toBe(false);
        expect(result.rows[0].errors.length).toBeGreaterThan(0);
    });

    it("should return 0 contributions for a row where all months are 0", () => {
        const rows = [
            {
                noms: "Bob Doe",
                "téléphone": "+22507000004",
                janvier: 0, fevrier: 0, mars: 0, avril: 0,
                mai: 0, juin: 0, juillet: 0, aout: 0,
                septembre: 0, octobre: 0, novembre: 0, decembre: 0,
                annee: 2020,
            },
        ];

        const buf = buildXlsxBuffer(rows);
        const result = parseLegacyFile(buf, "data.xlsx");

        expect(result.validRows).toBe(1);
        expect(result.rows[0].contributions).toHaveLength(0);
        expect(result.totalContributions).toBe(0);
    });

    it("should handle multiple rows, mixing valid and invalid", () => {
        const rows = [
            {
                noms: "Valid Person",
                "téléphone": "+22507000005",
                janvier: 5000, fevrier: 0, mars: 0, avril: 0,
                mai: 0, juin: 0, juillet: 0, aout: 0,
                septembre: 0, octobre: 0, novembre: 0, decembre: 0,
                annee: 2021,
            },
            {
                noms: "",
                "téléphone": "+22507000006",
                janvier: 5000, fevrier: 0, mars: 0, avril: 0,
                mai: 0, juin: 0, juillet: 0, aout: 0,
                septembre: 0, octobre: 0, novembre: 0, decembre: 0,
                annee: 2021,
            },
        ];

        const buf = buildXlsxBuffer(rows);
        const result = parseLegacyFile(buf, "data.xlsx");

        expect(result.totalRows).toBe(2);
        expect(result.validRows).toBe(1);
        expect(result.errorRows).toBe(1);
    });

    it("should apply defaultChannel to all contributions", () => {
        const rows = [
            {
                noms: "Channel Test",
                "téléphone": "+22507000007",
                janvier: 5000, fevrier: 0, mars: 0, avril: 0,
                mai: 0, juin: 0, juillet: 0, aout: 0,
                septembre: 0, octobre: 0, novembre: 0, decembre: 0,
                annee: 2022,
            },
        ];

        const buf = buildXlsxBuffer(rows);
        const result = parseLegacyFile(buf, "data.xlsx", "MOBILE_MONEY");

        expect(result.rows[0].contributions[0].payment_channel).toBe("MOBILE_MONEY");
    });
});

// ============================================================
// *** PART 2: Server Action — RBAC and duplicate test
// ============================================================

// Mock Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockFromReturn: any = null;
function buildChain(overrides: Record<string, unknown> = {}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
        select: jest.fn(() => chain),
        insert: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        in: jest.fn(() => chain),
        then: jest.fn((resolve) => resolve({ data: [], error: null })),
        ...overrides,
    };
    return chain;
}

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(() => ({
        from: jest.fn(() => mockFromReturn),
    })),
}));

// Mock session
let mockSession: { user: { id: string; role: string } } | null = {
    user: { id: "treasurer-uuid-001", role: "TREASURER" },
};

jest.mock("next-auth", () => ({
    getServerSession: jest.fn(() => Promise.resolve(mockSession)),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
    authOptions: {},
}));

import { confirmImport } from "@/app/admin/import/actions";
import type { ParsedContribution } from "@/lib/import/parser";

beforeEach(() => {
    jest.clearAllMocks();
    mockSession = { user: { id: "treasurer-uuid-001", role: "TREASURER" } };
    mockFromReturn = buildChain();
});

describe("confirmImport — RBAC enforcement", () => {
    it("should return UNAUTHORIZED error when caller is a plain MEMBER", async () => {
        mockSession = { user: { id: "member-uuid-001", role: "MEMBER" } };

        const result = await confirmImport([]);
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });

    it("should return UNAUTHORIZED error when caller is SG (not TREASURER/PRESIDENT)", async () => {
        mockSession = { user: { id: "sg-uuid-001", role: "SG" } };

        const result = await confirmImport([]);
        expect(result.error).toMatch(/UNAUTHORIZED/i);
    });

    it("should allow PRESIDENT role", async () => {
        mockSession = { user: { id: "president-uuid-001", role: "PRESIDENT" } };

        // Empty toInsert → returns 0 with no error
        const result = await confirmImport([]);
        expect(result.error).toBeUndefined();
        expect(result.data?.inserted).toBe(0);
    });

    it("should allow TREASURER role", async () => {
        mockSession = { user: { id: "treasurer-uuid-001", role: "TREASURER" } };

        const result = await confirmImport([]);
        expect(result.error).toBeUndefined();
        expect(result.data?.inserted).toBe(0);
    });
});

describe("confirmImport — duplicate prevention", () => {
    it("should skip contributions that already exist in the database", async () => {
        // Existing contribution: member-001 / month 1 / year 2022
        mockFromReturn = buildChain({
            then: jest.fn((resolve) =>
                resolve({
                    data: [{ member_id: "member-001", month: 1, year: 2022 }],
                    error: null,
                })
            ),
        });

        const toInsert: Array<ParsedContribution & { member_id: string }> = [
            {
                phone: "+22507000001",
                memberName: "Jean Dupont",
                month: 1,
                year: 2022,
                amount: 5000,
                payment_channel: "CASH",
                member_id: "member-001",
            },
        ];

        const result = await confirmImport(toInsert);
        // The contribution already exists — should be skipped, 0 inserted
        expect(result.data?.inserted).toBe(0);
        expect(result.data?.duplicatesSkipped).toBe(1);
    });

    it("should not insert the same (member_id, month, year) twice within the same file", async () => {
        // No existing contributions in DB
        mockFromReturn = buildChain({
            then: jest.fn((resolve) => resolve({ data: [], error: null })),
        });

        // Two identical contributions from the same file
        const toInsert: Array<ParsedContribution & { member_id: string }> = [
            {
                phone: "+22507000001",
                memberName: "Jean Dupont",
                month: 1,
                year: 2022,
                amount: 5000,
                payment_channel: "CASH",
                member_id: "member-001",
            },
            {
                // Exact duplicate of above — should be skipped
                phone: "+22507000001",
                memberName: "Jean Dupont",
                month: 1,
                year: 2022,
                amount: 5000,
                payment_channel: "CASH",
                member_id: "member-001",
            },
        ];

        // Supabase insert mock (just return inserted count)
        const insertChain = buildChain({
            then: jest.fn((resolve) => resolve({ data: [], error: null })),
        });
        insertChain.insert = jest.fn(() => ({
            select: jest.fn(() =>
                Promise.resolve({
                    data: [{ id: "new-contribution-uuid" }],
                    error: null,
                })
            ),
        }));
        mockFromReturn = insertChain;

        const result = await confirmImport(toInsert);
        // 1 inserted, 1 duplicate within the file
        expect(result.data?.duplicatesSkipped).toBe(1);
    });
});

describe("confirmImport — sets status to VALIDATED", () => {
    it("should set status=VALIDATED and validator_id on each inserted contribution", async () => {
        const capturedBatches: unknown[] = [];

        const chain = buildChain({
            then: jest.fn((resolve) => resolve({ data: [], error: null })),
        });
        chain.insert = jest.fn((batch: unknown) => {
            capturedBatches.push(batch);
            return {
                select: jest.fn(() =>
                    Promise.resolve({
                        data: [{ id: "contrib-uuid-001" }],
                        error: null,
                    })
                ),
            };
        });
        mockFromReturn = chain;
        mockSession = { user: { id: "treasurer-uuid-001", role: "TREASURER" } };

        const toInsert: Array<ParsedContribution & { member_id: string }> = [
            {
                phone: "+22507000002",
                memberName: "Alice Martin",
                month: 3,
                year: 2022,
                amount: 10000,
                payment_channel: "MOBILE_MONEY",
                member_id: "member-002",
            },
        ];

        await confirmImport(toInsert);

        expect(capturedBatches.length).toBeGreaterThan(0);
        // First batch insert call is the Contributions insert
        const firstBatch = capturedBatches[0] as Array<Record<string, unknown>>;
        if (Array.isArray(firstBatch) && firstBatch.length > 0) {
            expect(firstBatch[0].status).toBe("VALIDATED");
            expect(firstBatch[0].validator_id).toBe("treasurer-uuid-001");
            expect(firstBatch[0].validated_at).toBeDefined();
        }
    });
});
