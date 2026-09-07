-- ============================================================
-- Migration: V001 - Initial Schema for Amicale S2A
-- Purpose: Create all core tables with strict constraints and enums
-- ============================================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE member_status AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE member_role AS ENUM (
  'MEMBER',
  'PRESIDENT',
  'SG',
  'TREASURER',
  'ADJOINT'
);

CREATE TYPE payment_channel AS ENUM (
  'CASH',
  'MOBILE_MONEY',
  'BANK_TRANSFER',
  'INTL_TRANSFER'
);

CREATE TYPE contribution_status AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');

-- ============================================================
-- TABLE: Members
-- ============================================================

CREATE TABLE IF NOT EXISTS "Members" (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT NOT NULL UNIQUE,
  join_date       DATE NOT NULL,
  monthly_fee     DECIMAL(10, 2) NOT NULL CHECK (monthly_fee >= 0),
  status          member_status NOT NULL DEFAULT 'ACTIVE',
  role            member_role NOT NULL DEFAULT 'MEMBER',
  password_hash   TEXT NOT NULL,
  created_at_app  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_status ON "Members" (status);
CREATE INDEX idx_members_role ON "Members" (role);
CREATE INDEX idx_members_email ON "Members" (email);

-- ============================================================
-- TABLE: Contributions
-- ============================================================

CREATE TABLE IF NOT EXISTS "Contributions" (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id        UUID NOT NULL REFERENCES "Members" (id) ON DELETE CASCADE,
  amount           DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  month            INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year             INTEGER NOT NULL CHECK (year >= 2016),
  payment_channel  payment_channel NOT NULL,
  reference_id     TEXT UNIQUE,                        -- Unique but nullable (Cash may not have a reference)
  status           contribution_status NOT NULL DEFAULT 'PENDING',
  validator_id     UUID REFERENCES "Members" (id) ON DELETE SET NULL,
  validated_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contributions_member_id ON "Contributions" (member_id);
CREATE INDEX idx_contributions_status ON "Contributions" (status);
CREATE INDEX idx_contributions_year_month ON "Contributions" (year, month);
-- [H3] Partial unique index: enforces one VALIDATED contribution per member per month/year.
-- The old UNIQUE on (member_id, month, year, status) was wrong because it allowed
-- one PENDING + one VALIDATED + one REJECTED row for the same period.
CREATE UNIQUE INDEX idx_unique_validated_contribution
    ON "Contributions" (member_id, month, year)
    WHERE status = 'VALIDATED';

-- ============================================================
-- TABLE: BlackoutMonths
-- ============================================================

CREATE TABLE IF NOT EXISTS "BlackoutMonths" (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month      INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year       INTEGER NOT NULL CHECK (year >= 2016),
  reason     TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_blackout_month_year UNIQUE (month, year)
);

-- ============================================================
-- TABLE: ProjectInvestments
-- ============================================================

CREATE TABLE IF NOT EXISTS "ProjectInvestments" (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id    UUID NOT NULL REFERENCES "Members" (id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  amount       DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  date         DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investments_member_id ON "ProjectInvestments" (member_id);

-- ============================================================
-- TABLE: EBExpenses
-- ============================================================

CREATE TABLE IF NOT EXISTS "EBExpenses" (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount      DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  category    TEXT NOT NULL,
  date        DATE NOT NULL,
  receipt_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: AuditLogs
-- ============================================================

CREATE TABLE IF NOT EXISTS "AuditLogs" (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID NOT NULL REFERENCES "Members" (id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditlogs_actor_id ON "AuditLogs" (actor_id);
CREATE INDEX idx_auditlogs_action_type ON "AuditLogs" (action_type);
CREATE INDEX idx_auditlogs_timestamp ON "AuditLogs" (timestamp DESC);
CREATE INDEX idx_auditlogs_metadata ON "AuditLogs" USING GIN (metadata);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE "Members" IS 'Core member registry for Amicale S2A';
COMMENT ON TABLE "Contributions" IS 'Monthly contribution payments from members';
COMMENT ON TABLE "BlackoutMonths" IS 'Months excluded from debt calculation (e.g., COVID-19)';
COMMENT ON TABLE "ProjectInvestments" IS 'Investment allocations per member for projects';
COMMENT ON TABLE "EBExpenses" IS 'Executive board operational expenses';
COMMENT ON TABLE "AuditLogs" IS 'Immutable audit trail of all board-level write actions';
COMMENT ON COLUMN "AuditLogs".metadata IS 'JSONB storing old_value and new_value for audited changes';
