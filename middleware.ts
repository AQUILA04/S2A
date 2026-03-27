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

export default withAuth(
    function middleware(request) {
        const { pathname } = request.nextUrl;
        const token = request.nextauth.token;

        // / root route: redirect to /dashboard
        if (pathname === "/") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // /login route: redirect logged-in users to /dashboard
        if (pathname === "/login") {
            if (token) {
                return NextResponse.redirect(new URL("/dashboard", request.url));
            }
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
            // This callback determines if the middleware function is even called
            // Returning false will redirect to the sign-in page
            authorized: ({ req, token }) => {
                const { pathname } = req.nextUrl;
                if (pathname === "/login") {
                    // #region agent log
                    fetch("http://127.0.0.1:7244/ingest/7d8a4cfb-3119-40e9-9e80-feacfcc42c79", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            runId: "pre-fix",
                            hypothesisId: "H13",
                            location: "middleware.ts:callbacks:authorized",
                            message: "Middleware token check for login/admin route",
                            data: {
                                pathname,
                                hasToken: Boolean(token),
                                tokenRole: token?.role ?? null,
                            },
                            timestamp: Date.now(),
                        }),
                    }).catch(() => {});
                    // #endregion
                }

                // Let other routes (like / or /login) pass through to the middleware function
                return true;
            },
        },
        pages: {
            signIn: "/login",
        },
        secret: process.env.NEXTAUTH_SECRET,
    }
);

export const config = {
    // Match / and /login routes.
    // /admin is protected server-side in admin layout/actions.
    matcher: ["/", "/login"],
};
