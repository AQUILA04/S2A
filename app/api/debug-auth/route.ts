import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const runtime = "edge";

export async function GET(request: Request) {
    const token = await getToken({
        req: request as Parameters<typeof getToken>[0]["req"],
        secret: process.env.NEXTAUTH_SECRET,
    });

    return NextResponse.json({
        edge: {
            hasToken: Boolean(token),
            tokenSub: token?.sub ?? null,
            tokenRole: (token?.role as string | undefined) ?? null,
            hasSecret: Boolean(process.env.NEXTAUTH_SECRET),
        },
    });
}
