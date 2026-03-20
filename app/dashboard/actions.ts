"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getMemberBalance, memberBalanceConfigSchema, type MemberBalanceConfig } from "@/lib/services/balance.service";
import { z } from "zod";

// ─────────────────────────────────────────────────────
//  Input Schema
// ─────────────────────────────────────────────────────

const getMemberBalanceInputSchema = z.object({
  memberId: z.string().uuid("Invalid member ID format"),
});

// ─────────────────────────────────────────────────────
//  Action Result Type
// ─────────────────────────────────────────────────────

export interface BalanceActionResult {
  data?: MemberBalanceConfig;
  error?: string;
}

// ─────────────────────────────────────────────────────
//  RBAC Roles allowed to query any member's balance
// ─────────────────────────────────────────────────────

const PRIVILEGED_ROLES = ["PRESIDENT", "SG", "TREASURER"] as const;

// ─────────────────────────────────────────────────────
//  Server Action: getMemberBalanceAction
// ─────────────────────────────────────────────────────

/**
 * Secure server action to fetch a member's balance.
 *
 * RBAC Policy (IDOR Prevention):
 *   - A MEMBER can only fetch their OWN balance (currentUser.id === requestedMemberId).
 *   - Users with a PRIVILEGED_ROLE (PRESIDENT, SG, TREASURER) can fetch any member's balance.
 *   - All other cases return UNAUTHORIZED.
 */
export async function getMemberBalanceAction(rawInput: unknown): Promise<BalanceActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "UNAUTHORIZED: Not authenticated" };
  }

  // Validate and parse input payload
  const parsed = getMemberBalanceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: `INVALID_INPUT: ${parsed.error.errors.map((e) => e.message).join(", ")}` };
  }

  const { memberId } = parsed.data;
  const currentUserId = session.user.id as string;
  const currentUserRole = session.user.role as string;

  // RBAC: IDOR prevention
  const isSelf = currentUserId === memberId;
  const isPrivileged = (PRIVILEGED_ROLES as readonly string[]).includes(currentUserRole);

  if (!isSelf && !isPrivileged) {
    return { error: "UNAUTHORIZED: Insufficient permissions to access this member's balance" };
  }

  try {
    const rawBalance = await getMemberBalance(memberId);

    // Validate the service output against the strict Zod schema before returning
    const balanceResult = memberBalanceConfigSchema.safeParse(rawBalance);
    if (!balanceResult.success) {
      return { error: "INTERNAL_ERROR: Balance service returned unexpected data shape" };
    }

    return { data: balanceResult.data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `INTERNAL_ERROR: ${message}` };
  }
}
