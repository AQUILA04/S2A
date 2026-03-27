import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const cookieHeader = request.headers.get("cookie") ?? "";
    const origin = request.nextUrl.origin;

    const dashboardResponse = await fetch(`${origin}/dashboard`, {
        headers: {
            cookie: cookieHeader,
        },
        redirect: "manual",
    }).catch(() => null);

    return NextResponse.json({
        hasSession: Boolean(session),
        sessionUserId: session?.user?.id ?? null,
        forwardedCookieNames: cookieHeader
            .split(";")
            .map((part) => part.trim().split("=")[0])
            .filter(Boolean),
        dashboardProbe: dashboardResponse
            ? {
                  status: dashboardResponse.status,
                  location: dashboardResponse.headers.get("location"),
              }
            : null,
    });
}
