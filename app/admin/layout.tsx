import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ============================================================
// Admin Sidebar Nav Items
// ============================================================

const adminNavItems = [
    { href: "/admin/members", label: "Gestion des Membres", icon: "👥" },
];

// ============================================================
// Admin Layout (Task 3)
// Responsive: sidebar on ≥768px, bottom tab-bar on <768px
// ============================================================

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-muted/30">
            {/* === TOP HEADER === */}
            <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
                <div className="flex h-14 items-center justify-between px-4">
                    <span className="text-sm font-bold uppercase tracking-widest text-primary">
                        S2A — Espace Admin
                    </span>
                    {/* Sidebar toggle hint on mobile */}
                    <span className="text-xs text-muted-foreground md:hidden">
                        Admin
                    </span>
                </div>
            </header>

            <div className="flex">
                {/* === SIDEBAR NAV (desktop ≥768px) === */}
                <aside className="hidden w-56 shrink-0 border-r bg-card md:block">
                    <nav className="flex flex-col gap-1 p-4" aria-label="Admin navigation">
                        {adminNavItems.map(({ href, label, icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                    "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                <span aria-hidden="true">{icon}</span>
                                {label}
                            </Link>
                        ))}
                    </nav>
                </aside>

                {/* === MAIN CONTENT === */}
                <main className="flex-1 pb-20 md:pb-6">
                    <div className="mx-auto max-w-5xl px-4 py-6">
                        {children}
                    </div>
                </main>
            </div>

            {/* === BOTTOM TAB-BAR (mobile <768px) === */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden"
                aria-label="Admin mobile navigation"
            >
                <div className="flex h-16 items-center justify-around">
                    {adminNavItems.map(({ href, label, icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className="flex min-w-[44px] flex-col items-center gap-1 px-4 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <span aria-hidden="true" className="text-xl">{icon}</span>
                            <span className="font-medium uppercase tracking-wide">{label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </div>
    );
}
