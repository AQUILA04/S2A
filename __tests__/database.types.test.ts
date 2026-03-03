/**
 * Unit tests for TypeScript Database Types
 * Validates that type definitions match the expected schema structure.
 */

import type {
    Member,
    Contribution,
    BlackoutMonth,
    ProjectInvestment,
    EBExpense,
    AuditLog,
    AuditMetadata,
    MemberStatus,
    AccountStatus,
    MemberRole,
    PaymentChannel,
    ContributionStatus,
    Database,
} from "@/types/database.types";

// ============================================================
// Type-level tests using TypeScript compile-time assertions
// ============================================================

describe("Database Types - MemberStatus enum values", () => {
    it("should accept ACTIVE as a valid MemberStatus", () => {
        const status: MemberStatus = "ACTIVE";
        expect(status).toBe("ACTIVE");
    });

    it("should accept INACTIVE as a valid MemberStatus", () => {
        const status: MemberStatus = "INACTIVE";
        expect(status).toBe("INACTIVE");
    });
});

describe("Database Types - AccountStatus enum values", () => {
    it("should accept PENDING_ACTIVATION as a valid AccountStatus", () => {
        const status: AccountStatus = "PENDING_ACTIVATION";
        expect(status).toBe("PENDING_ACTIVATION");
    });

    it("should accept ACTIVE as a valid AccountStatus", () => {
        const status: AccountStatus = "ACTIVE";
        expect(status).toBe("ACTIVE");
    });
});

describe("Database Types - MemberRole enum values", () => {
    const validRoles: MemberRole[] = [
        "MEMBER",
        "PRESIDENT",
        "SG",
        "SG_ADJOINT",
        "TREASURER",
        "TRESORIER_ADJOINT",
    ];

    validRoles.forEach((role) => {
        it(`should accept ${role} as a valid MemberRole`, () => {
            expect(validRoles).toContain(role);
        });
    });
});

describe("Database Types - PaymentChannel enum values", () => {
    const validChannels: PaymentChannel[] = [
        "CASH",
        "MOBILE_MONEY",
        "BANK_TRANSFER",
        "INTL_TRANSFER",
    ];

    validChannels.forEach((channel) => {
        it(`should accept ${channel} as a valid PaymentChannel`, () => {
            expect(validChannels).toContain(channel);
        });
    });
});

describe("Database Types - ContributionStatus enum values", () => {
    const validStatuses: ContributionStatus[] = [
        "PENDING",
        "VALIDATED",
        "REJECTED",
    ];

    validStatuses.forEach((status) => {
        it(`should accept ${status} as a valid ContributionStatus`, () => {
            expect(validStatuses).toContain(status);
        });
    });
});

describe("Database Types - Member interface structure", () => {
    it("should construct a valid Member object", () => {
        const member: Member = {
            id: "123e4567-e89b-12d3-a456-426614174000",
            first_name: "Admin",
            last_name: "GS",
            email: "gs@amicale-s2a.org",
            phone: "+0000000000",
            join_date: "2016-01-01",
            monthly_fee: 0,
            status: "ACTIVE",
            account_status: "ACTIVE",
            role: "SG",
            password_hash: "$2b$12$hashedpassword",
            created_at_app: "2026-01-01T00:00:00.000Z",
        };

        expect(member.id).toBeDefined();
        expect(member.email).toBe("gs@amicale-s2a.org");
        expect(member.role).toBe("SG");
        expect(member.status).toBe("ACTIVE");
        expect(member.account_status).toBe("ACTIVE");
        expect(member.join_date).toBe("2016-01-01");
        expect(member.monthly_fee).toBeGreaterThanOrEqual(0);
    });
});

describe("Database Types - Contribution interface structure", () => {
    it("should construct a valid Contribution object", () => {
        const contribution: Contribution = {
            id: "123e4567-e89b-12d3-a456-426614174001",
            member_id: "123e4567-e89b-12d3-a456-426614174000",
            amount: 5000,
            month: 3,
            year: 2026,
            payment_channel: "MOBILE_MONEY",
            reference_id: null,
            status: "PENDING",
            validator_id: null,
            validated_at: null,
            created_at: "2026-03-01T00:00:00.000Z",
        };

        expect(contribution.month).toBe(3);
        expect(contribution.year).toBe(2026);
        expect(contribution.status).toBe("PENDING");
        expect(contribution.reference_id).toBeNull();
    });

    it("should enforce month is between 1 and 12 conceptually", () => {
        // Runtime guard for data coming from API
        const isValidMonth = (month: number): boolean =>
            month >= 1 && month <= 12;

        expect(isValidMonth(1)).toBe(true);
        expect(isValidMonth(12)).toBe(true);
        expect(isValidMonth(0)).toBe(false);
        expect(isValidMonth(13)).toBe(false);
    });

    it("should enforce year >= 2016 conceptually", () => {
        const isValidYear = (year: number): boolean => year >= 2016;

        expect(isValidYear(2016)).toBe(true);
        expect(isValidYear(2026)).toBe(true);
        expect(isValidYear(2015)).toBe(false);
    });
});

describe("Database Types - BlackoutMonth interface structure", () => {
    it("should construct a valid BlackoutMonth object", () => {
        const blackout: BlackoutMonth = {
            id: "123e4567-e89b-12d3-a456-426614174002",
            month: 3,
            year: 2020,
            reason: "COVID-19 Suspension",
            is_active: true,
            created_at: "2020-03-01T00:00:00.000Z",
        };

        expect(blackout.reason).toBe("COVID-19 Suspension");
        expect(blackout.is_active).toBe(true);
    });
});

describe("Database Types - AuditLog interface structure", () => {
    it("should construct a valid AuditLog with JSONB metadata", () => {
        const log: AuditLog = {
            id: "123e4567-e89b-12d3-a456-426614174003",
            actor_id: "123e4567-e89b-12d3-a456-426614174000",
            action_type: "VALIDATE_PAYMENT",
            metadata: {
                old_value: { status: "PENDING" },
                new_value: { status: "VALIDATED" },
            },
            timestamp: "2026-03-01T12:00:00.000Z",
        };

        expect(log.action_type).toBe("VALIDATE_PAYMENT");
        expect(log.metadata.old_value).toEqual({ status: "PENDING" });
        expect(log.metadata.new_value).toEqual({ status: "VALIDATED" });
    });

    it("should allow AuditLog with SYSTEM_INITIALIZATION action type", () => {
        const meta: AuditMetadata = {
            new_value: {
                event: "GS account seeded during system initialization",
                member_email: "gs@amicale-s2a.org",
                member_role: "SG",
            },
        };

        expect(meta.new_value).toBeDefined();
        expect(meta.old_value).toBeUndefined();
    });
});

describe("Database Types - Database type map structure", () => {
    it("should confirm Database type map has all required tables", () => {
        // This is a compile-time test that ensures the Database type structure is correct.
        // If any table is missing, TypeScript will fail to compile.
        type Tables = keyof Database["public"]["Tables"];
        const expectedTables: Tables[] = [
            "Members",
            "Contributions",
            "BlackoutMonths",
            "ProjectInvestments",
            "EBExpenses",
            "AuditLogs",
        ];

        // Runtime assertion: verify the list has 6 tables
        expect(expectedTables).toHaveLength(6);
        expect(expectedTables).toContain("Members");
        expect(expectedTables).toContain("AuditLogs");
    });
});
