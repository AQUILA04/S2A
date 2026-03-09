import { contributionSchema, multiMonthContributionSchema } from "@/lib/validations/contribution";

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

describe("multiMonthContributionSchema — Zod validation", () => {
    it("passes for valid CASH contribution with multiple months", () => {
        const payload = {
            member_id: "123e4567-e89b-12d3-a456-426614174000",
            amount: 15000,
            months: [1, 2, 3],
            year: 2026,
            payment_channel: "CASH",
        };
        const result = multiMonthContributionSchema.safeParse(payload);
        expect(result.success).toBe(true);
    });

    it("fails when months array is empty", () => {
        const payload = {
            member_id: "123e4567-e89b-12d3-a456-426614174000",
            amount: 15000,
            months: [],
            year: 2026,
            payment_channel: "CASH",
        };
        const result = multiMonthContributionSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.errors[0].path).toContain("months");
        }
    });

    it("fails when any selected month is in the future relative to current year", () => {
        const now = new Date();
        const nextMonth = now.getMonth() + 2; // +1 to get 1-index, +1 to get next month
        if (nextMonth <= 12) {
            const payload = {
                member_id: "123e4567-e89b-12d3-a456-426614174000",
                amount: 15000,
                months: [1, nextMonth],
                year: now.getFullYear(),
                payment_channel: "CASH",
            };
            const result = multiMonthContributionSchema.safeParse(payload);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].path).toContain("months");
            }
        }
    });

    it("fails when missing member_id", () => {
        const payload = {
            amount: 15000,
            months: [1, 2],
            year: 2026,
            payment_channel: "CASH",
        };
        const result = multiMonthContributionSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.errors[0].path).toContain("member_id");
        }
    });
});
