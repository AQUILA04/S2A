"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Search, List, CheckCircle2, XCircle, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export function MemberFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentSearch = searchParams.get("search") || "";
    const currentFilter = searchParams.get("filter") || "all";

    const [searchTerm, setSearchTerm] = useState(currentSearch);

    // Debounce search
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchTerm !== currentSearch) {
                updateQuery(searchTerm, currentFilter);
            }
        }, 300);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const updateQuery = useCallback((search: string, filter: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (search) params.set("search", search);
        else params.delete("search");

        if (filter && filter !== "all") params.set("filter", filter);
        else params.delete("filter");

        // Reset to page 1 on filter
        params.set("page", "1");

        router.push(`${pathname}?${params.toString()}`);
    }, [pathname, router, searchParams]);

    return (
        <div className="space-y-4 mb-6 bg-white p-4 rounded-xl border shadow-sm">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par nom, email ou téléphone..."
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:font-normal placeholder:text-muted-foreground/70"
                />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                <FilterChip
                    label="Tous"
                    icon={List}
                    isActive={currentFilter === "all"}
                    onClick={() => updateQuery(searchTerm, "all")}
                />
                <FilterChip
                    label="Actifs"
                    icon={CheckCircle2}
                    isActive={currentFilter === "active"}
                    onClick={() => updateQuery(searchTerm, "active")}
                    activeClass="bg-success/10 text-success border-success/30"
                    iconColor={currentFilter === "active" ? "text-success" : "text-success"}
                />
                <FilterChip
                    label="Inactifs"
                    icon={XCircle}
                    isActive={currentFilter === "inactive"}
                    onClick={() => updateQuery(searchTerm, "inactive")}
                    activeClass="bg-destructive/10 text-destructive border-destructive/30"
                    iconColor={currentFilter === "inactive" ? "text-destructive" : "text-destructive"}
                />
                <button
                    className="ml-auto flex items-center justify-center p-2 rounded-lg border bg-muted/5 text-muted-foreground hover:bg-muted/20 shrink-0"
                    aria-label="Plus de filtres"
                >
                    <Filter className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function FilterChip({ label, icon: Icon, isActive, onClick, activeClass = "bg-[#002366] text-white border-[#002366]", iconColor = "text-muted-foreground" }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all whitespace-nowrap shrink-0",
                isActive ? activeClass : "bg-muted/5 text-muted-foreground/70 hover:bg-muted/10 border-transparent hover:border-border"
            )}
        >
            <Icon className={cn("w-4 h-4", isActive ? "" : iconColor)} />
            {label}
        </button>
    );
}
