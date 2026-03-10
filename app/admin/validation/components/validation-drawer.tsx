"use client";

import * as React from "react";
import { useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import { validatePayment } from "@/app/admin/validation/actions";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Eye, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

interface ValidationDrawerProps {
    contributionId: string;
    memberName: string;
    amount: number;
    channel: string;
    referenceId: string | null;
    declarationDate: string;
    periodLabel: string;
    onActionComplete: () => void;
}

// ============================================================
// Component
// ============================================================

export function ValidationDrawer({
    contributionId,
    memberName,
    amount,
    channel,
    referenceId,
    declarationDate,
    periodLabel,
    onActionComplete,
}: ValidationDrawerProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [open, setOpen] = React.useState(false);
    const [showRejectReason, setShowRejectReason] = React.useState(false);
    const [rejectReason, setRejectReason] = React.useState("");
    const [reasonError, setReasonError] = React.useState("");

    function resetState() {
        setShowRejectReason(false);
        setRejectReason("");
        setReasonError("");
    }

    async function handleApprove() {
        setOpen(false);
        startTransition(async () => {
            onActionComplete();
            const result = await validatePayment(contributionId, "APPROVE");
            if (result.error) {
                toast({
                    title: "Erreur",
                    description: result.error,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Paiement validé",
                    description: `Paiement de ${memberName} validé et logué`,
                });
            }
        });
    }

    async function handleReject() {
        if (!rejectReason.trim()) {
            setReasonError("Le motif de rejet est obligatoire");
            return;
        }
        setOpen(false);
        startTransition(async () => {
            onActionComplete();
            const result = await validatePayment(contributionId, "REJECT", rejectReason.trim());
            if (result.error) {
                toast({
                    title: "Erreur",
                    description: result.error,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Paiement rejeté",
                    description: `Déclaration de ${memberName} rejetée et notifiée`,
                });
            }
        });
        resetState();
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
            <DialogTrigger asChild>
                <button
                    id={`review-btn-${contributionId}`}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-semibold border border-[#002366]/30 text-[#002366] bg-[#002366]/5 hover:bg-[#002366]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isPending}
                    aria-label={`Examiner la déclaration de ${memberName}`}
                >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    Examiner
                </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-[#001030]">Examen de la déclaration</DialogTitle>
                </DialogHeader>

                {/* Member info */}
                <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/20 p-4 space-y-2.5 text-sm">
                        <Row label="Membre" value={memberName} bold />
                        <Row label="Montant" value={`${amount.toLocaleString("fr-FR")} CFA`} bold mono />
                        <Row label="Canal" value={channel} />
                        <Row label="Période" value={periodLabel} />
                        <Row label="Date de déclaration" value={declarationDate} />

                        {/* Reference ID with copy button */}
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground font-medium min-w-[100px]">Référence ID</span>
                            {referenceId ? (
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono text-xs text-[#001030] truncate">{referenceId}</span>
                                    <CopyButton
                                        text={referenceId}
                                        label="Copier"
                                        size="sm"
                                    />
                                </div>
                            ) : (
                                <span className="text-muted-foreground italic text-xs">Aucune (Espèces)</span>
                            )}
                        </div>
                    </div>

                    {/* Rejection reason (revealed on reject click) */}
                    {showRejectReason && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                                Motif de rejet obligatoire
                            </div>
                            <textarea
                                id={`reject-reason-${contributionId}`}
                                className={cn(
                                    "w-full min-h-[90px] rounded-lg border px-3 py-2 text-sm resize-none",
                                    "bg-background ring-offset-background placeholder:text-muted-foreground",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                    reasonError ? "border-destructive" : "border-input"
                                )}
                                placeholder="Ex: Référence introuvable dans nos relevés, montant incorrect..."
                                value={rejectReason}
                                onChange={(e) => {
                                    setRejectReason(e.target.value);
                                    if (e.target.value.trim()) setReasonError("");
                                }}
                                aria-describedby={reasonError ? `reject-error-${contributionId}` : undefined}
                                aria-invalid={!!reasonError}
                                autoFocus
                            />
                            {reasonError && (
                                <p
                                    id={`reject-error-${contributionId}`}
                                    className="text-xs text-destructive"
                                    role="alert"
                                >
                                    {reasonError}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    {!showRejectReason ? (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                id={`reject-btn-${contributionId}`}
                                type="button"
                                onClick={() => setShowRejectReason(true)}
                                disabled={isPending}
                                className="flex items-center justify-center gap-2 h-12 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                                aria-label="Rejeter cette déclaration"
                            >
                                <XCircle className="h-5 w-5" aria-hidden="true" />
                                Rejeter
                            </button>
                            <button
                                id={`approve-btn-${contributionId}`}
                                type="button"
                                onClick={handleApprove}
                                disabled={isPending}
                                className="flex items-center justify-center gap-2 h-12 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
                                aria-label="Approuver cette déclaration"
                            >
                                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                                Approuver
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => resetState()}
                                disabled={isPending}
                                className="flex items-center justify-center h-12 rounded-lg border border-border text-muted-foreground font-semibold text-sm hover:bg-muted/30 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Annuler
                            </button>
                            <button
                                id={`confirm-reject-btn-${contributionId}`}
                                type="button"
                                onClick={handleReject}
                                disabled={isPending || !rejectReason.trim()}
                                className="flex items-center justify-center gap-2 h-12 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                                aria-label="Confirmer le rejet"
                            >
                                <XCircle className="h-5 w-5" aria-hidden="true" />
                                Confirmer le rejet
                            </button>
                        </div>
                    )}
                </div>

                <DialogClose className="sr-only">Fermer</DialogClose>
            </DialogContent>
        </Dialog>
    );
}

// ─── Sub-component: detail row ────────────────────────────────────────────────
function Row({
    label,
    value,
    bold = false,
    mono = false,
}: {
    label: string;
    value: string;
    bold?: boolean;
    mono?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground font-medium min-w-[100px]">{label}</span>
            <span
                className={cn(
                    "text-right",
                    bold ? "font-semibold text-[#001030]" : "text-[#001030]",
                    mono ? "font-mono" : ""
                )}
            >
                {value}
            </span>
        </div>
    );
}
