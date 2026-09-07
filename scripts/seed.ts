#!/usr/bin/env ts-node
/**
 * Seed Script: Initialize Primary Accounts (President, GS, Treasurer, Deputy Treasurer)
 *
 * Usage:
 *   npm run seed
 *
 * Prerequisites:
 *   - DATABASE_URL must be set in .env.local
 *   - Migrations V001–V003 applied (docker compose up db)
 *
 * Idempotent: running multiple times will not create duplicate accounts.
 */

import * as bcrypt from "bcryptjs";
import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";
import type { MemberRole, MemberStatus, AccountStatus } from "../types/database.types";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

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
    label: string;
}

const DEFAULT_PASSWORD = "Change-Me-Now-2026!";

const SEED_ACCOUNTS: SeedAccount[] = [
    {
        label: "Président",
        first_name: "Admin",
        last_name: "President",
        email: "president@amicale-s2a.org",
        phone: "+0000000003",
        join_date: "2016-01-01",
        monthly_fee: 0,
        status: "ACTIVE",
        account_status: "ACTIVE",
        role: "PRESIDENT",
        initial_password: process.env.PRESIDENT_SEED_PASSWORD || DEFAULT_PASSWORD,
    },
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
        initial_password: process.env.GS_SEED_PASSWORD || DEFAULT_PASSWORD,
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
        initial_password: process.env.TREASURER_SEED_PASSWORD || DEFAULT_PASSWORD,
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
        initial_password: process.env.TRESORIER_ADJOINT_SEED_PASSWORD || DEFAULT_PASSWORD,
    },
];

function validateEnvironment(): string {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error(
            "Missing DATABASE_URL in .env.local\n" +
                "Example: DATABASE_URL=postgresql://s2a:s2a_dev_password@localhost:5433/s2a"
        );
    }
    return url;
}

async function hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, 12);
}

async function seedAccount(sql: postgres.Sql, account: SeedAccount): Promise<void> {
    console.log(`\n── ${account.label} ──`);

    const existing = await sql`
        SELECT id, email, role FROM "Members" WHERE email = ${account.email} LIMIT 1
    `;

    if (existing.length > 0) {
        await sql`
            UPDATE "Members"
            SET must_change_password = true
            WHERE email = ${account.email} AND must_change_password = false
        `;
        console.log(`   ✅ Already exists (id: ${existing[0].id}) — must_change_password ensured.`);
        return;
    }

    console.log(`   🔐 Hashing password...`);
    const passwordHash = await hashPassword(account.initial_password);

    console.log(`   📝 Inserting into Members table...`);
    const inserted = await sql`
        INSERT INTO "Members" (
            first_name, last_name, email, phone, join_date,
            monthly_fee, status, account_status, role, password_hash, must_change_password
        ) VALUES (
            ${account.first_name},
            ${account.last_name},
            ${account.email},
            ${account.phone},
            ${account.join_date},
            ${account.monthly_fee},
            ${account.status},
            ${account.account_status},
            ${account.role},
            ${passwordHash},
            ${true}
        )
        RETURNING id, email, role
    `;

    const newMember = inserted[0];

    try {
        await sql`
            INSERT INTO "AuditLogs" (actor_id, action_type, metadata)
            VALUES (
                ${newMember.id},
                ${"SYSTEM_INITIALIZATION"},
                ${sql.json({
                    new_value: {
                        event: `${account.label} account seeded during system initialization`,
                        member_email: newMember.email,
                        member_role: newMember.role,
                        seeded_at: new Date().toISOString(),
                    },
                })}
            )
        `;
    } catch (auditError) {
        console.warn(
            `   ⚠️  Audit log write failed (non-fatal):`,
            auditError instanceof Error ? auditError.message : auditError
        );
    }

    console.log(`   ✅ Created successfully!`);
    console.log(`      ID    : ${newMember.id}`);
    console.log(`      Email : ${newMember.email}`);
    console.log(`      Role  : ${newMember.role}`);
}

async function seed(): Promise<void> {
    console.log("🌱 Starting S2A database seed...");
    const url = validateEnvironment();
    const sql = postgres(url, { max: 1, prepare: false });

    try {
        for (const account of SEED_ACCOUNTS) {
            await seedAccount(sql, account);
        }

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ Seed completed successfully!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n⚠️  IMPORTANT SECURITY NOTICE:");
        console.log("   Change ALL initial passwords immediately after the first login!");
        console.log("   Optional env overrides:");
        console.log("     PRESIDENT_SEED_PASSWORD");
        console.log("     GS_SEED_PASSWORD");
        console.log("     TREASURER_SEED_PASSWORD");
        console.log("     TRESORIER_ADJOINT_SEED_PASSWORD");
    } finally {
        await sql.end({ timeout: 5 });
    }
}

seed()
    .then(() => process.exit(0))
    .catch((err: Error) => {
        console.error("\n💥 Seed failed:", err.message);
        process.exit(1);
    });
