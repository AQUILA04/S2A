-- ============================================================
-- Migration: V002 - RBAC Refinement & Account Status
-- Purpose:
--   1. Add `account_status` field to Members to distinguish
--      user login state (PENDING_ACTIVATION / ACTIVE) from
--      member association status (ACTIVE / INACTIVE).
--   2. Replace the generic `ADJOINT` role with the more precise
--      `SG_ADJOINT` (same rights as SG) and
--      `TRESORIER_ADJOINT` (same rights as TREASURER).
-- ============================================================

-- ============================================================
-- 1. New ENUM: account_status
-- ============================================================

CREATE TYPE account_status AS ENUM (
  'PENDING_ACTIVATION', -- Account created by GS; member has not yet set their password via activation link
  'ACTIVE'              -- Member has completed activation and can log in
);

-- ============================================================
-- 2. Add account_status column to Members
-- ============================================================

ALTER TABLE "Members"
  ADD COLUMN account_status account_status NOT NULL DEFAULT 'PENDING_ACTIVATION';

-- The GS super-admin seeded in Story 1.1 already has a password hash,
-- so their account is effectively active. Update it accordingly.
UPDATE "Members"
  SET account_status = 'ACTIVE'
  WHERE role = 'SG' AND email = 'gs@amicale-s2a.org';

CREATE INDEX idx_members_account_status ON "Members" (account_status);

COMMENT ON COLUMN "Members".account_status IS
  'Login state of the user account. PENDING_ACTIVATION = created by GS but member has not yet clicked the activation link. ACTIVE = account fully set up, can log in.';

COMMENT ON COLUMN "Members".status IS
  'Association membership status. ACTIVE = member in good standing (cotises). INACTIVE = more than 24 months of unpaid dues (auto-set by balance engine).';

-- ============================================================
-- 3. Rename ADJOINT → SG_ADJOINT and add TRESORIER_ADJOINT
--
-- PostgreSQL does not support DROP VALUE from an enum.
-- Strategy: create a new enum type, migrate the column, drop old.
-- ============================================================

-- Step 3a: Create the new refined enum
CREATE TYPE member_role_v2 AS ENUM (
  'MEMBER',
  'SG',
  'SG_ADJOINT',       -- Deputy Secretary General — same rights as SG
  'TREASURER',
  'TRESORIER_ADJOINT', -- Deputy Treasurer — same rights as TREASURER
  'PRESIDENT'          -- Full rights: SG + TREASURER + all admin settings
);

-- Step 3b: Migrate the Members column to the new enum
ALTER TABLE "Members"
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE "Members"
  ALTER COLUMN role TYPE member_role_v2
  USING (
    CASE role::text
      WHEN 'ADJOINT' THEN 'SG_ADJOINT'::member_role_v2  -- Migrate any existing ADJOINT → SG_ADJOINT
      ELSE role::text::member_role_v2
    END
  );

ALTER TABLE "Members"
  ALTER COLUMN role SET DEFAULT 'MEMBER';

-- Step 3c: Drop the old enum
DROP TYPE member_role;

-- Step 3d: Rename to the canonical name
ALTER TYPE member_role_v2 RENAME TO member_role;

-- ============================================================
-- RBAC Reference (informational — enforced at application layer)
-- ============================================================
-- Role             | Members write | Contributions/Validation | Settings
-- ----------------------------------------------------------------
-- MEMBER           |      ❌       |    ❌ (declare only)     |    ❌
-- SG               |      ✅       |          ❌              |    ✅
-- SG_ADJOINT       |      ✅       |          ❌              |    ✅
-- TREASURER        |      ❌       |          ✅              |    ✅
-- TRESORIER_ADJOINT|      ❌       |          ✅              |    ✅
-- PRESIDENT        |      ✅       |          ✅              |    ✅  (inherits all)
-- ============================================================
