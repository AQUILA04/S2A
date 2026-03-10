import { getPendingContributions } from "@/app/admin/validation/actions";
import { ValidationRow } from "@/app/admin/validation/components/validation-row";
import { PullToRefresh } from "@/components/s2a/pull-to-refresh";
import { ClipboardCheck, Clock } from "lucide-react";

// Force dynamic rendering — always show fresh data
export const dynamic = "force-dynamic";

// ============================================================
// Helpers
// ============================================================

const MONTH_NAMES = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

const CHANNEL_LABELS: Record<string, string> = {
    CASH: "Espèces",
    MOBILE_MONEY: "Mobile Money",
    BANK_TRANSFER: "Virement bancaire",
    INTL_TRANSFER: "Virement international",
};

function formatDate(isoDate: string) {
    const d = new Date(isoDate);
    return `${d.getDate().toString().padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ============================================================
// Page Component
// ============================================================

export default async function ValidationPage() {
    const result = await getPendingContributions();

    if (result.error) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive m-4">
                <p className="font-semibold">Erreur lors du chargement des déclarations</p>
                <p className="text-sm mt-1">{result.error}</p>
            </div>
        );
    }

    const contributions = result.data ?? [];

    return (
        <PullToRefresh>
            <div className="flex flex-col min-h-full">
                {/* Page header */}
                <div className="px-4 py-6 bg-white border-b">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-[#001030]">Console de Validation</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Examinez et validez les déclarations de paiement en attente.
                            </p>
                        </div>
                        {contributions.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 bg-gold/10 text-gold-foreground border border-gold/30 rounded-full px-3 py-1 text-sm font-semibold">
                                <Clock className="w-4 h-4" />
                                {contributions.length} en attente
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-4 flex-1">
                    {contributions.length === 0 ? (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                                <ClipboardCheck className="w-8 h-8 text-success" />
                            </div>
                            <h2 className="text-lg font-semibold text-[#001030]">Aucune déclaration en attente</h2>
                            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                                Toutes les déclarations ont été traitées. Revenez plus tard ou actualisez la page.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden text-sm">
                            {/* Desktop table headers */}
                            <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                <div className="col-span-3">Membre</div>
                                <div className="col-span-2">Montant</div>
                                <div className="col-span-2">Canal</div>
                                <div className="col-span-2">Référence</div>
                                <div className="col-span-2">Date</div>
                                <div className="col-span-1 text-right">Action</div>
                            </div>

                            {/* Rows */}
                            <div className="divide-y" id="pending-contributions-list">
                                {contributions.map((contribution) => (
                                    <ValidationRow
                                        key={contribution.id}
                                        contributionId={contribution.id}
                                        memberName={contribution.member_name}
                                        amount={contribution.amount}
                                        channel={CHANNEL_LABELS[contribution.payment_channel] ?? contribution.payment_channel}
                                        referenceId={contribution.reference_id ?? null}
                                        declarationDate={formatDate(contribution.created_at)}
                                        periodLabel={`${MONTH_NAMES[(contribution.month ?? 1) - 1]} ${contribution.year}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PullToRefresh>
    );
}
