/**
 * Unit tests for Story 1.3 — Role-Based Authentication.
 *
 * Covers:
 *   - PENDING_ACTIVATION accounts are blocked (AC3)
 *   - INACTIVE accounts are allowed through (AC4)
 *   - Role hierarchy (hasRequiredRole) — PRESIDENT inherits all (AC5)
 *   - Middleware redirection logic (AC1, AC2)
 */

import {
    hashPassword,
    isAccountActive,
    hasRequiredRole,
} from "@/lib/auth/helpers";
import { NextRequest } from "next/server";

// Provide required env vars for route.ts and middleware
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";

import { authOptions, authorizeCredentials as authorize } from "@/app/api/auth/[...nextauth]/route";
import middleware from "@/middleware";
import * as jwt from "next-auth/jwt";

// 1. Mock Supabase Client
const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
};

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: () => mockSupabaseClient,
}));

// 2. Mock next-auth/jwt getToken for middleware
jest.mock("next-auth/jwt", () => ({
    getToken: jest.fn(),
}));

describe("Auth Helpers - Password hashing (Regression)", () => {
    it("should produce a bcrypt hash from a plaintext password", async () => {
        const hash = await hashPassword("Change-Me-Now-2026!");
        expect(hash).toBeDefined();
    });
});

describe("Auth Helpers - Account status check (Regression)", () => {
    it("should return true for ACTIVE account", () => {
        expect(isAccountActive("ACTIVE")).toBe(true);
    });
});

describe("Auth - AC5: Role hierarchy (hasRequiredRole)", () => {
    it("PRESIDENT should have access to SG-only resources", () => {
        expect(hasRequiredRole("PRESIDENT", ["SG"])).toBe(true);
    });
    it("SG_ADJOINT should have access to SG-only resources", () => {
        expect(hasRequiredRole("SG_ADJOINT", ["SG"])).toBe(true);
    });
    it("TRESORIER_ADJOINT should have access to TREASURER-only resources", () => {
        expect(hasRequiredRole("TRESORIER_ADJOINT", ["TREASURER"])).toBe(true);
    });
    it("MEMBER should NOT have access to SG resources", () => {
        expect(hasRequiredRole("MEMBER", ["SG"])).toBe(false);
    });
    // Check our fix
    it("SG and TREASURER should have access to MEMBER resources", () => {
        expect(hasRequiredRole("SG", ["MEMBER"])).toBe(true);
        expect(hasRequiredRole("TREASURER", ["MEMBER"])).toBe(true);
    });
});

describe("NextAuth - authorize callback (AC3 & AC4)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should block a PENDING_ACTIVATION account", async () => {
        mockSupabaseClient.single.mockResolvedValue({
            data: {
                id: "1",
                email: "test@test.com",
                password_hash: "hash",
                account_status: "PENDING_ACTIVATION",
            },
            error: null,
        });

        await expect(
            authorize({ email: "test@test.com", password: "password" })
        ).rejects.toThrow("Invalid email or password");
    });

    it("should allow an INACTIVE account and an ACTIVE account", async () => {
        const hash = await hashPassword("password");

        mockSupabaseClient.single.mockResolvedValue({
            data: {
                id: "2",
                email: "test2@test.com",
                first_name: "John",
                last_name: "Doe",
                role: "MEMBER",
                status: "INACTIVE",
                account_status: "ACTIVE",
                password_hash: hash,
            },
            error: null,
        });

        const user = await authorize({ email: "test2@test.com", password: "password" });
        expect(user).toBeDefined();
        // Since we did not provide req, we just ensure it returns the user object and not null
        expect(user?.status).toBe("INACTIVE");
    });
});

describe("NextAuth - jwt and session callbacks", () => {
    it("should include role and status in the JWT token payload", async () => {
        const token: any = {};
        const user = { id: "123", role: "SG", status: "ACTIVE" };

        const jwtCallback = authOptions.callbacks!.jwt as any;
        const result = await jwtCallback({ token, user });

        expect(result.id).toBe("123");
        expect(result.role).toBe("SG");
        expect(result.status).toBe("ACTIVE");
    });

    it("should expose role and status in session from JWT token", async () => {
        const token = { id: "123", role: "SG", status: "INACTIVE" };
        const session: any = { user: {} };

        const sessionCallback = authOptions.callbacks!.session as any;
        const result = await sessionCallback({ session, token });

        expect(result.user.id).toBe("123");
        expect(result.user.role).toBe("SG");
        expect(result.user.status).toBe("INACTIVE");
    });
});

describe("Middleware - Route protection (AC1, AC2)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("users accessing the root (/) should be redirected to /dashboard", async () => {
        const req = new NextRequest("http://localhost:3000/");
        const res = await middleware(req as any, null as any) as any;

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/dashboard");
    });

    it("unauthenticated user accessing /admin should be redirected to /login", async () => {
        (jwt.getToken as jest.Mock).mockResolvedValue(null);

        const req = new NextRequest("http://localhost:3000/admin/settings");
        const res = await middleware(req as any, null as any) as any;

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login");
    });

    it("MEMBER accessing /admin should be redirected to /dashboard (AC1)", async () => {
        (jwt.getToken as jest.Mock).mockResolvedValue({ role: "MEMBER" });

        const req = new NextRequest("http://localhost:3000/admin/members");
        const res = await middleware(req as any, null as any) as any;

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("SG accessing /admin should be allowed through (AC2)", async () => {
        (jwt.getToken as jest.Mock).mockResolvedValue({ role: "SG" });

        const req = new NextRequest("http://localhost:3000/admin/members");
        const res = await middleware(req as any, null as any) as any;

        // Allowed through uses NextResponse.next() which doesn't redirect
        expect(res.headers.get("location")).toBeNull();
    });

    it("unauthenticated user accessing /dashboard should be redirected to /login", async () => {
        (jwt.getToken as jest.Mock).mockResolvedValue(null);

        const req = new NextRequest("http://localhost:3000/dashboard");
        const res = await middleware(req as any, null as any) as any;

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login");
    });

    it("authenticated user accessing /dashboard should be allowed through", async () => {
        (jwt.getToken as jest.Mock).mockResolvedValue({ role: "MEMBER" });

        const req = new NextRequest("http://localhost:3000/dashboard");
        const res = await middleware(req as any, null as any) as any;

        expect(res.headers.get("location")).toBeNull();
    });
});
