import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { MemberRole } from "@/types/database.types";
import { hasRequiredRole } from "@/lib/auth/helpers";

const ADMIN_READ_ROLES: MemberRole[] = [
    "SG",
    "SG_ADJOINT",
    "TREASURER",
    "TRESORIER_ADJOINT",
    "PRESIDENT",
];

const SETUP_PASSWORD_PATH = "/auth/setup-password";

export default withAuth(
    function middleware(request) {
        const { pathname } = request.nextUrl;
        const token = request.nextauth.token;
        const mustChange = Boolean(token?.mustChangePassword);

        // Force password change before any other authenticated page
        if (token && mustChange && pathname !== SETUP_PASSWORD_PATH) {
            return NextResponse.redirect(new URL(SETUP_PASSWORD_PATH, request.url));
        }

        if (token && !mustChange && pathname === SETUP_PASSWORD_PATH) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // / root route: redirect to /dashboard (or setup-password via rule above)
        if (pathname === "/") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // /login route: redirect logged-in users
        if (pathname === "/login") {
            if (token) {
                const dest = mustChange ? SETUP_PASSWORD_PATH : "/dashboard";
                return NextResponse.redirect(new URL(dest, request.url));
            }
            return NextResponse.next();
        }

        // /activate route: public account setup (OTP then password)
        if (pathname === "/activate") {
            if (token) {
                const dest = mustChange ? SETUP_PASSWORD_PATH : "/dashboard";
                return NextResponse.redirect(new URL(dest, request.url));
            }
            return NextResponse.next();
        }

        if (pathname === SETUP_PASSWORD_PATH) {
            return NextResponse.next();
        }

        // /admin/* route protection (AC2: prevent unauthorized access)
        if (pathname.startsWith("/admin")) {
            const role = token?.role as MemberRole | undefined;

            // MEMBER role (or missing role) → redirect to /dashboard (AC1)
            if (!role || !hasRequiredRole(role, ADMIN_READ_ROLES)) {
                return NextResponse.redirect(new URL("/dashboard", request.url));
            }

            return NextResponse.next();
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;
                if (pathname === "/login" || pathname === "/activate") {
                    return true;
                }
                // All other matched routes require a session
                return !!token;
            },
        },
        pages: {
            signIn: "/login",
        },
        secret: process.env.NEXTAUTH_SECRET,
    }
);

export const config = {
    matcher: [
        "/",
        "/login",
        "/activate",
        "/auth/setup-password",
        "/dashboard/:path*",
        "/admin/:path*",
    ],
};
