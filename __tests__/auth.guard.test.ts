import { requireActiveMember } from "@/lib/auth/guards";
import { getMemberBalance } from "@/lib/services/balance.service";

jest.mock("@/lib/services/balance.service");

describe("Auth Guards - requireActiveMember", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should allow an ACTIVE member and return their balance configuration", async () => {
        const mockBalance = { status: "ACTIVE", availableBalance: 15000, arrears: 0 };
        (getMemberBalance as jest.Mock).mockResolvedValue(mockBalance);

        const result = await requireActiveMember("member-xyz");
        expect(getMemberBalance).toHaveBeenCalledWith("member-xyz");
        expect(result).toEqual(mockBalance);
    });

    it("should throw an error for an INACTIVE member", async () => {
        const mockBalance = { status: "INACTIVE", availableBalance: 0, arrears: 120000 };
        (getMemberBalance as jest.Mock).mockResolvedValue(mockBalance);

        await expect(requireActiveMember("member-abc")).rejects.toThrow("Action unavailable: Member account is INACTIVE.");
        expect(getMemberBalance).toHaveBeenCalledWith("member-abc");
    });
});
