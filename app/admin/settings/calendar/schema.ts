import { z } from "zod";

export const blackoutMonthSchema = z.object({
    year: z.number().int().min(2016, "Year must be 2016 or later"),
    month: z.number().int().min(1, "Invalid month").max(12, "Invalid month"),
    isActive: z.boolean(),
    reason: z.string().optional(),
}).refine(data => !data.isActive || (data.isActive && data.reason && data.reason.trim().length > 0), {
    message: "Reason is required when marking a month as Blackout",
    path: ["reason"]
});

export type BlackoutMonthPayload = z.infer<typeof blackoutMonthSchema>;
