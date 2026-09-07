/**
 * Unit tests for HMAC activation tickets used by /activate step 2.
 */

process.env.NEXTAUTH_SECRET = "unit-test-activation-secret";

import {
    createActivationTicket,
    verifyActivationTicket,
} from "@/lib/auth/activation-ticket";

describe("activation ticket", () => {
    it("round-trips a valid memberId", () => {
        const ticket = createActivationTicket("member-abc");
        expect(verifyActivationTicket(ticket)).toBe("member-abc");
    });

    it("rejects tampered tickets", () => {
        const ticket = createActivationTicket("member-abc");
        const [body] = ticket.split(".");
        expect(verifyActivationTicket(`${body}.deadbeef`)).toBeNull();
    });

    it("rejects expired tickets", () => {
        const now = Date.now();
        const ticket = createActivationTicket("member-abc", now - 20 * 60 * 1000);
        expect(verifyActivationTicket(ticket, now)).toBeNull();
    });
});
