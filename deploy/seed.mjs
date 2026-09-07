/**
 * Idempotent Contabo seed (plain Node ESM).
 * Run via deploy.sh on the db Docker network.
 */
import postgres from "postgres";
import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "Change-Me-Now-2026!";

const ACCOUNTS = [
  {
    label: "Président",
    first_name: "Admin",
    last_name: "President",
    email: "president@amicale-s2a.org",
    phone: "+0000000003",
    role: "PRESIDENT",
    password: process.env.PRESIDENT_SEED_PASSWORD || DEFAULT_PASSWORD,
  },
  {
    label: "SG",
    first_name: "Admin",
    last_name: "GS",
    email: "gs@amicale-s2a.org",
    phone: "+0000000000",
    role: "SG",
    password: process.env.GS_SEED_PASSWORD || DEFAULT_PASSWORD,
  },
  {
    label: "Trésorier",
    first_name: "Admin",
    last_name: "Tresorier",
    email: "tresorier@amicale-s2a.org",
    phone: "+0000000001",
    role: "TREASURER",
    password: process.env.TREASURER_SEED_PASSWORD || DEFAULT_PASSWORD,
  },
  {
    label: "Trésorier Adjoint",
    first_name: "Admin",
    last_name: "TresorierAdjoint",
    email: "tresorier-adjoint@amicale-s2a.org",
    phone: "+0000000002",
    role: "TRESORIER_ADJOINT",
    password: process.env.TRESORIER_ADJOINT_SEED_PASSWORD || DEFAULT_PASSWORD,
  },
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  for (const a of ACCOUNTS) {
    const existing = await sql`SELECT id FROM "Members" WHERE email = ${a.email} LIMIT 1`;
    if (existing.length) {
      console.log(`skip ${a.email}`);
      continue;
    }
    const hash = await bcrypt.hash(a.password, 12);
    const rows = await sql`
      INSERT INTO "Members" (
        first_name, last_name, email, phone, join_date,
        monthly_fee, status, account_status, role, password_hash
      ) VALUES (
        ${a.first_name}, ${a.last_name}, ${a.email}, ${a.phone}, ${"2016-01-01"},
        ${0}, ${"ACTIVE"}, ${"ACTIVE"}, ${a.role}, ${hash}
      ) RETURNING id, email, role
    `;
    const m = rows[0];
    await sql`
      INSERT INTO "AuditLogs" (actor_id, action_type, metadata)
      VALUES (
        ${m.id},
        ${"SYSTEM_INITIALIZATION"},
        ${sql.json({
          new_value: {
            event: `${a.label} seeded`,
            member_email: m.email,
            member_role: m.role,
            seeded_at: new Date().toISOString(),
          },
        })}
      )
    `;
    console.log(`created ${m.email} (${m.role})`);
  }
  console.log("seed ok");
} finally {
  await sql.end({ timeout: 5 });
}
