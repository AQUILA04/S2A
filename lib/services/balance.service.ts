import { createServerSupabaseClient } from "@/lib/supabase/client";
import { z } from "zod";

// ─────────────────────────────────────────────────────
//  Timeline Entry Schema
// ─────────────────────────────────────────────────────

export const timelineEntrySchema = z.object({
  month: z.number(),
  year: z.number(),
  amount: z.number(),
  status: z.enum(["PAID", "UNPAID", "BLACKOUT"]),
  note: z.string().optional(),
});

export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

// ─────────────────────────────────────────────────────
//  Zod Schema (strict, exportable for server actions)
// ─────────────────────────────────────────────────────

export const memberBalanceConfigSchema = z.object({
  totalPaid: z.number(),
  operatingFees: z.number(),
  totalSavings: z.number(),
  availableBalance: z.number(),
  theoreticalDebt: z.number(),
  arrears: z.number(),
  unpaidMonths: z.number(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  timeline: z.array(timelineEntrySchema),
});

export type MemberBalanceConfig = z.infer<typeof memberBalanceConfigSchema>;

// ─────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────

const OPERATING_FEE_RATIO = 2 / 12;
const SAVINGS_RATIO = 10 / 12;

// ─────────────────────────────────────────────────────
//  Core Algorithm
// ─────────────────────────────────────────────────────

export async function getMemberBalance(memberId: string): Promise<MemberBalanceConfig> {
  const supabase = createServerSupabaseClient();

  // Step 1: Fetch Member info (must come first — join_date & monthly_fee needed for timeline)
  const { data: member, error: memberErr } = await supabase
    .from("Members")
    .select("join_date, monthly_fee, status")
    .eq("id", memberId)
    .single();

  if (memberErr || !member) throw new Error("Member not found");

  // Step 2: Concurrently fetch BlackoutMonths, Contributions, and ProjectInvestments
  // NOTE: We now fetch month & year from Contributions for timeline population
  const [blackoutResult, contributionsResult, investmentsResult] = await Promise.all([
    supabase.from("BlackoutMonths").select("month, year").eq("is_active", true),
    supabase.from("Contributions").select("amount, month, year").eq("member_id", memberId).eq("status", "VALIDATED"),
    supabase.from("ProjectInvestments").select("amount").eq("member_id", memberId).eq("status", "VALIDATED"),
  ]);

  if (blackoutResult.error) throw new Error(`Failed to fetch BlackoutMonths: ${blackoutResult.error.message}`);
  if (contributionsResult.error) throw new Error(`Failed to fetch Contributions: ${contributionsResult.error.message}`);
  if (investmentsResult.error) throw new Error(`Failed to fetch ProjectInvestments: ${investmentsResult.error.message}`);

  // ── Blackout months set (safe even if empty) ──────────────────────────────
  const blackouts = new Set(
    (blackoutResult.data || []).map(
      (b: { month: number; year: number }) =>
        `${b.year}-${String(b.month).padStart(2, "0")}`
    )
  );

  // ── Build contribution lookup by month key "YYYY-MM" ─────────────────────
  // Each entry corresponds to a VALIDATED contribution for a specific month.
  // If a member paid in bulk (single entry covering multiple months), the
  // lookup will use the declared month/year from the contribution record.
  const paidMonths = new Set<string>();
  const paidAmounts = new Map<string, number>();

  for (const c of contributionsResult.data || []) {
    const contribution = c as { amount: number | string; month: number; year: number };
    if (contribution.month && contribution.year) {
      const key = `${contribution.year}-${String(contribution.month).padStart(2, "0")}`;
      paidMonths.add(key);
      paidAmounts.set(key, (paidAmounts.get(key) ?? 0) + Number(contribution.amount));
    }
  }

  // ── Timeline Filtering & Theoretical Debt ────────────────────────────────
  // Timezone-safe: we work with UTC midnight of the 1st so local tz differences
  // don't cause off-by-one month errors across the timeline.
  const joinDate = new Date(member.join_date + "T00:00:00Z");
  const now = new Date();
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  if (isNaN(joinDate.getTime())) throw new Error("Invalid join_date for member");

  let activeMonthCount = 0;
  let iterDate = new Date(Date.UTC(joinDate.getUTCFullYear(), joinDate.getUTCMonth(), 1));

  const timeline: TimelineEntry[] = [];

  while (iterDate <= endDate) {
    const year = iterDate.getUTCFullYear();
    const month = iterDate.getUTCMonth() + 1; // 1-indexed
    const key = `${year}-${String(month).padStart(2, "0")}`;

    if (blackouts.has(key)) {
      // Blackout month: excluded from debt calculations
      timeline.push({
        month,
        year,
        amount: 0,
        status: "BLACKOUT",
        note: "Mois suspendu (congé collectif)",
      });
    } else {
      activeMonthCount++;
      if (paidMonths.has(key)) {
        // Paid month
        timeline.push({
          month,
          year,
          amount: paidAmounts.get(key) ?? 0,
          status: "PAID",
        });
      } else {
        // Unpaid month
        timeline.push({
          month,
          year,
          amount: 0,
          status: "UNPAID",
        });
      }
    }

    iterDate.setUTCMonth(iterDate.getUTCMonth() + 1);
  }

  // Guard: prevent NaN if monthly_fee is null/undefined/zero
  const monthlyFee = Number(member.monthly_fee) || 0;
  const theoreticalDebt = activeMonthCount * monthlyFee;

  // ── Realized Income (VALIDATED contributions only) ───────────────────────
  const totalPaid = (contributionsResult.data || []).reduce(
    (acc: number, c: { amount: number | string }) => acc + Number(c.amount),
    0
  );

  // ── 10/12 Prorated Allocation ─────────────────────────────────────────────
  const operatingFees = totalPaid * OPERATING_FEE_RATIO;
  const totalSavings = totalPaid * SAVINGS_RATIO;

  // ── Project Investments deduction ─────────────────────────────────────────
  const totalInvested = (investmentsResult.data || []).reduce(
    (acc: number, i: { amount: number | string }) => acc + Number(i.amount),
    0
  );
  const availableBalance = totalSavings - totalInvested;

  // ── Arrears & Status ──────────────────────────────────────────────────────
  const arrears = Math.max(0, theoreticalDebt - totalPaid);

  // Prevent division by zero; if fee is 0 there are effectively 0 unpaid months
  const unpaidMonths = monthlyFee > 0 ? arrears / monthlyFee : 0;

  let computedStatus: "ACTIVE" | "INACTIVE" = member.status as "ACTIVE" | "INACTIVE";
  if (unpaidMonths >= 24) {
    computedStatus = "INACTIVE";
  }

  return {
    totalPaid,
    operatingFees,
    totalSavings,
    availableBalance,
    theoreticalDebt,
    arrears,
    unpaidMonths,
    status: computedStatus,
    timeline,
  };
}
