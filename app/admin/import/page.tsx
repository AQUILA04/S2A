"use client";

/**
 * ImportPage — /admin/import
 *
 * Three-step legacy data import flow:
 *   Step 1: Upload (dropzone)
 *   Step 2: Preview (table with OK / Error rows)
 *   Step 3: Confirmation result
 *
 * Communicates in French (S2A UI language).
 */

import * as React from "react";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, ArrowRight, ArrowLeft, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseLegacyFile, type FileParseResult, type ParsedContribution } from "@/lib/import/parser";
import { previewImport, confirmImport, type ImportSummary, type ResolvedPreview } from "@/app/admin/import/actions";
import type { PaymentChannel } from "@/types/database.types";

// ============================================================
// Utility
// ============================================================

const PAYMENT_CHANNEL_LABELS: Record<PaymentChannel, string> = {
    CASH: "Espèces (CASH)",
    MOBILE_MONEY: "Mobile Money",
    BANK_TRANSFER: "Virement bancaire",
    INTL_TRANSFER: "Transfert international",
};

const MONTH_LABELS: Record<number, string> = {
    1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril",
    5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août",
    9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
};

// ============================================================
// Sub-components
// ============================================================

function PageHeader() {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Import de Données Historiques</h1>
            </div>
            <p className="text-sm text-muted-foreground">
                Importez les cotisations historiques depuis 2016 à partir d&apos;un fichier Excel ou CSV.
            </p>
        </div>
    );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
    const steps = [
        { n: 1, label: "Upload" },
        { n: 2, label: "Aperçu" },
        { n: 3, label: "Résultat" },
    ];
    return (
        <div className="flex items-center gap-2 mb-6" role="navigation" aria-label="Étapes de l'import">
            {steps.map((s, i) => (
                <React.Fragment key={s.n}>
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                                step === s.n
                                    ? "bg-primary text-primary-foreground"
                                    : step > s.n
                                        ? "bg-success text-success-foreground"
                                        : "bg-muted text-muted-foreground"
                            )}
                            aria-current={step === s.n ? "step" : undefined}
                        >
                            {step > s.n ? <CheckCircle className="h-4 w-4" /> : s.n}
                        </div>
                        <span
                            className={cn(
                                "text-sm font-medium hidden sm:inline",
                                step === s.n ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {s.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={cn("flex-1 h-0.5 rounded", step > s.n ? "bg-success" : "bg-border")} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

// ============================================================
// Step 1: Upload
// ============================================================

interface Step1Props {
    onParsed: (result: FileParseResult, filename: string, channel: PaymentChannel) => void;
}

function Step1Upload({ onParsed }: Step1Props) {
    const [isDragging, setIsDragging] = React.useState(false);
    const [selectedChannel, setSelectedChannel] = React.useState<PaymentChannel>("CASH");
    const [error, setError] = React.useState<string | null>(null);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        setError(null);
        setIsProcessing(true);
        try {
            const allowed = [
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
                "text/csv",
            ];
            const isAllowed =
                allowed.includes(file.type) ||
                file.name.endsWith(".xlsx") ||
                file.name.endsWith(".xls") ||
                file.name.endsWith(".csv");

            if (!isAllowed) {
                setError("Format non supporté. Veuillez utiliser un fichier .xlsx, .xls, ou .csv.");
                return;
            }

            const buffer = await file.arrayBuffer();
            const result = parseLegacyFile(Buffer.from(buffer), file.name, selectedChannel);
            onParsed(result, file.name, selectedChannel);
        } catch (err) {
            setError(`Erreur lors de l'analyse du fichier: ${(err as Error).message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) await processFile(file);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    };

    return (
        <div className="space-y-5">
            {/* Channel selector */}
            <div className="rounded-lg border border-input bg-card p-4 space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="channel-select">
                    Canal de paiement par défaut
                </label>
                <p className="text-xs text-muted-foreground">
                    Ce canal sera appliqué à toutes les contributions importées (le fichier ne contient pas cette information).
                </p>
                <select
                    id="channel-select"
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value as PaymentChannel)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {(Object.keys(PAYMENT_CHANNEL_LABELS) as PaymentChannel[]).map((ch) => (
                        <option key={ch} value={ch}>
                            {PAYMENT_CHANNEL_LABELS[ch]}
                        </option>
                    ))}
                </select>
            </div>

            {/* Dropzone */}
            <div
                role="button"
                tabIndex={0}
                aria-label="Zone de dépôt de fichier. Cliquez ou déposez un fichier ici."
                className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
                    isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/60"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            >
                <Upload className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div>
                    <p className="font-semibold text-foreground">
                        {isProcessing ? "Analyse en cours…" : "Déposez votre fichier ici"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        ou <span className="text-primary font-medium">cliquez pour parcourir</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Formats : .xlsx, .xls, .csv</p>
                </div>
                <input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="sr-only"
                    onChange={handleFileChange}
                    aria-hidden="true"
                />
            </div>

            {error && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                    {error}
                </div>
            )}

            {/* Template download hint */}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Format attendu des colonnes :
                <code className="font-mono bg-muted px-1 rounded">noms, téléphone, janvier … decembre, annee</code>
            </p>
        </div>
    );
}

// ============================================================
// Step 2: Preview
// ============================================================

interface Step2PreviewProps {
    parseResult: FileParseResult;
    filename: string;
    channel: PaymentChannel;
    onConfirm: (summary: ImportSummary) => void;
    onBack: () => void;
}

function Step2Preview({ parseResult, filename, channel, onConfirm, onBack }: Step2PreviewProps) {
    const [resolvedPreview, setResolvedPreview] = React.useState<ResolvedPreview | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isConfirming, setIsConfirming] = React.useState(false);
    const [serverError, setServerError] = React.useState<string | null>(null);

    // Load server-side resolution on mount
    React.useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        previewImport(parseResult, channel).then((result) => {
            if (cancelled) return;
            if (result.error) {
                setServerError(result.error);
            } else if (result.data) {
                setResolvedPreview(result.data);
            }
            setIsLoading(false);
        });
        return () => { cancelled = true; };
    }, [parseResult, channel]);

    const handleConfirm = async () => {
        if (!resolvedPreview) return;
        setIsConfirming(true);
        setServerError(null);
        const result = await confirmImport(resolvedPreview.toInsert as Array<ParsedContribution & { member_id: string }>);
        setIsConfirming(false);
        if (result.error) {
            setServerError(result.error);
        } else if (result.data) {
            onConfirm(result.data);
        }
    };

    return (
        <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="Lignes totales" value={parseResult.totalRows} />
                <SummaryCard label="Lignes valides" value={parseResult.validRows} variant="success" />
                <SummaryCard label="Lignes error" value={parseResult.errorRows} variant="error" />
                <SummaryCard label="Contributions" value={parseResult.totalContributions} variant="primary" />
            </div>

            <p className="text-xs text-muted-foreground">
                Fichier : <span className="font-mono font-medium">{filename}</span> — Canal : {PAYMENT_CHANNEL_LABELS[channel]}
            </p>

            {/* Server resolution status */}
            {isLoading && (
                <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                    Vérification des membres et des doublons en cours…
                </div>
            )}

            {resolvedPreview && !isLoading && (
                <div className="space-y-3">
                    {resolvedPreview.unmappedPhones.length > 0 && (
                        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                            <div className="flex items-center gap-2 font-semibold text-destructive mb-1">
                                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                {resolvedPreview.unmappedPhones.length} numéro(s) non trouvé(s) dans la base
                            </div>
                            <ul className="list-disc list-inside text-xs text-destructive/80 space-y-0.5">
                                {resolvedPreview.unmappedPhones.map((p) => <li key={p}>{p}</li>)}
                            </ul>
                        </div>
                    )}
                    {resolvedPreview.duplicates.length > 0 && (
                        <div className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
                            <div className="flex items-center gap-2 font-semibold text-[hsl(var(--gold-foreground))] mb-1">
                                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                {resolvedPreview.duplicates.length} doublon(s) ignoré(s)
                            </div>
                        </div>
                    )}
                    <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
                        <div className="flex items-center gap-2 font-semibold text-success">
                            <CheckCircle className="h-4 w-4" aria-hidden="true" />
                            {resolvedPreview.toInsert.length} contribution(s) prêt(es) à importer
                        </div>
                    </div>
                </div>
            )}

            {/* Detected headers debug panel - always show to allow diagnosis */}
            {parseResult.detectedHeaders.length > 0 && parseResult.errorRows > 0 && (
                <details className="rounded-lg border border-amber-300/50 bg-amber-50/30 p-3 text-xs dark:bg-amber-900/10">
                    <summary className="cursor-pointer font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        Colonnes détectées dans le fichier (cliquer pour vérifier)
                    </summary>
                    <p className="mt-2 text-muted-foreground">
                        Colonnes lues :{" "}
                        <code className="font-mono bg-muted px-1 rounded">
                            {parseResult.detectedHeaders.join(" | ")}
                        </code>
                    </p>
                    <p className="mt-1 text-muted-foreground">
                        Colonnes attendues :{" "}
                        <code className="font-mono bg-muted px-1 rounded">
                            noms | téléphone | janvier | fevrier | mars | avril | mai | juin | juillet | aout | septembre | octobre | novembre | decembre | annee
                        </code>
                    </p>
                </details>
            )}

            {/* Preview table of parsed rows */}
            <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs" aria-label="Aperçu des données à importer">
                        <thead className="bg-muted/60 border-b">
                            <tr>
                                <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground">Ligne</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground">Nom</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground">Téléphone</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground">Année</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground">Contributions</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {parseResult.rows.map((row) => {
                                const isUnmapped = resolvedPreview?.unmappedPhones.includes(row.rawPhone);
                                const isActuallyValid = row.isValid && !isUnmapped;

                                return (
                                    <tr
                                        key={row.rowIndex}
                                        className={cn(
                                            "transition-colors",
                                            isActuallyValid ? "bg-card hover:bg-muted/30" : "bg-destructive/5 hover:bg-destructive/10"
                                        )}
                                    >
                                        <td className="px-3 py-2 font-mono text-muted-foreground">{row.rowIndex + 1}</td>
                                        <td className="px-3 py-2 font-medium">{row.memberName || "—"}</td>
                                        <td className="px-3 py-2 font-mono">{row.rawPhone || "—"}</td>
                                        <td className="px-3 py-2 font-mono">{row.year || "—"}</td>
                                        <td className="px-3 py-2">
                                            {isActuallyValid ? (
                                                <span className="text-muted-foreground">
                                                    {row.contributions.length} mois ({row.contributions.map(c => MONTH_LABELS[c.month]).join(", ")})
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-3 py-2">
                                            {isActuallyValid ? (
                                                <span className="flex items-center gap-1 text-success font-semibold">
                                                    <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> OK
                                                </span>
                                            ) : (
                                                <div className="space-y-0.5">
                                                    <span className="flex items-center gap-1 text-destructive font-semibold">
                                                        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Erreur
                                                    </span>
                                                    {isUnmapped && (
                                                        <p className="text-destructive/80 text-[10px] leading-tight pl-4">
                                                            Téléphone introuvable dans la base de données.
                                                        </p>
                                                    )}
                                                    {row.errors.map((err, i) => (
                                                        <p key={i} className="text-destructive/80 text-[10px] leading-tight pl-4">
                                                            {err}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {serverError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                    {serverError}
                </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Retour
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading || isConfirming || !resolvedPreview || resolvedPreview.toInsert.length === 0}
                    className="flex flex-1 items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    id="confirm-import-btn"
                >
                    {isConfirming ? (
                        <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" aria-hidden="true" />
                            Import en cours…
                        </>
                    ) : (
                        <>
                            Confirmer l&apos;import
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// Mini summary card
function SummaryCard({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "success" | "error" | "primary" }) {
    const variantClasses = {
        default: "bg-card border text-foreground",
        success: "bg-success/10 border-success/30 text-success",
        error: "bg-destructive/10 border-destructive/30 text-destructive",
        primary: "bg-primary/10 border-primary/30 text-primary",
    };
    return (
        <div className={cn("rounded-lg border p-3 text-center", variantClasses[variant])}>
            <p className="font-mono text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
        </div>
    );
}

// ============================================================
// Step 3: Result
// ============================================================

interface Step3ResultProps {
    summary: ImportSummary;
    onReset: () => void;
}

function Step3Result({ summary, onReset }: Step3ResultProps) {
    const success = summary.inserted > 0;
    return (
        <div className="space-y-5 text-center">
            <div className="flex flex-col items-center gap-3 py-6">
                {success ? (
                    <CheckCircle className="h-16 w-16 text-success" aria-hidden="true" />
                ) : (
                    <AlertTriangle className="h-16 w-16 text-destructive" aria-hidden="true" />
                )}
                <h2 className="text-lg font-bold">
                    {success ? "Import réussi !" : "Aucune donnée importée"}
                </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <SummaryCard label="Contributions importées" value={summary.inserted} variant="success" />
                <SummaryCard label="Doublons ignorés" value={summary.duplicatesSkipped} variant="default" />
                <SummaryCard label="Membres non trouvés" value={summary.unmappedRows} variant={summary.unmappedRows > 0 ? "error" : "default"} />
            </div>

            {summary.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-left">
                    <p className="font-semibold text-destructive mb-1">Erreurs partielles :</p>
                    <ul className="list-disc list-inside text-xs text-destructive/80 space-y-0.5">
                        {summary.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                </div>
            )}

            <button
                type="button"
                onClick={onReset}
                className="w-full flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                Nouvel import
            </button>
        </div>
    );
}

// ============================================================
// Main page component
// ============================================================

export default function ImportPage() {
    const [step, setStep] = React.useState<1 | 2 | 3>(1);
    const [parseResult, setParseResult] = React.useState<FileParseResult | null>(null);
    const [filename, setFilename] = React.useState("");
    const [channel, setChannel] = React.useState<PaymentChannel>("CASH");
    const [importSummary, setImportSummary] = React.useState<ImportSummary | null>(null);

    const handleParsed = (result: FileParseResult, name: string, ch: PaymentChannel) => {
        setParseResult(result);
        setFilename(name);
        setChannel(ch);
        setStep(2);
    };

    const handleConfirm = (summary: ImportSummary) => {
        setImportSummary(summary);
        setStep(3);
    };

    const handleReset = () => {
        setStep(1);
        setParseResult(null);
        setFilename("");
        setImportSummary(null);
    };

    return (
        <div>
            <PageHeader />
            <StepIndicator step={step} />

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                {step === 1 && <Step1Upload onParsed={handleParsed} />}
                {step === 2 && parseResult && (
                    <Step2Preview
                        parseResult={parseResult}
                        filename={filename}
                        channel={channel}
                        onConfirm={handleConfirm}
                        onBack={() => setStep(1)}
                    />
                )}
                {step === 3 && importSummary && (
                    <Step3Result summary={importSummary} onReset={handleReset} />
                )}
            </div>
        </div>
    );
}
