import Link from "next/link";
import { getMembers } from "@/app/admin/members/actions";
import { Button } from "@/components/ui/button";
import { AssociationStatusBadge, AccountStatusBadge } from "@/components/s2a/status-badge";

// Force dynamic to avoid caching stale member data
export const dynamic = "force-dynamic";

interface MembersPageProps {
    searchParams: Promise<{ page?: string }>;
}

/**
 * /admin/members — Member list (Server Component)
 * AC: 1, 5, 6
 * Displays paginated member table with two distinct status badges per member.
 */
export default async function MembersPage({ searchParams }: MembersPageProps) {
    const params = await searchParams;
    const page = Math.max(1, Number(params?.page) || 1);
    const result = await getMembers(page);

    if (result.error) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive">
                <p className="font-semibold">Erreur lors du chargement des membres</p>
                <p className="text-sm mt-1">{result.error}</p>
            </div>
        );
    }

    const { members, totalCount, totalPages } = result.data!;

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Gestion des Membres</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {totalCount} membre{totalCount !== 1 ? "s" : ""} au total
                    </p>
                </div>
                <Link href="/admin/members/new">
                    <Button id="add-member-btn" size="default">
                        + Ajouter un Membre
                    </Button>
                </Link>
            </div>

            {/* Members table */}
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Liste des membres">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-foreground">
                                    Nom Complet
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-foreground hidden sm:table-cell">
                                    Rôle
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-foreground">
                                    Statut Cotisation
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-foreground">
                                    Statut Compte
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-foreground hidden md:table-cell">
                                    Adhésion
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-foreground hidden md:table-cell">
                                    Cotisation/mois
                                </th>
                                <th className="px-4 py-3 text-center font-semibold text-foreground">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {members.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        Aucun membre trouvé
                                    </td>
                                </tr>
                            ) : (
                                members.map((member) => (
                                    <tr
                                        key={member.id}
                                        className="transition-colors hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {member.last_name} {member.first_name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                            {member.role}
                                        </td>
                                        <td className="px-4 py-3">
                                            <AssociationStatusBadge status={member.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <AccountStatusBadge status={member.account_status} />
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                                            {new Date(member.join_date).toLocaleDateString("fr-FR")}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono hidden md:table-cell">
                                            {member.monthly_fee.toLocaleString("fr-FR")} CFA
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Link
                                                href={`/admin/members/${member.id}/edit`}
                                                className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium min-h-[44px] min-w-[44px] text-primary hover:bg-primary/10 transition-colors"
                                                aria-label={`Modifier ${member.first_name} ${member.last_name}`}
                                            >
                                                Modifier
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                            Page {page} sur {totalPages}
                        </p>
                        <div className="flex gap-2">
                            {page > 1 && (
                                <Link href={`/admin/members?page=${page - 1}`}>
                                    <Button variant="outline" size="sm">
                                        ← Précédent
                                    </Button>
                                </Link>
                            )}
                            {page < totalPages && (
                                <Link href={`/admin/members?page=${page + 1}`}>
                                    <Button variant="outline" size="sm">
                                        Suivant →
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
