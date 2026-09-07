import {
    parseOrExpression,
    splitOrFragments,
} from "@/lib/db/query-builder";

describe("splitOrFragments", () => {
    it("does not split commas inside in.(...)", () => {
        const expr =
            'email.in.("a@x.org","b@y.org"),phone.in.("+22890000001","+22890000002")';
        expect(splitOrFragments(expr)).toEqual([
            'email.in.("a@x.org","b@y.org")',
            'phone.in.("+22890000001","+22890000002")',
        ]);
    });
});

describe("parseOrExpression", () => {
    it("builds OR ANY clauses for email and phone lists", () => {
        const params: unknown[] = [];
        const sql = parseOrExpression(
            'email.in.("ahonsou.aimee@amicale-s2a.org","ahonsou.akpene@amicale-s2a.org"),phone.in.("+22890084340")',
            params
        );
        expect(sql).toBe('("email" = ANY($1) OR "phone" = ANY($2))');
        expect(params).toEqual([
            ["ahonsou.aimee@amicale-s2a.org", "ahonsou.akpene@amicale-s2a.org"],
            ["+22890084340"],
        ]);
    });
});
