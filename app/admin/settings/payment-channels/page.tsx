import * as React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPaymentChannels } from "./actions";
import { PaymentChannelsClient } from "./payment-channels-client";
import type { MemberRole } from "@/types/database.types";

// ============================================================
// RBAC guard: only TREASURER / TRESORIER_ADJOINT / PRESIDENT can write
// ============================================================
const PAYMENT_WRITE_ROLES: MemberRole[] = ["TREASURER", "TRESORIER_ADJOINT", "PRESIDENT"];

// ============================================================
// Payment Settings page — Server Component
// ============================================================
export default async function PaymentChannelsPage() {
    // Fetch channels (all, not just active — EB needs to see inactive ones too)
    const result = await getPaymentChannels(false);
    const channels = result.data ?? [];

    // Determine write access for disabling buttons in the client
    const session = await getServerSession(authOptions);
    const canWrite = PAYMENT_WRITE_ROLES.includes(session?.user?.role as MemberRole);

    return (
        <div className="space-y-8">
            {/* ── Page Header ── */}
            <header>
                <h1 className="text-2xl font-bold tracking-tight">Payment Settings</h1>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                    {`Executive Portal\nConfigure available payment channels for Amicale S2A members.`}
                </p>
            </header>

            {/* ── Error banner (if Supabase failed) ── */}
            {result.error && (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                    <strong>Error loading channels:</strong> {result.error}
                </div>
            )}

            {/* ── Interactive Channel Management ── */}
            <PaymentChannelsClient
                initialChannels={channels}
                canWrite={canWrite}
            />
        </div>
    );
}
