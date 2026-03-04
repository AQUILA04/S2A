"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, Users, Wallet, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Global Navigation Items
// ============================================================

const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/admin/members", label: "Members", icon: Users },
    { href: "/finance", label: "Finance", icon: Wallet },
    { href: "/settings", label: "Settings", icon: Settings },
];

export function MainNav() {
    const pathname = usePathname();

    return (
        <>
            {/* === SIDEBAR NAV (desktop ≥768px) === */}
            <aside className="hidden w-56 shrink-0 border-r bg-card md:block h-[calc(100vh-3.5rem)] sticky top-14">
                <nav className="flex flex-col gap-1 p-4" aria-label="Main desktop navigation">
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || pathname.startsWith(`${href}/`);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                <Icon className="h-5 w-5" aria-hidden="true" />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-4 w-full px-4">
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="h-5 w-5" aria-hidden="true" />
                        Déconnexion
                    </button>
                </div>
            </aside>

            {/* === BOTTOM TAB-BAR (mobile <768px) === */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-card md:hidden"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                aria-label="Main mobile navigation"
            >
                <div className="flex h-16 items-center justify-around">
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || pathname.startsWith(`${href}/`);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex min-w-[64px] flex-col items-center gap-1 px-2 py-1 text-[10px] sm:text-xs transition-colors",
                                    isActive
                                        ? "text-primary font-bold"
                                        : "text-muted-foreground hover:text-foreground font-medium"
                                )}
                            >
                                <Icon className={cn("h-6 w-6", isActive ? "stroke-[2.5]" : "stroke-2")} aria-hidden="true" />
                                <span className="uppercase tracking-wide">{label}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex min-w-[64px] flex-col items-center gap-1 px-2 py-1 text-[10px] sm:text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
                    >
                        <LogOut className="h-6 w-6 stroke-2" aria-hidden="true" />
                        <span className="uppercase tracking-wide">Quitter</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
