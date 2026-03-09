import Link from "next/link";
import { getMembers } from "@/app/admin/members/actions";
import { AssociationStatusBadge, AccountStatusBadge } from "@/components/s2a/status-badge";
import { MemberFilters } from "@/components/s2a/member-filters";
import { UserPlus, ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { RecordPaymentDialog } from "@/app/admin/members/components/record-payment-dialog";

// Force dynamic to avoid caching stale member data
export const dynamic = "force-dynamic";

interface MembersPageProps {
    searchParams: Promise<{ page?: string; search?: string; filter?: string }>;
}

/**
 * /admin/members — Member list (Server Component)
 * Responsive: Cards on mobile (< sm), Table on desktop (>= sm)
 */
export default async function MembersPage({ searchParams }: MembersPageProps) {
    const params = await searchParams;
    const page = Math.max(1, Number(params?.page) || 1);
    const search = params?.search || "";
    const filter = params?.filter || "";

    const result = await getMembers(page, search, filter);

    if (result.error) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive m-4">
                <p className="font-semibold">Erreur lors du chargement des membres</p>
                <p className="text-sm mt-1">{result.error}</p>
            </div>
        );
    }

    const { members, totalCount, totalPages } = result.data!;

    return (
        <div className="flex flex-col min-h-full">
            {/* Page header */}
            <div className="px-4 py-6 bg-white border-b">
                <h1 className="text-2xl font-bold text-[#001030]">Registre des Membres</h1>
                <p className="text-sm text-muted-foreground mt-1 mb-5">
                    Gérez les adhésions et les informations de l'amicale.
                </p>

                <Link href="/admin/members/new" className="w-full">
                    <button className="w-full bg-[#002366] text-white rounded-lg py-3 flex items-center justify-center font-semibold text-sm shadow-sm hover:bg-[#002366]/90 transition-colors">
                        <UserPlus className="w-5 h-5 mr-2" />
                        Ajouter un membre
                    </button>
                </Link>
            </div>

            <div className="p-4 flex-1">
                {/* Search & Filters Component */}
                <MemberFilters />

                {/* Members List (Mobile) & Table (Desktop) container */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden text-sm">
                    {/* Desktop Headers */}
                    <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <div className="col-span-4">Membre</div>
                        <div className="col-span-5">Email</div>
                        <div className="col-span-3 text-right">Statut</div>
                    </div>

                    {members.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            Aucun membre trouvé
                        </div>
                    ) : (
                        <div className="divide-y">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-4 px-4 py-4 sm:py-3 transition-colors hover:bg-muted/30 sm:items-center relative group"
                                >
                                    <Link
                                        href={`/admin/members/${member.id}`}
                                        className="absolute inset-0 z-0"
                                        aria-label={`View ${member.first_name} ${member.last_name}`}
                                    />

                                    {/* Membre (Avatar + Name + ID) */}
                                    <div className="flex items-center gap-3 sm:col-span-4 z-10 pointer-events-none">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden text-[#002366] border border-border">
                                            {/* Fallback avatar */}
                                            <UserRound className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-[#001030] text-base sm:text-sm truncate">
                                                {member.first_name} {member.last_name}
                                            </span>
                                            <span className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">
                                                ID: {member.id.substring(0, 8)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Email (Right aligned on mobile, normal column on PC) */}
                                    <div className="mt-3 sm:mt-0 sm:col-span-5 flex items-center sm:justify-start justify-end z-10 pointer-events-none">
                                        <span className="text-muted-foreground truncate">{member.email}</span>
                                    </div>

                                    {/* Statut (hidden on mobile mockup, but let's show on PC) */}
                                    <div className="hidden sm:flex sm:col-span-3 items-center justify-end gap-2 z-10">
                                        <AssociationStatusBadge status={member.status} />
                                        <RecordPaymentDialog
                                            memberId={member.id}
                                            memberName={`${member.first_name} ${member.last_name}`}
                                            memberMonthlyFee={member.monthly_fee}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination (Mockup Style) */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        Affichage de <span className="font-bold text-[#001030]">{members.length}</span> sur <span className="font-bold text-[#001030]">{totalCount}</span> membres
                    </p>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            {/* Prev */}
                            <Link
                                href={page > 1 ? `/admin/members?page=${page - 1}&search=${search}&filter=${filter}` : "#"}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg border ${page > 1 ? 'hover:bg-muted/30 bg-white text-muted-foreground' : 'bg-muted/20 text-muted-foreground/30 pointer-events-none'}`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Link>

                            {/* Page numbers (Simplified for demo) */}
                            {[...Array(Math.min(3, totalPages))].map((_, i) => {
                                const p = i + 1; // Basic logic for 1, 2, 3
                                const isActive = p === page;
                                return (
                                    <Link
                                        key={p}
                                        href={`/admin/members?page=${p}&search=${search}&filter=${filter}`}
                                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold ${isActive ? 'bg-[#002366] text-white shadow-sm' : 'text-muted-foreground hover:bg-white hover:border border-transparent'}`}
                                    >
                                        {p}
                                    </Link>
                                );
                            })}

                            {/* Next */}
                            <Link
                                href={page < totalPages ? `/admin/members?page=${page + 1}&search=${search}&filter=${filter}` : "#"}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg border ${page < totalPages ? 'hover:bg-muted/30 bg-white text-muted-foreground' : 'bg-muted/20 text-muted-foreground/30 pointer-events-none'}`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
