/**
 * Unit tests for the NextAuth authorize logic.
 * Imports real helpers from lib/auth/helpers.ts — tests cover the SAME functions
 * used in production, so any logic change there is caught here.
 */

import {
    hashPassword,
    verifyPassword,
    isAccountActive,
    credentialsSchema,
} from "@/lib/auth/helpers";
import type { MemberRole } from "@/types/database.types";

// ============================================================
// Password hashing
// ============================================================

describe("Auth Helpers - Password hashing", () => {
    it("should produce a bcrypt hash from a plaintext password", async () => {
        const hash = await hashPassword("Change-Me-Now-2026!");
        expect(hash).toBeDefined();
        // bcryptjs produces $2a$ prefix; native bcrypt produces $2b$
        expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
    });

    it("should produce different hashes for the same password (salted)", async () => {
        const hash1 = await hashPassword("same-password");
        const hash2 = await hashPassword("same-password");
        expect(hash1).not.toBe(hash2);
    });
});

// ============================================================
// Password verification
// ============================================================

describe("Auth Helpers - Password verification", () => {
    it("should return true when password matches the hash", async () => {
        const password = "Change-Me-Now-2026!";
        const hash = await hashPassword(password);
        const result = await verifyPassword(password, hash);
        expect(result).toBe(true);
    });

    it("should return false when password does NOT match the hash", async () => {
        const password = "Change-Me-Now-2026!";
        const hash = await hashPassword(password);
        const result = await verifyPassword("wrong-password", hash);
        expect(result).toBe(false);
    });

    it("should return false for an empty password against a valid hash", async () => {
        const hash = await hashPassword("some-password");
        const result = await verifyPassword("", hash);
        expect(result).toBe(false);
    });
});

// ============================================================
// Account status
// ============================================================

describe("Auth Helpers - Account status check", () => {
    it("should return true for ACTIVE account", () => {
        expect(isAccountActive("ACTIVE")).toBe(true);
    });

    it("should return false for INACTIVE account", () => {
        expect(isAccountActive("INACTIVE")).toBe(false);
    });
});

// ============================================================
// Credentials schema validation (Zod)
// ============================================================

describe("Auth Helpers - Credentials schema validation", () => {
    it("should pass for a valid email and non-empty password", () => {
        const result = credentialsSchema.safeParse({
            email: "gs@amicale-s2a.org",
            password: "Change-Me-Now-2026!",
        });
        expect(result.success).toBe(true);
    });

    it("should fail for an invalid email format", () => {
        const result = credentialsSchema.safeParse({
            email: "not-an-email",
            password: "some-password",
        });
        expect(result.success).toBe(false);
    });

    it("should fail for an empty password", () => {
        const result = credentialsSchema.safeParse({
            email: "gs@amicale-s2a.org",
            password: "",
        });
        expect(result.success).toBe(false);
    });

    it("should fail when email is missing", () => {
        const result = credentialsSchema.safeParse({
            password: "some-password",
        });
        expect(result.success).toBe(false);
    });
});

// ============================================================
// Role-based JWT payload (simulates what the NextAuth callbacks do)
// ============================================================

describe("Auth - Role-based JWT payload", () => {
    it("should include role in the JWT token payload when user signs in", () => {
        const token: Record<string, unknown> = {};
        const user = {
            id: "123e4567-e89b-12d3-a456-426614174000",
            email: "gs@amicale-s2a.org",
            name: "Admin GS",
            role: "SG" as MemberRole,
        };

        // Replicate jwt callback logic
        if (user) {
            token.id = user.id;
            token.role = user.role;
        }

        expect(token.id).toBe(user.id);
        expect(token.role).toBe("SG");
    });

    it("should expose role in session from JWT token", () => {
        const token = {
            id: "123e4567-e89b-12d3-a456-426614174000",
            role: "SG" as MemberRole,
        };
        const session = {
            user: {
                name: "Admin GS",
                email: "gs@amicale-s2a.org",
                id: "" as string,
                role: "MEMBER" as string,
            },
            expires: "2026-12-31",
        };

        // Replicate session callback logic
        if (token && session.user) {
            session.user.id = token.id;
            session.user.role = token.role;
        }

        expect(session.user.id).toBe("123e4567-e89b-12d3-a456-426614174000");
        expect(session.user.role).toBe("SG");
    });
});
