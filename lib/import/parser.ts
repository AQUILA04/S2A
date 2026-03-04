/**
 * Legacy Data Import — File Parser & Zod Schemas
 *
 * Handles both Excel (.xlsx/.xls) and CSV (.csv) file formats.
 * Transforms one row into up to 12 separate Contribution records (one per paid month).
 *
 * Expected column format (case-insensitive trim):
 *   noms | téléphone | janvier | fevrier | mars | avril | mai | juin |
 *   juillet | aout | septembre | octobre | novembre | decembre | annee
 */

import * as XLSX from "xlsx";
import { z } from "zod";
import type { PaymentChannel } from "@/types/database.types";

// ============================================================
// Constants
// ============================================================

const MONTH_COLUMNS = [
    "janvier",
    "fevrier",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "aout",
    "septembre",
    "octobre",
    "novembre",
    "decembre",
] as const;

// Map month column name to month number (1-indexed)
const MONTH_INDEX: Record<(typeof MONTH_COLUMNS)[number], number> = {
    janvier: 1,
    fevrier: 2,
    mars: 3,
    avril: 4,
    mai: 5,
    juin: 6,
    juillet: 7,
    aout: 8,
    septembre: 9,
    octobre: 10,
    novembre: 11,
    decembre: 12,
};

// ============================================================
// Zod schema for a raw spreadsheet row
// ============================================================

/**
 * Coerces a cell value to a non-negative number.
 * Accepts string representations like "5000", "", null, undefined → 0 if empty.
 */
const amountSchema = z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
        if (val === null || val === undefined || val === "") return 0;
        const n = Number(String(val).replace(/\s/g, "").replace(",", "."));
        return isNaN(n) ? 0 : n;
    });

export const legacyRowSchema = z.object({
    noms: z
        .union([z.string(), z.number(), z.null(), z.undefined()])
        .transform((v) => String(v ?? "").trim())
        .pipe(z.string().min(1, "Le nom est obligatoire")),
    téléphone: z
        .union([z.string(), z.number(), z.null(), z.undefined()])
        .transform((v) => String(v ?? "").trim().replace(/\s/g, ""))
        .pipe(z.string().min(1, "Le numéro de téléphone est obligatoire")),
    janvier: amountSchema,
    fevrier: amountSchema,
    mars: amountSchema,
    avril: amountSchema,
    mai: amountSchema,
    juin: amountSchema,
    juillet: amountSchema,
    aout: amountSchema,
    septembre: amountSchema,
    octobre: amountSchema,
    novembre: amountSchema,
    decembre: amountSchema,
    annee: z
        .union([z.string(), z.number()])
        .transform((v) => {
            const n = Number(v);
            return isNaN(n) ? 0 : n;
        })
        .pipe(z.number().min(2016, "L'année doit être ≥ 2016").max(2100, "Année invalide")),
});

export type LegacyRowInput = z.input<typeof legacyRowSchema>;
export type LegacyRowParsed = z.infer<typeof legacyRowSchema>;

// ============================================================
// Contribution record generated from one row
// ============================================================

export interface ParsedContribution {
    /** Phone number used to match to a Member */
    phone: string;
    /** Display name from file for traceability */
    memberName: string;
    month: number; // 1-12
    year: number;
    amount: number;
    /** Default channel for legacy data; can be overridden by the user */
    payment_channel: PaymentChannel;
}

// ============================================================
// Per-row parse result (shown in the preview table)
// ============================================================

export interface ParsedRow {
    /** 0-indexed row number from the spreadsheet */
    rowIndex: number;
    rawPhone: string;
    memberName: string;
    year: number;
    contributions: ParsedContribution[];
    /** Validation errors for this row */
    errors: string[];
    /** Whether the row is valid and can be imported */
    isValid: boolean;
}

// ============================================================
// Overall parse result
// ============================================================

export interface FileParseResult {
    rows: ParsedRow[];
    totalRows: number;
    validRows: number;
    errorRows: number;
    totalContributions: number;
    /** Headers detected in the file, for debugging */
    detectedHeaders: string[];
}

// ============================================================
// Helper — normalize header keys
// ============================================================

function normalizeKey(key: string): string {
    return key
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip accents
        .trim();
}

