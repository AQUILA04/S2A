"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Banknote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { multiMonthContributionSchema, type MultiMonthContributionInput } from "@/lib/validations/contribution";
import { recordDirectPayment } from "@/app/admin/payments/actions";
import { useToast } from "@/hooks/use-toast";

const MONTHS = [
    { value: 1, label: "Jan" },
    { value: 2, label: "Fév" },
    { value: 3, label: "Mar" },
    { value: 4, label: "Avr" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Juin" },
    { value: 7, label: "Juil" },
    { value: 8, label: "Août" },
    { value: 9, label: "Sep" },
    { value: 10, label: "Oct" },
    { value: 11, label: "Nov" },
    { value: 12, label: "Déc" },
];

const CHANNELS = [
    { value: "CASH", label: "Espèces (Cash)" },
    { value: "MOBILE_MONEY", label: "Mobile Money" },
    { value: "BANK_TRANSFER", label: "Virement Bancaire" },
    { value: "INTL_TRANSFER", label: "Transfert International" },
];

export function RecordPaymentDialog({
    memberId,
    memberName,
    memberMonthlyFee
}: {
    memberId: string;
    memberName: string;
    memberMonthlyFee: number;
}) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
        reset,
        setError,
    } = useForm<MultiMonthContributionInput>({
        resolver: zodResolver(multiMonthContributionSchema),
        defaultValues: {
            member_id: memberId,
            amount: memberMonthlyFee || 0,
            months: [new Date().getMonth() + 1],
            year: new Date().getFullYear(),
            payment_channel: "CASH",
            reference_id: "",
        },
    });

    const selectedMonths = watch("months");
    const currentAmount = watch("amount");
    const selectedChannel = watch("payment_channel");

    // Client-side validation warning
    const expectedAmount = selectedMonths.length * memberMonthlyFee;
    const showAmountWarning = currentAmount > 0 && expectedAmount > 0 && currentAmount !== expectedAmount;

    const toggleMonth = (monthValue: number) => {
        const isSelected = selectedMonths.includes(monthValue);
        if (isSelected) {
            // Don't allow deselecting if it's the last one
            if (selectedMonths.length > 1) {
                setValue(
                    "months",
                    selectedMonths.filter((m) => m !== monthValue),
                    { shouldValidate: true }
                );
            }
        } else {
            setValue("months", [...selectedMonths, monthValue].sort((a, b) => a - b), {
                shouldValidate: true,
            });
        }
    };

    const onSubmit = async (data: MultiMonthContributionInput) => {
        const result = await recordDirectPayment(data);

        if (result.error) {
            if (result.fieldErrors) {
                Object.entries(result.fieldErrors).forEach(([field, messages]) => {
                    setError(field as keyof MultiMonthContributionInput, {
                        type: "server",
                        message: messages[0],
                    });
                });
            }
            toast({
                title: "Erreur",
                description: result.error,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Sukses",
                description: `Paiement enregistré avec succès (${result.data?.count} mois)`,
            });
            setOpen(false);
            reset();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-[#002366] border-[#002366] hover:bg-[#002366]/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Banknote className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Paiement Direct</span>
                </Button>
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-[425px]"
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>Enregistrer un Paiement (BE)</DialogTitle>
                    <DialogDescription>
                        Paiement direct pour <strong>{memberName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4" noValidate>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="amount" className="text-sm font-semibold">
                                Montant global (CFA) <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="amount"
                                type="number"
                                {...register("amount", { valueAsNumber: true })}
                                aria-invalid={!!errors.amount}
                            />
                            {errors.amount && (
                                <p className="text-xs text-destructive">{errors.amount.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="year" className="text-sm font-semibold">
                                Année Cible <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="year"
                                type="number"
                                {...register("year", { valueAsNumber: true })}
                                aria-invalid={!!errors.year}
                            />
                            {errors.year && (
                                <p className="text-xs text-destructive">{errors.year.message}</p>
                            )}
                        </div>
                    </div>

                    {showAmountWarning && (
                        <div className="text-xs font-medium text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                            Attention: Le montant total ({currentAmount} CFA) ne correspond pas à la somme attendue pour {selectedMonths.length} mois ({expectedAmount} CFA).
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-semibold">
                            Mois couverts (Sélection multiple) <span className="text-destructive">*</span>
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {MONTHS.map((m) => {
                                const isSelected = selectedMonths.includes(m.value);
                                return (
                                    <button
                                        key={m.value}
                                        type="button"
                                        onClick={() => toggleMonth(m.value)}
                                        className={`h-9 rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${isSelected
                                                ? "bg-[#002366] text-white shadow hover:bg-[#002366]/90 border-transparent"
                                                : "bg-background text-foreground hover:bg-muted"
                                            }`}
                                    >
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                        {errors.months && (
                            <p className="text-xs text-destructive">{errors.months.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="payment_channel" className="text-sm font-semibold">
                            Canal de paiement <span className="text-destructive">*</span>
                        </label>
                        <select
                            id="payment_channel"
                            {...register("payment_channel")}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {CHANNELS.map((ch) => (
                                <option key={ch.value} value={ch.value}>
                                    {ch.label}
                                </option>
                            ))}
                        </select>
                        {errors.payment_channel && (
                            <p className="text-xs text-destructive">
                                {errors.payment_channel.message}
                            </p>
                        )}
                    </div>

                    {selectedChannel !== "CASH" && (
                        <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                            <label htmlFor="reference_id" className="text-sm font-semibold">
                                ID de Transaction <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="reference_id"
                                {...register("reference_id")}
                                aria-invalid={!!errors.reference_id}
                                placeholder="Obligatoire pour ce canal"
                            />
                            {errors.reference_id && (
                                <p className="text-xs text-destructive">
                                    {errors.reference_id.message}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setOpen(false);
                                reset();
                            }}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-[#002366] hover:bg-[#002366]/90">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
