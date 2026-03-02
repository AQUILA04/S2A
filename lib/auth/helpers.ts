/**
 * Shared authentication helper functions.
 * Exported for use in both the auth route and unit tests.
 * These are pure utilities — no dependencies on NextAuth, Supabase, or env vars.
 */

import * as bcrypt from "bcryptjs";
import { z } from "zod";
import type { MemberStatus } from "@/types/database.types";

// ============================================================
// Zod validation schema (re-exported for tests)
// ============================================================

export const credentialsSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

// ============================================================
// Password helpers
// ============================================================

const BCRYPT_SALT_ROUNDS = 12;

/** Hash a plaintext password using bcrypt. */
export async function hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_SALT_ROUNDS);
}

/** Compare a plaintext password against a bcrypt hash. Returns true if they match. */
export async function verifyPassword(
    plaintext: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
}

// ============================================================
// Account status helpers
// ============================================================

/** Returns true only if the account is ACTIVE. */
export function isAccountActive(status: MemberStatus): boolean {
    return status === "ACTIVE";
}
