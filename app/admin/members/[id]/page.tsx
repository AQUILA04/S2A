import Link from "next/link";
import { notFound } from "next/navigation";
import {
    getMemberById,
    getMemberRecentContributions,
} from "@/app/admin/members/actions";
import { getMemberBalanceAction } from "@/app/dashboard/actions";
import { ContributionCalendar } from "@/app/dashboard/components/contribution-calendar";
import { RecordPaymentDialog } from "@/app/admin/members/components/record-payment-dialog";
import { AssociationStatusBadge } from "@/components/s2a/status-badge";
import { cn } from "@/lib/utils";
import { ArrowLeft, Wallet, ArrowDownLeft, UserRound } from "lucide-react";

export const dynamic = "force-dynamic";

interface MemberProfilePageProps {
    params: Promise<{ id: string }>;
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
    const { id } = await params;
    const [memberResult, balanceResult, contributionsResult] = await Promise.all([
        getMemberById(id),
        getMemberBalanceAction({ memberId: id }),
        getMemberRecentContributions(id),
    ]);

    if (memberResult.error || !memberResult.data) {
        notFound();
    }

    const member = memberResult.data;
    const joinedDate = new Date(member.join_date).toLocaleDateString("fr-FR", {
        month: "short",
        year: "numeric",
    });
    const memberName = `${member.first_name} ${member.last_name}`;
    const balance = balanceResult.data;
    const contributions = contributionsResult.data ?? [];

    if (!balance || balanceResult.error) {
        return (
            <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive">
                <h1 className="font-bold">Erreur de chargement du profil financier</h1>
                <p className="mt-1 text-sm">
                    {balanceResult.error ?? "Impossible de charger le solde du membre."}
                </p>
            </div>
        );
    }

    const operatingRatio =
        balance.totalPaid > 0 ? (balance.operatingFees / balance.totalPaid) * 100 : 0;
    const savingsRatio =
        balance.totalPaid > 0 ? (balance.availableBalance / balance.totalPaid) * 100 : 0;
    const formatCfa = (value: number) =>
        `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} CFA`;

    return (
        <div className="min-h-screen bg-white pb-24 md:pb-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-4">
                <Link
                    href="/admin/members"
                    aria-label="Retour au registre des membres"
                    className="-ml-2 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-6 w-6" aria-hidden="true" />
                </Link>
                <h1 className="text-lg font-bold">Profil du membre</h1>
                <div className="h-11 w-11" aria-hidden="true" />
            </div>

            {/* Profile Hero */}
            <div className="mt-8 flex flex-col items-center px-4">
                <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-muted shadow-sm">
                        <div className="flex h-full w-full items-center justify-center bg-gold/20 text-gold">
                            <UserRound className="h-12 w-12" aria-hidden="true" />
                        </div>
                    </div>
                    <span
                        className={cn(
                            "absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white",
                            member.status === "ACTIVE" ? "bg-success" : "bg-destructive"
                        )}
                        aria-label={
                            member.status === "ACTIVE" ? "Membre actif" : "Membre inactif"
                        }
                    />
                </div>

                <h2 className="mt-4 text-2xl font-bold text-[#001030]">
                    {memberName}
                </h2>

                <div className="mt-1.5 flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                    <AssociationStatusBadge status={member.status} />
                    <span>•</span>
                    <span>Adhésion {joinedDate}</span>
                </div>

                {/* Actions */}
                <div className="mt-6 flex w-full gap-3">
                    <div className="flex-1 [&>button]:h-12 [&>button]:w-full">
                        <RecordPaymentDialog
                            memberId={member.id}
                            memberName={memberName}
                            memberMonthlyFee={Number(member.monthly_fee)}
                        />
                    </div>
                    <Link
                        href={`/admin/members/${member.id}/edit`}
                        className="flex h-12 flex-1 items-center justify-center rounded-lg bg-[#F1F3F5] text-sm font-semibold text-[#002366] transition-colors hover:bg-[#E9ECEF]"
                    >
                        <UserRound className="mr-2 h-4 w-4" aria-hidden="true" />
                        Modifier le profil
                    </Link>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="mt-8 px-4">
                <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground">
                    SITUATION FINANCIÈRE
                </h3>

                <div className="relative overflow-hidden rounded-xl bg-primary p-5 text-primary-foreground shadow-sm">
                    <div className="absolute right-4 top-4 text-primary-foreground/20">
                        <Wallet className="h-16 w-16" aria-hidden="true" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider">
                        Total versé
                    </p>
                    <div className="relative z-10 mt-2 font-mono text-3xl font-bold">
                        {formatCfa(balance.totalPaid)}
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-white p-4 shadow-sm">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Fonds fonct. (2/12)
                        </div>
                        <div className="font-mono text-xl font-bold">
                            {formatCfa(balance.operatingFees)}
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(100, operatingRatio)}%` }}
                            />
                        </div>
                    </div>
                    <div className="rounded-xl border bg-white p-4 shadow-sm">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Solde épargne (10/12)
                        </div>
                        <div className="font-mono text-xl font-bold text-gold">
                            {formatCfa(balance.availableBalance)}
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-gold"
                                style={{ width: `${Math.min(100, savingsRatio)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Contribution Calendar */}
            <div className="mt-8 px-4">
                <ContributionCalendar
                    memberId={id}
                    data={balance.timeline}
                    isLoading={false}
                />
            </div>

            {/* Recent Transactions */}
            <div className="mt-8 px-4 mb-4">
                <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground">
                    TRANSACTIONS RÉCENTES
                </h3>

                {contributionsResult.error ? (
                    <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        Impossible de charger les transactions récentes.
                    </p>
                ) : contributions.length === 0 ? (
                    <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
                        Aucune cotisation validée pour ce membre.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {contributions.map((contribution) => (
                            <div
                                key={contribution.id}
                                className="flex items-center rounded-xl border bg-white p-4 shadow-sm"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                                    <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div className="ml-3 flex-1 overflow-hidden">
                                    <div className="truncate text-sm font-bold text-[#001030]">
                                        Cotisation {contribution.month}/{contribution.year}
                                    </div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                        {new Date(
                                            contribution.validated_at ?? contribution.created_at
                                        ).toLocaleDateString("fr-FR")}{" "}
                                        • {contribution.payment_channel}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-sm font-bold text-success">
                                        +{formatCfa(Number(contribution.amount))}
                                    </div>
                                    <div className="mt-0.5 text-[10px] font-bold uppercase text-success">
                                        Validé
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
