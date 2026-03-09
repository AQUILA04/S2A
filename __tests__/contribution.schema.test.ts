import { contributionSchema } from "@/lib/validations/contribution";

describe("contributionSchema — Zod validation", () => {
    it("passes for valid CASH contribution", () => {
        const payload = {
            amount: 5000,
            month: 1,
            year: 2026,
            payment_channel: "CASH",
        };
        const result = contributionSchema.safeParse(payload);
        expect(result.success).toBe(true);
    });

    it("passes for valid digital contribution with reference_id", () => {
        const payload = {
            amount: 5000,
            month: 1,
            year: 2026,
            payment_channel: "MOBILE_MONEY",
            reference_id: "TXN12345",
        };
        const result = contributionSchema.safeParse(payload);
        expect(result.success).toBe(true);
    });

    it("fails when digital contribution is missing reference_id", () => {
        const payload = {
            amount: 5000,
            month: 1,
            year: 2026,
            payment_channel: "MOBILE_MONEY",
            reference_id: "",
        };
        const result = contributionSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.errors[0].path).toContain("reference_id");
            expect(result.error.errors[0].message).toMatch(/Reference ID is required/i);
        }
    });

    it("fails when amount is missing or invalid", () => {
        const result = contributionSchema.safeParse({
            amount: -100, // Invalid (must be positive)
            month: 1,
            year: 2026,
            payment_channel: "CASH",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.errors[0].path).toContain("amount");
        }
    });

    it("fails when month/year is in the future", () => {
        const now = new Date();
        const result = contributionSchema.safeParse({
            amount: 5000,
            month: 1,
            year: now.getFullYear() + 1, // Next year
            payment_channel: "CASH",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.errors[0].path).toContain("month");
            expect(result.error.errors[0].message).toMatch(/dans le futur/i);
        }
    });
});
