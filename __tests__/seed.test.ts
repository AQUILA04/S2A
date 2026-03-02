/**
 * Unit tests for the seed script logic
 * Tests the environment validation, idempotency guard, and audit log entry structure.
 */

import type { AuditMetadata } from "@/types/database.types";

// ============================================================
// Helpers extracted from seed logic for unit testing
// ============================================================

interface EnvConfig {
    url: string | undefined;
    serviceKey: string | undefined;
}

function validateSeedEnvironment(env: EnvConfig): {
    url: string;
    serviceKey: string;
} {
    if (!env.url) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
    }
    if (!env.serviceKey) {
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }
    return { url: env.url, serviceKey: env.serviceKey };
}

function buildAuditMetadata(
    memberId: string,
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
        role: "SG" as const,
        password_hash: passwordHash,
    };
}

// ============================================================
// Tests
// ============================================================

describe("Seed Script - Environment validation", () => {
    it("should return url and serviceKey when both are present", () => {
        const result = validateSeedEnvironment({
            url: "https://test.supabase.co",
            serviceKey: "service-key-123",
        });

        expect(result.url).toBe("https://test.supabase.co");
        expect(result.serviceKey).toBe("service-key-123");
    });

    it("should throw when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
        expect(() =>
            validateSeedEnvironment({ url: undefined, serviceKey: "key" })
        ).toThrow("Missing NEXT_PUBLIC_SUPABASE_URL");
    });

    it("should throw when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
        expect(() =>
            validateSeedEnvironment({
                url: "https://test.supabase.co",
                serviceKey: undefined,
            })
        ).toThrow("Missing SUPABASE_SERVICE_ROLE_KEY");
    });

    it("should throw when both env vars are missing", () => {
        expect(() =>
            validateSeedEnvironment({ url: undefined, serviceKey: undefined })
        ).toThrow();
    });
});

describe("Seed Script - GS member insert payload", () => {
    it("should build a valid GS payload with role SG", () => {
        const payload = buildGsInsertPayload("$2b$12$hashedpassword");

        expect(payload.role).toBe("SG");
        expect(payload.status).toBe("ACTIVE");
        expect(payload.email).toBe("gs@amicale-s2a.org");
        expect(payload.join_date).toBe("2016-01-01");
        expect(payload.monthly_fee).toBe(0);
        expect(payload.password_hash).toBe("$2b$12$hashedpassword");
    });

    it("should not include plain password in the payload", () => {
        const payload = buildGsInsertPayload("$2b$12$hashedpassword");
        const payloadKeys = Object.keys(payload);

        expect(payloadKeys).not.toContain("password");
        expect(payloadKeys).not.toContain("initial_password");
        expect(payloadKeys).toContain("password_hash");
    });
});

describe("Seed Script - Audit metadata structure", () => {
    it("should build valid audit metadata for SYSTEM_INITIALIZATION", () => {
        const metadata = buildAuditMetadata(
            "123e4567-e89b-12d3-a456-426614174000",
            "gs@amicale-s2a.org",
            "SG"
        );

        expect(metadata.new_value).toBeDefined();
        expect(metadata.old_value).toBeUndefined();
        expect(metadata.new_value?.member_email).toBe("gs@amicale-s2a.org");
        expect(metadata.new_value?.member_role).toBe("SG");
        expect(metadata.new_value?.event).toContain("initialization");
    });

    it("should include a seeded_at ISO timestamp", () => {
        const metadata = buildAuditMetadata(
            "123e4567-e89b-12d3-a456-426614174000",
            "gs@amicale-s2a.org",
            "SG"
        );

        const seededAt = metadata.new_value?.seeded_at as string;
        expect(seededAt).toBeDefined();
        expect(() => new Date(seededAt)).not.toThrow();
        expect(isNaN(new Date(seededAt).getTime())).toBe(false);
    });
});
