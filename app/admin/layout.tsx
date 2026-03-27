import * as React from "react";
import { MainNav } from "@/components/s2a/main-nav";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasRequiredRole } from "@/lib/auth/helpers";
import type { MemberRole } from "@/types/database.types";

// ============================================================
// Admin Layout (Task 3 / Global UI Refinement)
// Responsive: MainNav handles sidebar vs bottom tab-bar
// ============================================================

const ADMIN_READ_ROLES: MemberRole[] = [
    "SG",
    "SG_ADJOINT",
    "TREASURER",
    "TRESORIER_ADJOINT",
    "PRESIDENT",
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role as MemberRole | undefined;

    if (!session) {
        redirect("/login");
    }

    if (!role || !hasRequiredRole(role, ADMIN_READ_ROLES)) {
        redirect("/dashboard");
    }

    return (
        <>
            <div className="min-h-screen bg-muted/30">
                {/* === TOP HEADER === */}
                <header className="sticky top-0 z-40 border-b bg-card shadow-sm h-14 flex items-center px-4">
                    <span className="text-sm font-bold uppercase tracking-widest text-primary">
                        S2A — Espace Admin
                    </span>
                </header>

                <div className="flex">
                    {/* Desktop Sidebar part of MainNav (hidden on mobile) */}
                    <div className="hidden md:block">
                        <MainNav />
                    </div>

                    {/* === MAIN CONTENT === */}
                    <main className="flex-1 pb-20 md:pb-6">
                        <div className="mx-auto max-w-5xl px-4 py-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>

            {/* Mobile Bottom Bar part of MainNav (hidden on desktop) */}
            {/* Mounted at the root of the layout to avoid any overflow/layout stacking clipping */}
            <div className="md:hidden">
                <MainNav />
            </div>
        </>
    );
}
