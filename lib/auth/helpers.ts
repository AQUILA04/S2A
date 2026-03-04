/**
 * Shared authentication helper functions.
 * Exported for use in both the auth route and unit tests.
 * These are pure utilities — no dependencies on NextAuth, Supabase, or env vars.
 */

import * as bcrypt from "bcryptjs";
import { z } from "zod";
import type { MemberRole, MemberStatus } from "@/types/database.types";

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

// ============================================================
// Role-hierarchy helpers (Story 1.3 — AC5)
//
// Role hierarchy (from highest to lowest privilege):
//   PRESIDENT         → all rights (SG + TREASURER + admin settings)
//   SG                → write access to Members & General Assemblies
//   SG_ADJOINT        → inherits SG rights
//   TREASURER         → write access to Contributions, Validation & Settings
//   TRESORIER_ADJOINT → inherits TREASURER rights
//   MEMBER            → read-only access to own dashboard
// ============================================================

/**
 * Effective roles for each role, including inherited ones.
 * PRESIDENT implicitly has every role, so it is always added.
 */
const ROLE_INHERITANCE: Record<MemberRole, MemberRole[]> = {
    PRESIDENT: ["PRESIDENT", "SG", "SG_ADJOINT", "TREASURER", "TRESORIER_ADJOINT", "MEMBER"],
    SG: ["SG", "SG_ADJOINT", "MEMBER"],
    SG_ADJOINT: ["SG_ADJOINT", "SG", "MEMBER"],
    TREASURER: ["TREASURER", "TRESORIER_ADJOINT", "MEMBER"],
    TRESORIER_ADJOINT: ["TRESORIER_ADJOINT", "TREASURER", "MEMBER"],
    MEMBER: ["MEMBER"],
};

/**
 * Returns true if the given `userRole` satisfies at least one of the `allowedRoles`,
 * taking the role hierarchy into account.
 *
 * Usage in server actions:
 * ```ts
 * if (!hasRequiredRole(session.user.role, ["SG", "PRESIDENT"])) {
 *   throw new Error("Unauthorized");
 * }
 * ```
 *
 * Usage in middleware:
 * ```ts
 * if (!hasRequiredRole(token.role, ADMIN_ROLES)) { redirect ... }
 * ```
 *
 * @param userRole   - The role of the authenticated user.
 * @param allowedRoles - The set of roles that are permitted to perform the action.
 */
export function hasRequiredRole(
    userRole: MemberRole,
    allowedRoles: MemberRole[]
): boolean {
    const effectiveRoles = ROLE_INHERITANCE[userRole] ?? [];
    return allowedRoles.some((allowed) => effectiveRoles.includes(allowed));
}
