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

  function setupMock(
    member: any,
    blackouts: any[] = [],
    contributions: any[] = [],
    investments: any[] = []
  ) {
    const chainBuilder = (data: any, singleData: any = null) => {
      const chain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      
      // Makes the chain await-able
      chain.then = (resolve: any) => resolve({ data, error: null });
      
      if (singleData !== null) {
        chain.single = jest.fn().mockResolvedValue({ data: singleData, error: null });
      } else {
        chain.single = jest.fn().mockResolvedValue({ data: null, error: new Error("Not found") });
      }

      return chain;
    };

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === "Members") return chainBuilder(null, member);
        if (table === "BlackoutMonths") return chainBuilder(blackouts);
        if (table === "Contributions") return chainBuilder(contributions);
        if (table === "ProjectInvestments") return chainBuilder(investments);
        return chainBuilder([]);
      })
    };

    (createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
  }

  it("calculates balance correctly with no blackout months and simple payload", async () => {
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
    setupMock(
      { id: "user-1", join_date: "2024-01-01", monthly_fee: 1000, status: "ACTIVE" },
      [], [], []
    );

    const result = await getMemberBalance("user-1");
    
    expect(result.unpaidMonths).toBe(27);
    expect(result.status).toBe("INACTIVE");
  });
});
