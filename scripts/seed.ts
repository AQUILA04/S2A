#!/usr/bin/env ts-node
/**
 * Seed Script: Initialize Primary Accounts (GS, Treasurer, Deputy Treasurer)
 *
 * Usage:
 *   npm run seed
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local
 *   - The V001__initial_schema.sql migration must be applied to the database
 *
 * This script is idempotent: running it multiple times will not create duplicate accounts.
 */

import * as bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import type { Database, MemberRole, MemberStatus, AccountStatus } from "../types/database.types";

// Load environment from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ============================================================
// Configuration — accounts to seed
// ============================================================

interface SeedAccount {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    join_date: string;
    monthly_fee: number;
    status: MemberStatus;
    account_status: AccountStatus;
    role: MemberRole;
    initial_password: string;
    /** Label used in console output */
    label: string;
}

const SEED_ACCOUNTS: SeedAccount[] = [
    {
        label: "SG (Secrétaire Général)",
        first_name: "Admin",
        last_name: "GS",
        email: "gs@amicale-s2a.org",
        phone: "+0000000000",
        join_date: "2016-01-01",
        monthly_fee: 0,
        status: "ACTIVE",
        account_status: "ACTIVE",
        role: "SG",
        initial_password: process.env.GS_SEED_PASSWORD || "Change-Me-Now-2026!",
    },
    {
        label: "Trésorier",
        first_name: "Admin",
        last_name: "Tresorier",
        email: "tresorier@amicale-s2a.org",
        phone: "+0000000001",
        join_date: "2016-01-01",
        monthly_fee: 0,
        status: "ACTIVE",
        account_status: "ACTIVE",
        role: "TREASURER",
        initial_password: process.env.TREASURER_SEED_PASSWORD || "Change-Me-Now-2026!",
    },
    {
        label: "Trésorier Adjoint",
        first_name: "Admin",
        last_name: "TresorierAdjoint",
        email: "tresorier-adjoint@amicale-s2a.org",
        phone: "+0000000002",
        join_date: "2016-01-01",
        monthly_fee: 0,
        status: "ACTIVE",
        account_status: "ACTIVE",
        role: "TRESORIER_ADJOINT",
        initial_password: process.env.TRESORIER_ADJOINT_SEED_PASSWORD || "Change-Me-Now-2026!",
    },
];

// ============================================================
// Helper: Validate environment
// ============================================================

function validateEnvironment(): { url: string; serviceKey: string } {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        throw new Error(
            "❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local\n" +
            "   Please set: NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
        );
    }

    if (!serviceKey) {
        throw new Error(
            "❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local\n" +
            "   Find it at: https://supabase.com/dashboard/project/_/settings/api"
        );
    }

    return { url, serviceKey };
}

// ============================================================
// Helper: Hash password securely
// ============================================================

async function hashPassword(plaintext: string): Promise<string> {
    const SALT_ROUNDS = 12;
    return bcrypt.hash(plaintext, SALT_ROUNDS);
}

// ============================================================
// Helper: Seed a single account (idempotent)
// ============================================================

async function seedAccount(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    account: SeedAccount
): Promise<void> {
    console.log(`\n── ${account.label} ──`);

    // Check for existing account (idempotency guard)
    const { data: existing, error: lookupError } = await supabase
        .from("Members")
        .select("id, email, role")
        .eq("email", account.email)
        .single();

    if (lookupError && lookupError.code !== "PGRST116") {
        // PGRST116 = "No rows found" — anything else is a real error
        throw new Error(
            `❌ Failed to check for existing ${account.label} account: ${lookupError.message}`
        );
    }

    if (existing) {
        console.log(`   ✅ Already exists (id: ${existing.id}) — skipped.`);
        return;
    }

    // Hash the initial password
    console.log(`   🔐 Hashing password...`);
    const passwordHash = await hashPassword(account.initial_password);

    // Insert the account
    console.log(`   📝 Inserting into Members table...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newMember, error: insertError } = await (supabase.from("Members") as any)
        .insert({
            first_name: account.first_name,
            last_name: account.last_name,
            email: account.email,
            phone: account.phone,
            join_date: account.join_date,
            monthly_fee: account.monthly_fee,
            status: account.status,
            account_status: account.account_status,
            role: account.role,
            password_hash: passwordHash,
        })
        .select()
        .single();

    if (insertError) {
        throw new Error(`❌ Failed to insert ${account.label}: ${insertError.message}`);
    }

    // Write audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: auditError } = await (supabase.from("AuditLogs") as any).insert({
        actor_id: newMember.id,
        action_type: "SYSTEM_INITIALIZATION",
        metadata: {
            new_value: {
                event: `${account.label} account seeded during system initialization`,
                member_email: newMember.email,
                member_role: newMember.role,
                seeded_at: new Date().toISOString(),
            },
        },
    });

    if (auditError) {
        console.warn(`   ⚠️  Audit log write failed (non-fatal): ${auditError.message}`);
    }

    console.log(`   ✅ Created successfully!`);
    console.log(`      ID    : ${newMember.id}`);
    console.log(`      Email : ${newMember.email}`);
    console.log(`      Role  : ${newMember.role}`);
}

// ============================================================
// Main seed function
// ============================================================

async function seed(): Promise<void> {
    console.log("🌱 Starting S2A database seed...");

    // 1. Validate environment
    const { url, serviceKey } = validateEnvironment();

    // 2. Create typed Supabase client (service role — bypasses RLS)
    const supabase = createClient<Database>(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // 3. Seed each account in order
    for (const account of SEED_ACCOUNTS) {
        await seedAccount(supabase, account);
    }

    // 4. Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Seed completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  IMPORTANT SECURITY NOTICE:");
    console.log("   Change ALL initial passwords immediately after the first login!");
    console.log("   You can also set custom passwords via env vars:");
    console.log("     GS_SEED_PASSWORD");
    console.log("     TREASURER_SEED_PASSWORD");
    console.log("     TRESORIER_ADJOINT_SEED_PASSWORD");
}

// ============================================================
// Entry point
// ============================================================

seed()
    .then(() => process.exit(0))
    .catch((err: Error) => {
        console.error("\n💥 Seed failed:", err.message);
        process.exit(1);
    });