// Map of normalized header → expected schema key
const HEADER_MAP: Record<string, string> = {
    noms: "noms",
    nom: "noms",
    telephone: "téléphone",
    "telephone (indicatif compris)": "téléphone",
    tel: "téléphone",
    phone: "téléphone",
    janvier: "janvier",
    jan: "janvier",
    fevrier: "fevrier",
    "février": "fevrier",
    fev: "fevrier",
    mars: "mars",
    avril: "avril",
    avr: "avril",
    mai: "mai",
    juin: "juin",
    juillet: "juillet",
    jul: "juillet",
    aout: "aout",
    "août": "aout",
    septembre: "septembre",
    sep: "septembre",
    octobre: "octobre",
    oct: "octobre",
    novembre: "novembre",
    nov: "novembre",
    decembre: "decembre",
    "décembre": "decembre",
    dec: "decembre",
    annee: "annee",
    "année": "annee",
    year: "annee",
};

/**
 * Remaps the raw cell keys in a row object to canonical schema keys.
 */
function remapRowKeys(rawRow: Record<string, unknown>): Record<string, unknown> {
    const remapped: Record<string, unknown> = {};
    for (const [rawKey, value] of Object.entries(rawRow)) {
        const normalised = normalizeKey(rawKey);
        const canonical = HEADER_MAP[normalised] ?? rawKey;
        remapped[canonical] = value;
    }
    return remapped;
}

// ============================================================
// Main parser
// ============================================================

/**
 * Parses a raw file Buffer/ArrayBuffer of an Excel or CSV file and returns
 * structured ParsedRow objects ready for the import preview.
 *
 * @param buffer   - raw file contents (Buffer or ArrayBuffer)
 * @param filename - original filename (used to detect CSV vs Excel)
 * @param defaultChannel - payment channel to apply to all legacy contributions
 */
export function parseLegacyFile(
    buffer: Buffer | ArrayBuffer,
    filename: string,
    defaultChannel: PaymentChannel = "CASH"
): FileParseResult {
    const isCsv = filename.toLowerCase().endsWith(".csv");

    const workbook = XLSX.read(buffer, {
        type: "buffer",
        // Use raw values for numeric cells to avoid date mis-parsing
        raw: false,
        // Parse numbers as numbers
        cellText: false,
        cellDates: false,
    });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to array of objects with the first row as header
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
    });

    // Collect raw header keys
    const detectedHeaders = rawRows.length > 0 ? Object.keys(rawRows[0] as Record<string, unknown>) : [];

    const parsedRows: ParsedRow[] = rawRows.map((rawRow, idx) => {
        const remapped = remapRowKeys(rawRow as Record<string, unknown>);
        const result = legacyRowSchema.safeParse(remapped);

        if (!result.success) {
            const errors = result.error.errors.map(
                (e) => `${e.path.join(".")}: ${e.message}`
            );
            return {
                rowIndex: idx,
                rawPhone: String(rawRow["téléphone"] ?? rawRow["telephone"] ?? rawRow["tel"] ?? "").trim(),
                memberName: String(rawRow["noms"] ?? rawRow["nom"] ?? "").trim(),
                year: 0,
                contributions: [],
                errors,
                isValid: false,
            };
        }

        const data = result.data;

        // Build contributions (one per non-zero month amount)
        const contributions: ParsedContribution[] = [];
        for (const monthName of MONTH_COLUMNS) {
            const amount = data[monthName];
            if (amount > 0) {
                contributions.push({
                    phone: data.téléphone,
                    memberName: data.noms,
                    month: MONTH_INDEX[monthName],
                    year: data.annee,
                    amount,
                    payment_channel: defaultChannel,
                });
            }
        }

        return {
            rowIndex: idx,
            rawPhone: data.téléphone,
            memberName: data.noms,
            year: data.annee,
            contributions,
            errors: [],
            isValid: true,
        };
    });

    const validRows = parsedRows.filter((r) => r.isValid).length;
    const totalContributions = parsedRows.reduce(
        (sum, r) => sum + r.contributions.length,
        0
    );

    return {
        rows: parsedRows,
        totalRows: parsedRows.length,
        validRows,
        errorRows: parsedRows.length - validRows,
        totalContributions,
        detectedHeaders,
    };
}

// Re-export MONTH_COLUMNS for use in tests
export { MONTH_COLUMNS, MONTH_INDEX };
