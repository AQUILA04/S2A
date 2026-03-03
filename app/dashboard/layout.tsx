import * as React from "react";
import { MainNav } from "@/components/s2a/main-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div className="min-h-screen bg-muted/30">
                {/* === TOP HEADER === */}
                <header className="sticky top-0 z-40 border-b bg-card shadow-sm h-14 flex items-center px-4">
                    <span className="text-sm font-bold uppercase tracking-widest text-primary">
                        Amicale S2A
                    </span>
                </header>

                <div className="flex">
                    {/* Desktop Sidebar part of MainNav (hidden on mobile) */}
                    <div className="hidden md:block">
                        <MainNav />
                    </div>

                    {/* === MAIN CONTENT === */}
                    <main className="flex-1 pb-20 md:pb-6">
                        <div className="mx-auto max-w-5xl">
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
