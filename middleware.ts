import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { MemberRole } from "@/types/database.types";
import { hasRequiredRole } from "@/lib/auth/helpers";

// ============================================================
// Route Protection Middleware (Story 1.3 — AC1, AC2, AC5)
//
// Route access matrix:
//   No session           → /login    (for all protected routes)
//   MEMBER               → /dashboard (redirected away from /admin/*)
//   SG, SG_ADJOINT       → /admin/* ✅  (Members & GA write via server actions)
//   TREASURER, TRESORIER_ADJOINT → /admin/* ✅ (Contributions write via server actions)
//   PRESIDENT            → /admin/* ✅  (all rights via role hierarchy)
//
// Fine-grained write-level enforcement is done inside server actions (actions.ts).
// This middleware enforces route-level access only.
//
// Role hierarchy is enforced via hasRequiredRole() from lib/auth/helpers.ts.
// ============================================================

/** Roles that may access /admin/* routes. MEMBER is explicitly excluded. */
const ADMIN_READ_ROLES: MemberRole[] = [
    "SG",
    "SG_ADJOINT",
    "TREASURER",
    "TRESORIER_ADJOINT",
    "PRESIDENT",
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Retrieve JWT token without making a DB call (reads signed cookie)
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // ──────────────────────────────────────────────────────────────
    // / root route: redirect to /dashboard
    // ──────────────────────────────────────────────────────────────
    if (pathname === "/") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // ──────────────────────────────────────────────────────────────
    // /admin/* route protection (AC2: prevent unauthorized access)
    // ──────────────────────────────────────────────────────────────
    if (pathname.startsWith("/admin")) {
        // No session → redirect to /login
        if (!token) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }

        const role = token.role as MemberRole | undefined;

        // MEMBER role (or missing role) → redirect to /dashboard (AC1)
        // Uses hasRequiredRole to enforce the full hierarchy (AC5)
        if (!role || !hasRequiredRole(role, ADMIN_READ_ROLES)) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        return NextResponse.next();
    }

    // ──────────────────────────────────────────────────────────────
    // /dashboard route: authenticated users only (AC1)
    // ──────────────────────────────────────────────────────────────
    if (pathname.startsWith("/dashboard")) {
        if (!token) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    // Match /, /admin/* and /dashboard/* routes (including nested)
    matcher: ["/", "/admin/:path*", "/dashboard/:path*"],
};
