#!/usr/bin/env ts-node
/**
 * Seed Script: Initialize Primary General Secretary (GS) Account
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
import type { Database, MemberRole, MemberStatus } from "../types/database.types";

// Load environment from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ============================================================
// Configuration
// ============================================================

const GS_SEED_CONFIG = {
    first_name: "Admin",
    last_name: "GS",
    email: "gs@amicale-s2a.org",
    phone: "+0000000000",
    join_date: "2016-01-01",
    monthly_fee: 0, // GS is not subject to monthly fees
    status: "ACTIVE" as MemberStatus,
    role: "SG" as MemberRole,
    // IMPORTANT: Change this password immediately after first login!
    initial_password: process.env.GS_SEED_PASSWORD || "Change-Me-Now-2026!",
} as const;

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
// Main seed function
// ============================================================

async function seed(): Promise<void> {
    console.log("🌱 Starting S2A database seed...\n");

    // 1. Validate environment
    const { url, serviceKey } = validateEnvironment();

    // 2. Create typed Supabase client (service role — bypasses RLS)
    const supabase = createClient<Database>(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // 3. Check if GS account already exists (idempotency guard)
    const { data: existing, error: lookupError } = await supabase
        .from("Members")
        .select("id, email, role")
        .eq("email", GS_SEED_CONFIG.email)
        .single();

    if (lookupError && lookupError.code !== "PGRST116") {
        // PGRST116 = "No rows found" — anything else is a real error
        throw new Error(
            `❌ Failed to check for existing GS account: ${lookupError.message}`
        );
    }

    if (existing) {
        console.log(`✅ GS account already exists (id: ${existing.id})`);
        console.log(`   Email: ${existing.email}`);
        console.log(`   Role:  ${existing.role}`);
        console.log("\n⚠️  Seed skipped — existing account not modified.");
        return;
    }

    // 4. Hash the initial password
    console.log("🔐 Hashing password (bcrypt, 12 rounds)...");
    const passwordHash = await hashPassword(GS_SEED_CONFIG.initial_password);

    // 5. Insert the GS account
    console.log("📝 Inserting GS account into Members table...");
    const { data: newMember, error: insertError } = await supabase
        .from("Members")
        .insert({
            first_name: GS_SEED_CONFIG.first_name,
            last_name: GS_SEED_CONFIG.last_name,
            email: GS_SEED_CONFIG.email,
            phone: GS_SEED_CONFIG.phone,
            join_date: GS_SEED_CONFIG.join_date,
            monthly_fee: GS_SEED_CONFIG.monthly_fee,
            status: GS_SEED_CONFIG.status,
            role: GS_SEED_CONFIG.role,
            password_hash: passwordHash,
        })
        .select()
        .single();

    if (insertError) {
        throw new Error(`❌ Failed to insert GS account: ${insertError.message}`);
    }

    // 6. Log an audit entry for this initialization event
    console.log("📋 Writing initialization audit log...");
    const { error: auditError } = await supabase.from("AuditLogs").insert({
        actor_id: newMember.id,
        action_type: "SYSTEM_INITIALIZATION",
        metadata: {
            new_value: {
                event: "GS account seeded during system initialization",
                member_email: newMember.email,
                member_role: newMember.role,
                seeded_at: new Date().toISOString(),
            },
        },
    });

    if (auditError) {
        // Non-fatal: warn but don't fail the seed
        console.warn(
            `⚠️  Audit log write failed (non-fatal): ${auditError.message}`
        );
    }

    // 7. Success
    console.log("\n✅ Seed completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Member ID : ${newMember.id}`);
    console.log(`   Email     : ${newMember.email}`);
    console.log(`   Role      : ${newMember.role}`);
    console.log(`   Status    : ${newMember.status}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  IMPORTANT SECURITY NOTICE:");
    console.log(
        "   Change the GS initial password immediately after your first login!"
    );
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
