/**
 * Unit tests for the seed script logic
 */

import type { AuditMetadata } from "@/types/database.types";

function validateSeedEnvironment(env: { databaseUrl: string | undefined }): {
    databaseUrl: string;
} {
    if (!env.databaseUrl) {
        throw new Error("Missing DATABASE_URL");
    }
    return { databaseUrl: env.databaseUrl };
}

function buildAuditMetadata(
    _memberId: string,
    email: string,
    role: string
): AuditMetadata {
    return {
        new_value: {
            event: "GS account seeded during system initialization",
            member_email: email,
            member_role: role,
            seeded_at: new Date().toISOString(),
        },
    };
}

function buildGsInsertPayload(passwordHash: string) {
    return {
        first_name: "Admin",
        last_name: "GS",
        email: "gs@amicale-s2a.org",
        phone: "+0000000000",
        join_date: "2016-01-01",
        monthly_fee: 0,
        status: "ACTIVE" as const,
        account_status: "ACTIVE" as const,
        role: "SG" as const,
        password_hash: passwordHash,
    };
}

function buildPresidentInsertPayload(passwordHash: string) {
    return {
        first_name: "Admin",
        last_name: "President",
        email: "president@amicale-s2a.org",
        phone: "+0000000003",
        join_date: "2016-01-01",
        monthly_fee: 0,
        status: "ACTIVE" as const,
        account_status: "ACTIVE" as const,
        role: "PRESIDENT" as const,
        password_hash: passwordHash,
    };
}

describe("Seed Script - Environment validation", () => {
    it("should return databaseUrl when present", () => {
        const result = validateSeedEnvironment({
            databaseUrl: "postgresql://s2a:pass@localhost:5433/s2a",
        });
        expect(result.databaseUrl).toContain("postgresql://");
    });

    it("should throw when DATABASE_URL is missing", () => {
        expect(() =>
            validateSeedEnvironment({ databaseUrl: undefined })
        ).toThrow("Missing DATABASE_URL");
    });
});

describe("Seed Script - admin payloads", () => {
    it("should build a valid GS payload with role SG", () => {
        const payload = buildGsInsertPayload("$2b$12$hashedpassword");
        expect(payload.role).toBe("SG");
        expect(payload.email).toBe("gs@amicale-s2a.org");
        expect(payload.status).toBe("ACTIVE");
        expect(payload.account_status).toBe("ACTIVE");
    });

    it("should build a valid Président payload", () => {
        const payload = buildPresidentInsertPayload("$2b$12$hashedpassword");
        expect(payload.role).toBe("PRESIDENT");
        expect(payload.email).toBe("president@amicale-s2a.org");
    });
});

describe("Seed Script - Audit log metadata", () => {
    it("should include member_email and member_role in new_value", () => {
        const meta = buildAuditMetadata("uuid", "gs@amicale-s2a.org", "SG");
        expect(meta.new_value).toBeDefined();
        expect((meta.new_value as Record<string, unknown>).member_email).toBe(
            "gs@amicale-s2a.org"
        );
        expect((meta.new_value as Record<string, unknown>).member_role).toBe("SG");
    });
});
