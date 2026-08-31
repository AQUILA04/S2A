import { normalizePhoneToE164, maskPhone } from "@/lib/phone/normalize";

describe("normalizePhoneToE164", () => {
    it("normalizes +228 E.164 as-is", () => {
        expect(normalizePhoneToE164("+22890123456")).toBe("+22890123456");
    });

    it("normalizes 228 prefix without plus", () => {
        expect(normalizePhoneToE164("22890123456")).toBe("+22890123456");
    });

    it("normalizes local 0-prefix Togo number", () => {
        expect(normalizePhoneToE164("090123456")).toBe("+22890123456");
    });

    it("strips formatting characters", () => {
        expect(normalizePhoneToE164("+228 90 12 34 56")).toBe("+22890123456");
    });

    it("returns null for invalid carrier prefix", () => {
        expect(normalizePhoneToE164("+22880123456")).toBeNull();
    });

    it("returns null for empty input", () => {
        expect(normalizePhoneToE164("")).toBeNull();
    });
});

describe("maskPhone", () => {
    it("masks all but last 4 digits", () => {
        expect(maskPhone("+22890123456")).toBe("****3456");
    });
});
