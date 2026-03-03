import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { MemberRole } from "@/types/database.types";

// ============================================================
// Route Protection Middleware
//
// Protects /admin/* routes. Uses next-auth JWT token to verify
// session and role.
//
// Access levels:
//   MEMBER            → ❌ Redirected to /dashboard
//   SG, SG_ADJOINT    → ✅ Full /admin/* access (Members write via server actions)
//   TREASURER, TRESORIER_ADJOINT → ✅ /admin/* access (Contributions write only)
//   PRESIDENT         → ✅ Full /admin/* access
//
// Write-level enforcement is done inside server actions (actions.ts).
// This middleware only enforces /admin/* route access at the routing level.
//
// NOTE: This middleware will be extended by Story 1.3 (Role-Based Authentication)
// to add finer-grained route protection. Do NOT duplicate session routing logic.
// ============================================================

const ADMIN_READ_ROLES: MemberRole[] = [
    "SG",
    "SG_ADJOINT",
    "TREASURER",
    "TRESORIER_ADJOINT",
    "PRESIDENT",
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only protect /admin/* routes
    if (!pathname.startsWith("/admin")) {
        return NextResponse.next();
    }

    // Retrieve JWT token from cookie (no DB call; reads from signed cookie)
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // No session → redirect to /login
    if (!token) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    const role = token.role as MemberRole | undefined;

    // MEMBER role (or missing role) → redirect to /dashboard
    if (!role || !ADMIN_READ_ROLES.includes(role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Match all /admin/* routes (including nested)
    matcher: ["/admin/:path*"],
};
