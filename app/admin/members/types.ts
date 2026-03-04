/**
 * Member Management — Shared types and Zod schemas
 *
 * Kept in a separate file (NOT "use server") so they can be imported
 * by both server actions and client components without triggering the
 * "use server can only export async functions" constraint.
 */

import { z } from "zod";

// ============================================================
// Zod Schemas
// ============================================================

export const createMemberSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().min(1, "Phone number is required"),
    join_date: z.string().min(1, "Join date is required"),
    monthly_fee: z
        .number({ invalid_type_error: "Monthly fee must be a number" })
        .min(0, "Monthly fee must be ≥ 0"),
    role: z.enum(["MEMBER", "PRESIDENT", "SG", "SG_ADJOINT", "TREASURER", "TRESORIER_ADJOINT"]),
    password: z.string().min(8, "Initial password must be at least 8 characters"),
});

export const updateMemberSchema = z.object({
    first_name: z.string().min(1, "First name is required").optional(),
    last_name: z.string().min(1, "Last name is required").optional(),
    phone: z.string().min(1, "Phone number is required").optional(),
    monthly_fee: z
        .number({ invalid_type_error: "Monthly fee must be a number" })
        .min(0, "Monthly fee must be ≥ 0")
        .optional(),
    role: z
        .enum(["MEMBER", "PRESIDENT", "SG", "SG_ADJOINT", "TREASURER", "TRESORIER_ADJOINT"])
        .optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    account_status: z.enum(["PENDING_ACTIVATION", "ACTIVE"]).optional(),
});

// ============================================================
// Shared Result Type
// ============================================================

export interface ActionResult<T> {
    data?: T;
    error?: string;
    fieldErrors?: Record<string, string[]>;
}
