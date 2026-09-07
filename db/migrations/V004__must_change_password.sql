-- ============================================================
-- Migration: V004 - must_change_password
-- Force password change after first login with a default/seed password.
-- ============================================================

ALTER TABLE public."Members"
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public."Members".must_change_password IS
  'When true, middleware forces /auth/setup-password after login until the user sets a new password.';

-- Existing seed admin accounts should change password on next login
UPDATE public."Members"
SET must_change_password = true
WHERE email IN (
  'president@amicale-s2a.org',
  'gs@amicale-s2a.org',
  'tresorier@amicale-s2a.org',
  'tresorier-adjoint@amicale-s2a.org'
);
