import { createServerSupabaseClient } from "@/lib/supabase/client";

export interface MemberBalanceConfig {
  totalPaid: number;
  operatingFees: number;
  totalSavings: number;
  availableBalance: number;
  theoreticalDebt: number;
  arrears: number;
  unpaidMonths: number;
  status: "ACTIVE" | "INACTIVE";
}

export async function getMemberBalance(memberId: string): Promise<MemberBalanceConfig> {
  const supabase = createServerSupabaseClient();

  // 1. Fetch Member info
  const { data: member, error: memberErr } = await supabase
    .from("Members")
    .select("join_date, monthly_fee, status")
    .eq("id", memberId)
    .single();

  if (memberErr || !member) throw new Error("Member not found");

  // 2. Fetch BlackoutMonths
  const { data: blackoutData } = await supabase
    .from("BlackoutMonths")
    .select("month, year")
    .eq("is_active", true);

  const blackouts = new Set(
    (blackoutData || []).map((b: any) => `${b.year}-${String(b.month).padStart(2, "0")}`)
  );

  // 3. Timeline Filtering & Theoretical Debt computation
  let activeMonthCount = 0;
  const joinDate = new Date(member.join_date);
  const currentDate = new Date();
  
  // We iterate month by month from joinDate to currentDate
  // Include both the join month and current month
  let iterDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  while (iterDate <= endDate) {
    const key = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, "0")}`;
    if (!blackouts.has(key)) {
      activeMonthCount++;
    }
    iterDate.setMonth(iterDate.getMonth() + 1);
  }

  const theoreticalDebt = activeMonthCount * Number(member.monthly_fee);

  // 4. Realized Income & Validated Contributions
  const { data: contributions } = await supabase
    .from("Contributions")
    .select("amount")
    .eq("member_id", memberId)
    .eq("status", "VALIDATED");

  const totalPaid = (contributions || []).reduce((acc: number, c: any) => acc + Number(c.amount), 0);

  // 5. 10/12 Prorated Allocation
  const operatingFees = totalPaid * (2 / 12);
  const totalSavings = totalPaid * (10 / 12);

  // 6. Project Investments deduction
  const { data: investments } = await supabase
    .from("ProjectInvestments")
    .select("amount")
    .eq("member_id", memberId);

  const totalInvested = (investments || []).reduce((acc: number, i: any) => acc + Number(i.amount), 0);
  const availableBalance = totalSavings - totalInvested;

  // 7. Status Check
  const arrears = Math.max(0, theoreticalDebt - totalPaid);
  const currentMonthlyFee = Number(member.monthly_fee) || 1; // prevent div/0
  const unpaidMonths = arrears / currentMonthlyFee;
  
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
  };
}
