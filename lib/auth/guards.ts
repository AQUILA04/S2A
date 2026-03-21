import { getMemberBalance, MemberBalanceConfig } from "@/lib/services/balance.service";

/**
 * Ensures that the member has an ACTIVE status, taking into account
 * theoretical debt and arrears calculation (e.g., >= 24 months unpaid).
 * Throws an Error if the computed status is INACTIVE.
 * Meant to be used in future Server Actions to protect investment routes.
 * 
 * @param memberId The ID of the member.
 * @returns The computed MemberBalanceConfig so it can be reused by the action.
 */
export async function requireActiveMember(memberId: string): Promise<MemberBalanceConfig> {
    const balance = await getMemberBalance(memberId);
    if (balance.status !== "ACTIVE") {
        throw new Error("Action unavailable: Member account is INACTIVE.");
    }
    return balance;
}
