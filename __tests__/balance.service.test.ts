import { getMemberBalance } from "../lib/services/balance.service";
import { createServerSupabaseClient } from "../lib/supabase/client";

jest.mock("../lib/supabase/client", () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe("Balance Calculation Engine", () => {
  const mockDate = new Date("2026-03-15T12:00:00Z");

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // ─────────────────────────────────────────────────────
  //  Helper: build mock supabase client
  // ─────────────────────────────────────────────────────
  function setupMock(
    member: object,
    blackouts: object[] = [],
    contributions: object[] = [],
    investments: object[] = []
  ) {
    const makeChain = (data: object | null, singleData: object | null = null) => {
      const chain: Record<string, unknown> = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      // Makes the chain await-able (non-.single() callers)
      chain.then = (resolve: (val: { data: object | null; error: null }) => void) =>
        resolve({ data, error: null });

      if (singleData !== null) {
        chain.single = jest.fn().mockResolvedValue({ data: singleData, error: null });
      } else {
        chain.single = jest.fn().mockResolvedValue({ data: null, error: new Error("Not found") });
      }

      return chain;
    };

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === "Members") return makeChain(null, member);
        if (table === "BlackoutMonths") return makeChain(blackouts);
        if (table === "Contributions") return makeChain(contributions);
        if (table === "ProjectInvestments") return makeChain(investments);
        return makeChain([]);
      }),
    };

    (createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
  }

  // ─────────────────────────────────────────────────────
  //  Existing Core Tests
  // ─────────────────────────────────────────────────────

  it("calculates balance correctly with no blackout months and simple payload", async () => {
    // Mock date is 2026-03-15. Join date 2026-01-01 → 3 months (Jan, Feb, Mar)
    setupMock(
      { id: "user-1", join_date: "2026-01-01", monthly_fee: 1000, status: "ACTIVE" },
      [],
      [{ amount: 1000, status: "VALIDATED" }, { amount: 1000, status: "VALIDATED" }],
      []
    );

    const result = await getMemberBalance("user-1");

    expect(result.totalPaid).toBe(2000);
    expect(result.operatingFees).toBeCloseTo(333.33, 1);
    expect(result.totalSavings).toBeCloseTo(1666.67, 1);
    expect(result.availableBalance).toBeCloseTo(1666.67, 1);
    expect(result.theoreticalDebt).toBe(3000);
    expect(result.arrears).toBe(1000);
    expect(result.unpaidMonths).toBe(1);
    expect(result.status).toBe("ACTIVE");
  });

  it("handles blackout months properly", async () => {
    // Feb 2026 is blacked out → only Jan and Mar are active = 2 months
    setupMock(
      { id: "user-1", join_date: "2026-01-01", monthly_fee: 1000, status: "ACTIVE" },
      [{ month: 2, year: 2026, is_active: true }],
      [{ amount: 1000, status: "VALIDATED" }],
      []
    );

    const result = await getMemberBalance("user-1");

    expect(result.theoreticalDebt).toBe(2000);
    expect(result.arrears).toBe(1000);
  });

  it("deducts investments from available balance", async () => {
    setupMock(
      { id: "user-1", join_date: "2026-01-01", monthly_fee: 1200, status: "ACTIVE" },
      [],
      [{ amount: 1200, status: "VALIDATED" }], // 1200 * 10/12 = 1000
      [{ amount: 400 }]
    );

    const result = await getMemberBalance("user-1");

    expect(result.totalSavings).toBe(1000);
    expect(result.availableBalance).toBe(600);
  });

  it("triggers INACTIVE status if unpaid months >= 24", async () => {
    // Mock date 2026-03-15; join 2024-01-01 → 27 months, fee 1000, no payments
    setupMock(
      { id: "user-1", join_date: "2024-01-01", monthly_fee: 1000, status: "ACTIVE" },
      [],
      [],
      []
    );

    const result = await getMemberBalance("user-1");

    expect(result.unpaidMonths).toBe(27);
    expect(result.status).toBe("INACTIVE");
  });

  // ─────────────────────────────────────────────────────
  //  New Edge Case Tests (Task 3)
  // ─────────────────────────────────────────────────────

  describe("Edge Cases", () => {
    it("handles a leap year join date correctly (Feb 29)", async () => {
      // 2024 is a leap year. Member joined Feb 29 2024.
      // Mock date is 2026-03-15 → months from 2024-02 to 2026-03 = 26 months
      setupMock(
        { id: "user-leap", join_date: "2024-02-29", monthly_fee: 500, status: "ACTIVE" },
        [],
        [],
        []
      );

      const result = await getMemberBalance("user-leap");

      // 2024-02 through 2026-03 = (2026-2024)*12 + (3-2) + 1 = 24+1+1 = 26
      expect(result.theoreticalDebt).toBe(26 * 500);
      expect(result.unpaidMonths).toBe(26);
      expect(result.arrears).toBe(26 * 500);
    });

    it("handles multiple non-sequential blackout months correctly", async () => {
      // 3 active months but 2 of them are blacked out → only 1 active
      setupMock(
        { id: "user-2", join_date: "2026-01-01", monthly_fee: 1000, status: "ACTIVE" },
        [
          { month: 2, year: 2026, is_active: true }, // Feb blacked out
          { month: 3, year: 2026, is_active: true }, // Mar blacked out
        ],
        [],
        []
      );

      const result = await getMemberBalance("user-2");

      // Only Jan 2026 is active
      expect(result.theoreticalDebt).toBe(1000);
      expect(result.arrears).toBe(1000);
      expect(result.unpaidMonths).toBe(1);
    });

    it("handles a very old join date (10+ years ago)", async () => {
      // Joined Jan 2010. Mock date is Mar 2026 → 195 months
      setupMock(
        { id: "user-old", join_date: "2010-01-01", monthly_fee: 200, status: "ACTIVE" },
        [],
        [],
        []
      );

      const result = await getMemberBalance("user-old");

      const expectedMonths = 195; // Jan 2010 → Mar 2026 inclusive
      expect(result.theoreticalDebt).toBe(expectedMonths * 200);
      expect(result.unpaidMonths).toBe(expectedMonths);
      expect(result.status).toBe("INACTIVE"); // 195 >= 24
    });

    it("returns zero arrears when member has paid more than theoretical debt", async () => {
      // Overpayment scenario
      setupMock(
        { id: "user-overpaid", join_date: "2026-01-01", monthly_fee: 1000, status: "ACTIVE" },
        [],
        [{ amount: 10000, status: "VALIDATED" }], // paid 10x the 3-month debt
        []
      );

      const result = await getMemberBalance("user-overpaid");

      expect(result.arrears).toBe(0);
      expect(result.unpaidMonths).toBe(0);
      expect(result.status).toBe("ACTIVE");
    });

    it("prevents division by zero when monthly_fee is 0", async () => {
      setupMock(
        { id: "user-zerofee", join_date: "2026-01-01", monthly_fee: 0, status: "ACTIVE" },
        [],
        [],
        []
      );

      const result = await getMemberBalance("user-zerofee");

      expect(result.theoreticalDebt).toBe(0);
      expect(result.arrears).toBe(0);
      expect(result.unpaidMonths).toBe(0); // no division by zero
      expect(result.status).toBe("ACTIVE");
    });

    it("handles blackout months that span across year boundary", async () => {
      // Dec 2025 and Jan 2026 are blacked out
      // Jan 2026 join → 3 months but 2 blacked out → 1 active (Mar only)
      setupMock(
        { id: "user-cross", join_date: "2025-12-01", monthly_fee: 800, status: "ACTIVE" },
        [
          { month: 12, year: 2025, is_active: true },
          { month: 1, year: 2026, is_active: true },
        ],
        [],
        []
      );

      const result = await getMemberBalance("user-cross");

      // Dec 2025, Jan 2026, Feb 2026, Mar 2026 = 4 months, 2 blacked out → 2 active
      expect(result.theoreticalDebt).toBe(2 * 800);
    });

    it("returns ACTIVE status for exactly 23 unpaid months (boundary check)", async () => {
      // Need exactly 23 months of debt. Mock date 2026-03.
      // Join 2024-05-01 → months: May 2024 – Mar 2026 = 23 months
      setupMock(
        { id: "user-boundary", join_date: "2024-05-01", monthly_fee: 1000, status: "ACTIVE" },
        [],
        [],
        []
      );

      const result = await getMemberBalance("user-boundary");

      expect(result.unpaidMonths).toBe(23);
      expect(result.status).toBe("ACTIVE"); // exactly at boundary — still ACTIVE
    });

    it("returns INACTIVE status for exactly 24 unpaid months (boundary check)", async () => {
      // Join 2024-04-01 → months: Apr 2024 – Mar 2026 = 24 months
      setupMock(
        { id: "user-inactive-boundary", join_date: "2024-04-01", monthly_fee: 1000, status: "ACTIVE" },
        [],
        [],
        []
      );

      const result = await getMemberBalance("user-inactive-boundary");

      expect(result.unpaidMonths).toBe(24);
      expect(result.status).toBe("INACTIVE"); // 24 >= 24 → INACTIVE
    });

    it("handles empty blackout months list gracefully", async () => {
      // No blackouts returned from DB (null/undefined edge case)
      setupMock(
        { id: "user-null-blackouts", join_date: "2026-02-01", monthly_fee: 500, status: "ACTIVE" },
        [], // empty array (simulates DB returning empty result)
        [{ amount: 500, status: "VALIDATED" }],
        []
      );

      const result = await getMemberBalance("user-null-blackouts");

      // Feb + Mar = 2 months
      expect(result.theoreticalDebt).toBe(1000);
      expect(result.arrears).toBe(500);
    });
  });

  // ─────────────────────────────────────────────────────
  //  Error Handling Tests
  // ─────────────────────────────────────────────────────
  
  describe("Error Handling", () => {
    it("throws an error if BlackoutMonths query fails", async () => {
      const mockSupabase = {
        from: jest.fn((table: string) => {
          const chain: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
          if (table === "Members") {
            chain.single = jest.fn().mockResolvedValue({ data: { join_date: "2026-01-01", monthly_fee: 1000, status: "ACTIVE" }, error: null });
            return chain;
          }
          if (table === "BlackoutMonths") {
            chain.then = (resolve: any) => resolve({ data: null, error: new Error("DB Error Blackouts") });
            return chain;
          }
          chain.then = (resolve: any) => resolve({ data: [], error: null });
          return chain;
        }),
      };
      (createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(getMemberBalance("user-error")).rejects.toThrow("Failed to fetch BlackoutMonths: DB Error Blackouts");
    });

    it("throws an error if Contributions query fails", async () => {
      const mockSupabase = {
        from: jest.fn((table: string) => {
          const chain: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
          if (table === "Members") {
            chain.single = jest.fn().mockResolvedValue({ data: { join_date: "2026-01-01", monthly_fee: 1000, status: "ACTIVE" }, error: null });
            return chain;
          }
          if (table === "Contributions") {
            chain.then = (resolve: any) => resolve({ data: null, error: new Error("DB Error Contributions") });
            return chain;
          }
          chain.then = (resolve: any) => resolve({ data: [], error: null });
          return chain;
        }),
      };
      (createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(getMemberBalance("user-error")).rejects.toThrow("Failed to fetch Contributions: DB Error Contributions");
    });
  });
});
