import { z } from "zod";
import type { PaymentChannel } from "@/types/database.types";

export const PAYMENT_CHANNEL_TYPES: [PaymentChannel, ...PaymentChannel[]] = [
    "CASH",
    "MOBILE_MONEY",
    "BANK_TRANSFER",
    "INTL_TRANSFER",
];

export const paymentChannelIdSchema = z.string().uuid("Invalid payment channel ID");

export const createPaymentChannelSchema = z.object({
    provider_name: z.string().min(1, "Provider name is required").max(100),
    channel_type: z.enum(PAYMENT_CHANNEL_TYPES),
    account_number: z.string().min(1, "Account/phone number is required").max(100),
    instructions: z.string().max(500).optional().nullable(),
});

export const updatePaymentChannelSchema = z.object({
    provider_name: z.string().min(1, "Provider name is required").max(100).optional(),
    channel_type: z.enum(PAYMENT_CHANNEL_TYPES).optional(),
    account_number: z.string().min(1, "Account/phone number is required").max(100).optional(),
    instructions: z.string().max(500).optional().nullable(),
    is_active: z.boolean().optional(),
});

export type CreatePaymentChannelInput = z.infer<typeof createPaymentChannelSchema>;
export type UpdatePaymentChannelInput = z.infer<typeof updatePaymentChannelSchema>;
