"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import { massImportMemberSchema, type ValidatedMemberJson } from "../types";
import { parseFullName } from "@/lib/utils/name-parser";
import { bulkImportMembers } from "../actions";

export function MassImportDialog() {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Preview state
    const [validRows, setValidRows] = useState<ValidatedMemberJson[]>([]);
    const [errorRows, setErrorRows] = useState<{ row: number; errors: string[] }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { toast } = useToast();

    const resetState = () => {
        setFile(null);
        setValidRows([]);
        setErrorRows([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsParsing(true);
        setValidRows([]);
        setErrorRows([]);

        try {
            const data = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Expected headers: NOM, PRÉNOM, NOM ET PRÉNOMS COMPLETS, TÉLÉPHONE, ADRESSE, EMAIL
            const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
            
            const parsedValid: ValidatedMemberJson[] = [];
            const parsedErrors: { row: number; errors: string[] }[] = [];

            rawJson.forEach((row, index) => {
                const rowNum = index + 2; // Assuming row 1 is header
                
                const { firstName, lastName } = parseFullName(
                    row["NOM"] as string,
                    row["PRÉNOM"] as string,
                    row["NOM ET PRÉNOMS COMPLETS"] as string
                );

                const phone = String(row["TÉLÉPHONE"] || row["TELEPHONE"] || "").trim();
                const email = String(row["EMAIL"] || "").trim();
                const address = String(row["ADRESSE"] || "").trim();
                
                // UUID generation (crypto.randomUUID is available in modern browsers)
                const tempId = crypto.randomUUID();

                const recordData = {
                    id: tempId,
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    email: email,
                    address: address,
                    join_date: new Date().toISOString().split("T")[0],
                    monthly_fee: 0,
                    role: "MEMBER" as const,
                };

                const validation = massImportMemberSchema.safeParse(recordData);
                
                if (validation.success) {
                    parsedValid.push(validation.data);
                } else {
                    const errs = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
                    parsedErrors.push({ row: rowNum, errors: errs });
                }
            });

            setValidRows(parsedValid);
            setErrorRows(parsedErrors);

        } catch (error) {
            setErrorRows([{ row: 0, errors: ["Erreur de lecture du fichier. Assurez-vous qu'il s'agit d'un CSV ou XLSX valide."] }]);
        } finally {
            setIsParsing(false);
        }
    };

    const handleImport = async () => {
        if (validRows.length === 0) return;
        
        setIsSubmitting(true);
        // Chunk validRows to avoid hitting 1MB Server Action limits on huge files
        const CHUNK_SIZE = 500;
        let totalSuccess = 0;
        let totalFailures = 0;
        let allFailedRows: typeof errorRows = [];
        let hasError = false;
        let lastErrorMsg = "";

        try {
            for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
                const chunk = validRows.slice(i, i + CHUNK_SIZE);
                const result = await bulkImportMembers(chunk);
                
                if (result.error) {
                    hasError = true;
                    lastErrorMsg = result.error;
                    break;
                }
                
                totalSuccess += result.data?.successCount || 0;
                totalFailures += result.data?.failureCount || 0;
                if (result.data?.failedRows) {
                    allFailedRows = [...allFailedRows, ...result.data.failedRows];
                }
            }
            
            if (hasError) {
                toast({
                    title: "Erreur lors de l'import",
                    description: lastErrorMsg,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Importation terminée",
                    description: `${totalSuccess} membre(s) importé(s) avec succès. ${totalFailures} échec(s).`,
                });
                
                if (totalFailures === 0 && totalSuccess > 0) {
                    setOpen(false);
                    resetState();
                } else {
                    // Update error rows if some failed in DB
                    if (allFailedRows.length > 0) {
                       setErrorRows(prev => [...prev, ...allFailedRows]);
                       // Keep validRows if you wanted to allow retry of failures? 
                       // No, the success ones are committed. We should clear validRows so they aren't re-submitted.
                       setValidRows([]); 
                    }
                }
            }
        } catch (e) {
             toast({
                title: "Erreur inattendue",
                description: "Une erreur est survenue pendant l'import.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) resetState();
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full bg-white text-[#002366] border-[#002366] rounded-lg py-3 flex items-center justify-center font-semibold text-sm shadow-sm hover:bg-neutral-50 transition-colors mt-3">
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    Importation de masse
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Importation de masse (CSV / Excel)</DialogTitle>
                    <DialogDescription>
                        Importez un fichier contenant les colonnes requises : <br/>
                        <code className="text-xs font-mono bg-muted p-1 rounded">NOM, PRÉNOM, NOM ET PRÉNOMS COMPLETS, TÉLÉPHONE, ADRESSE, EMAIL</code>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!file ? (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center flex flex-col items-center justify-center hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                            <p className="font-semibold text-sm">Cliquez pour sélectionner un fichier</p>
                            <p className="text-xs text-muted-foreground mt-1">.csv, .xls, .xlsx acceptés</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv,.xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted/20 border rounded-lg">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileSpreadsheet className="h-6 w-6 text-primary shrink-0" />
                                    <div className="truncate">
                                        <p className="text-sm font-semibold truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={resetState} disabled={isParsing || isSubmitting}>
                                    Changer
                                </Button>
                            </div>

                            {isParsing ? (
                                <div className="flex items-center justify-center py-8 flex-col gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">Analyse du fichier...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                                            <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                                                <CheckCircle2 className="h-5 w-5" />
                                                <span>{validRows.length} Valides</span>
                                            </div>
                                            <p className="text-xs text-green-600/80">Lignes prêtes à être importées</p>
                                        </div>
                                        <div className={`p-4 rounded-lg border ${errorRows.length > 0 ? "bg-red-50 border-red-200" : "bg-neutral-50 border-neutral-200"}`}>
                                            <div className={`flex items-center gap-2 font-semibold mb-1 ${errorRows.length > 0 ? "text-red-700" : "text-neutral-500"}`}>
                                                <AlertTriangle className="h-5 w-5" />
                                                <span>{errorRows.length} Erreurs</span>
                                            </div>
                                            <p className={`text-xs ${errorRows.length > 0 ? "text-red-600/80" : "text-neutral-500"}`}>Lignes ignorées ou invalides</p>
                                        </div>
                                    </div>

                                    {errorRows.length > 0 && (
                                        <div className="bg-red-50/50 border border-red-100 rounded-lg p-3 max-h-40 overflow-y-auto text-xs space-y-2">
                                            <p className="font-semibold text-red-800">Détail des erreurs :</p>
                                            {errorRows.map((err, i) => (
                                                <div key={i} className="text-red-700">
                                                    <span className="font-semibold">Ligne {err.row}:</span> {err.errors.join(", ")}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t pt-4 mt-2">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        Annuler
                    </Button>
                    <Button 
                        onClick={handleImport} 
                        disabled={validRows.length === 0 || isParsing || isSubmitting}
                        className="bg-[#002366] hover:bg-[#002366]/90 text-white"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Importer {validRows.length > 0 ? `(${validRows.length})` : ""}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
