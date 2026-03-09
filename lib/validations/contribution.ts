import { z } from "zod";

export const contributionSchema = z.object({
    amount: z.coerce.number().int().positive("Amount must be greater than 0"),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2016),
    payment_channel: z.enum(["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "INTL_TRANSFER"]),
    reference_id: z.string().optional(),
}).refine(data => {
    const now = new Date();
    if (data.year > now.getFullYear()) return false;
    if (data.year === now.getFullYear() && data.month > (now.getMonth() + 1)) return false;
    return true;
}, {
    message: "Le mois et l'année ne peuvent pas être dans le futur",
    path: ["month"]
}).refine(data => {
    if (data.payment_channel !== "CASH" && (!data.reference_id || data.reference_id.trim() === "")) {
        return false;
    }
    return true;
}, {
    message: "Reference ID is required for digital payments",
    path: ["reference_id"]
});

export type ContributionInput = z.infer<typeof contributionSchema>;

export const multiMonthContributionSchema = z.object({
    member_id: z.string().uuid("Invalid member ID format"),
    amount: z.coerce.number().int().positive("Amount must be greater than 0"),
    months: z.array(z.coerce.number().int().min(1).max(12)).min(1, "Veuillez sélectionner au moins un mois"),
    year: z.coerce.number().int().min(2016),
    payment_channel: z.enum(["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "INTL_TRANSFER"]),
    reference_id: z.string().optional(),
}).refine(data => {
    const now = new Date();
    if (data.year > now.getFullYear()) return false;
    const maxMonth = Math.max(...data.months);
    if (data.year === now.getFullYear() && maxMonth > (now.getMonth() + 1)) return false;
    return true;
}, {
    message: "Les mois et l'année ne peuvent pas être dans le futur",
    path: ["months"]
}).refine(data => {
    if (data.payment_channel !== "CASH" && (!data.reference_id || data.reference_id.trim() === "")) {
        return false;
    }
    return true;
}, {
    message: "Reference ID is required for digital payments",
    path: ["reference_id"]
});

export type MultiMonthContributionInput = z.infer<typeof multiMonthContributionSchema>;

export interface ActionResult<T> {
    data?: T;
    error?: string;
    fieldErrors?: Record<string, string[]>;
}
