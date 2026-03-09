"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, Building2, Smartphone, Globe, Banknote, CheckCircle2 } from "lucide-react";
import { usePaymentChannels } from "@/hooks/use-payment-channels";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contributionSchema, type ContributionInput } from "@/lib/validations/contribution";
import { createContribution } from "./actions";
import type { PaymentChannelRow, PaymentChannel } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const CHANNEL_ICONS: Record<PaymentChannel, React.ElementType> = {
    MOBILE_MONEY: Smartphone,
    BANK_TRANSFER: Building2,
    INTL_TRANSFER: Globe,
    CASH: Banknote,
};

const CHANNEL_LABELS: Record<PaymentChannel, string> = {
    MOBILE_MONEY: "Mobile Money",
    BANK_TRANSFER: "Bank Transfer",
    INTL_TRANSFER: "International Transfer",
    CASH: "Cash",
};

export function PaymentWizard() {
    const router = useRouter();
    const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
    const { channels, isLoading, error: fetchError } = usePaymentChannels({ activeOnly: true });

    // State for the selected channel
    const [selectedChannel, setSelectedChannel] = React.useState<PaymentChannelRow | null>(null);

    // Form setup
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<ContributionInput>({
        resolver: zodResolver(contributionSchema),
        defaultValues: {
            amount: 0,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            payment_channel: "CASH",
            reference_id: "",
        },
    });

    const [formError, setFormError] = React.useState<string | null>(null);

    // Step 1: Handle channel selection
    const handleSelectChannel = (channel: PaymentChannelRow) => {
        setSelectedChannel(channel);
        setValue("payment_channel", channel.channel_type);
        setStep(2);
    };

    // Step 3: Handle form submission
    const onSubmit = async (data: ContributionInput) => {
        setFormError(null);
        const result = await createContribution(data);

        if (result.error) {
            if (result.fieldErrors) {
                Object.entries(result.fieldErrors).forEach(([field, messages]) => {
                    setError(field as keyof ContributionInput, { type: "server", message: messages[0] });
                });
                if (result.fieldErrors._form) {
                    setFormError(result.fieldErrors._form[0]);
                }
            } else {
                setFormError(result.error);
            }
        } else {
            setStep(4); // Success step
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
                Erreur lors du chargement des canaux: {fetchError}
            </div>
        );
    }

    return (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
            {/* Header / Progress bar */}
            {step < 4 && (
                <div className="bg-muted/40 p-4 border-b flex items-center justify-between">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step === 3 ? 2 : 1)}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" /> Retour
                        </button>
                    ) : (
                        <div className="text-sm font-medium text-foreground">Étape 1 sur 3</div>
                    )}
                    <div className="flex gap-2">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "h-2 w-8 rounded-full transition-colors",
                                    s === step ? "bg-primary" : s < step ? "bg-primary/40" : "bg-muted-foreground/20"
                                )}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="p-6 md:p-8">
                {/* === STEP 1: Select Channel === */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <h2 className="text-xl font-bold">Choisissez un moyen de paiement</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Sélectionnez le canal que vous avez utilisé ou souhaitez utiliser.
                            </p>
                        </div>

                        {channels.length === 0 ? (
                            <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                                Aucun canal de paiement configuré pour le moment.
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {channels.map((channel) => {
                                    const Icon = CHANNEL_ICONS[channel.channel_type] ?? Banknote;
                                    return (
                                        <button
                                            key={channel.id}
                                            onClick={() => handleSelectChannel(channel)}
                                            className="group flex items-start text-left gap-4 rounded-xl border p-4 hover:border-primary hover:bg-primary/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{channel.provider_name}</h3>
                                                <p className="text-xs text-muted-foreground">{CHANNEL_LABELS[channel.channel_type]}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* === STEP 2: Channel Instructions === */}
                {step === 2 && selectedChannel && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <h2 className="text-xl font-bold">Effectuer le paiement</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Suivez ces instructions pour procéder au paiement.
                            </p>
                        </div>

                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const Icon = CHANNEL_ICONS[selectedChannel.channel_type] ?? Banknote;
                                    return <Icon className="h-6 w-6 text-primary" />;
                                })()}
                                <div>
                                    <h3 className="font-semibold text-lg">{selectedChannel.provider_name}</h3>
                                    <p className="text-sm text-muted-foreground">{CHANNEL_LABELS[selectedChannel.channel_type]}</p>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-primary/10">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                                    Numéro de compte / Téléphone
                                </label>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background border rounded-lg p-3">
                                    <span className="font-mono text-base">{selectedChannel.account_number}</span>
                                    <CopyButton text={selectedChannel.account_number} label="Copier le numéro" />
                                </div>
                            </div>

                            {selectedChannel.instructions && (
                                <div className="pt-2 border-t border-primary/10">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                                        Instructions spécifiques
                                    </label>
                                    <p className="text-sm whitespace-pre-wrap">{selectedChannel.instructions}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={() => setStep(3)}>
                                J'ai effectué le paiement, continuer
                            </Button>
                        </div>
                    </div>
                )}

                {/* === STEP 3: Form === */}
                {step === 3 && selectedChannel && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <h2 className="text-xl font-bold">Déclarer la transaction</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Saisissez les informations relatives à la cotisation payée.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                            {formError && (
                                <div className="p-3 bg-destructive/10 text-destructive text-sm font-medium rounded-lg">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Amount */}
                                <div className="space-y-2">
                                    <label htmlFor="amount" className="text-sm font-semibold">
                                        Montant (CFA) <span className="text-destructive">*</span>
                                    </label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Ex: 5000"
                                        {...register("amount", { valueAsNumber: true })}
                                        aria-invalid={!!errors.amount}
                                    />
                                    {errors.amount && (
                                        <p className="text-xs text-destructive">{errors.amount.message}</p>
                                    )}
                                </div>

                                {/* Month & Year grouped */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="month" className="text-sm font-semibold">
                                            Mois <span className="text-destructive">*</span>
                                        </label>
                                        <select
                                            id="month"
                                            {...register("month", { valueAsNumber: true })}
                                            className="flex h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m}>Mois {m}</option>
                                            ))}
                                        </select>
                                        {errors.month && (
                                            <p className="text-xs text-destructive">{errors.month.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="year" className="text-sm font-semibold">
                                            Année <span className="text-destructive">*</span>
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
                            </div>

                            {/* Reference ID - Mandatory for digital payments */}
                            {selectedChannel.channel_type !== "CASH" && (
                                <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                                    <label htmlFor="reference_id" className="text-sm font-semibold">
                                        ID de Transaction / Référence <span className="text-destructive">*</span>
                                    </label>
                                    <Input
                                        id="reference_id"
                                        type="text"
                                        placeholder="Ex: TXN123456789"
                                        {...register("reference_id")}
                                        aria-invalid={!!errors.reference_id}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Veuillez renseigner le numéro de transaction reçu par SMS ou fourni par la banque.
                                    </p>
                                    {errors.reference_id && (
                                        <p className="text-xs text-destructive">{errors.reference_id.message}</p>
                                    )}
                                </div>
                            )}

                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Soumettre la déclaration
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* === STEP 4: Success === */}
                {step === 4 && (
                    <div className="flex flex-col items-center justify-center space-y-4 py-8 animate-in zoom-in-95 duration-500">
                        <div className="h-20 w-20 bg-success/10 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-10 w-10 text-success" />
                        </div>
                        <h2 className="text-2xl font-bold text-center">Déclaration Soumise !</h2>
                        <div className="text-center text-muted-foreground max-w-sm">
                            <p>Votre paiement a été déclaré avec succès et est actuellement <strong>En attente de validation</strong> (Payment Under Review).</p>
                        </div>
                        <div className="pt-8 flex gap-4">
                            <Button variant="outline" onClick={() => router.push("/dashboard")}>
                                Retour à l'accueil
                            </Button>
                            <Button onClick={() => window.location.reload()}>
                                Nouvelle déclaration
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
