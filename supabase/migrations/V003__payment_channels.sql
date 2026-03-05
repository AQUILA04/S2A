-- ============================================================
-- Migration: V003 - Payment Channels Configuration Table
-- Purpose:
--   Create the PaymentChannels table to allow the Executive Board
--   (TREASURER / TRESORIER_ADJOINT / PRESIDENT) to configure the
--   treasury account details (Flooz, Mixx, Bank RIB, Western Union,
--   etc.) that members will use when declaring contributions.
--
-- Story: 2.1 - Payment Channel Configuration
-- Date:  2026-03-05
-- ============================================================

-- ============================================================
-- 1. Create the PaymentChannels table
-- ============================================================

CREATE TABLE public."PaymentChannels" (
    id           UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_name TEXT            NOT NULL,
    channel_type  public.payment_channel NOT NULL,
    account_number TEXT           NOT NULL,
    instructions  TEXT,
    is_active     BOOLEAN         DEFAULT true NOT NULL,
    created_at    TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
    updated_at    TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
    updated_by    UUID            REFERENCES public."Members"(id) ON DELETE SET NULL
);

COMMENT ON TABLE public."PaymentChannels" IS
    'Treasury payment channels managed by the Executive Board. Members use these details to send their contributions.';

COMMENT ON COLUMN public."PaymentChannels".provider_name IS
    'Human-readable name of the payment provider (e.g. "Moov Flooz", "MoneyGram", "BTCI").';

COMMENT ON COLUMN public."PaymentChannels".channel_type IS
    'Enum type mapping to the existing payment_channel enum (CASH, MOBILE_MONEY, BANK_TRANSFER, INTL_TRANSFER).';

COMMENT ON COLUMN public."PaymentChannels".account_number IS
    'The treasury account number or phone number that members send money to.';

COMMENT ON COLUMN public."PaymentChannels".instructions IS
    'Optional text instructions shown to the member during payment declaration (e.g. "Include your full name in the message").';

COMMENT ON COLUMN public."PaymentChannels".is_active IS
    'Soft-disable: false hides the channel from the member payment wizard without losing historical data.';

COMMENT ON COLUMN public."PaymentChannels".updated_by IS
    'FK to the Members table — records which EB member last modified this channel.';

-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE INDEX idx_payment_channels_is_active ON public."PaymentChannels" (is_active);
CREATE INDEX idx_payment_channels_channel_type ON public."PaymentChannels" (channel_type);

-- ============================================================
-- 3. Row Level Security (RLS)
-- ============================================================

ALTER TABLE public."PaymentChannels" ENABLE ROW LEVEL SECURITY;

-- 3a. SELECT: all authenticated users can read active channels.
--     (The application layer also filters to is_active = true for the member wizard.)
CREATE POLICY "PaymentChannels: authenticated read"
    ON public."PaymentChannels"
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 3b. INSERT: only TREASURER, TRESORIER_ADJOINT, and PRESIDENT.
CREATE POLICY "PaymentChannels: EB write insert"
    ON public."PaymentChannels"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."Members" m
            WHERE m.id = auth.uid()
              AND m.role IN ('TREASURER', 'TRESORIER_ADJOINT', 'PRESIDENT')
        )
    );

-- 3c. UPDATE: same roles as INSERT.
CREATE POLICY "PaymentChannels: EB write update"
    ON public."PaymentChannels"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public."Members" m
            WHERE m.id = auth.uid()
              AND m.role IN ('TREASURER', 'TRESORIER_ADJOINT', 'PRESIDENT')
        )
    );

-- 3d. DELETE: same roles as INSERT.
CREATE POLICY "PaymentChannels: EB write delete"
    ON public."PaymentChannels"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public."Members" m
            WHERE m.id = auth.uid()
              AND m.role IN ('TREASURER', 'TRESORIER_ADJOINT', 'PRESIDENT')
        )
    );

-- ============================================================
-- 4. Auto-update updated_at on row modification
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_channels_updated_at
    BEFORE UPDATE ON public."PaymentChannels"
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 5. Seed: insert the four canonical S2A payment channels
--    (all inactive by default — the EB activates them via the UI)
-- ============================================================

-- Note: updated_by is NULL because these are seeded system records,
--       not created by a specific EB member.
INSERT INTO public."PaymentChannels" (provider_name, channel_type, account_number, instructions, is_active)
VALUES
    ('Moov Flooz',      'MOBILE_MONEY',  '',  'Envoyez au numéro Flooz de l''Amicale. Indiquez votre nom complet dans le motif.',     false),
    ('Tmoney / Mixx',   'MOBILE_MONEY',  '',  'Envoyez au numéro Tmoney/Mixx de l''Amicale. Indiquez votre nom complet.',             false),
    ('Virement bancaire','BANK_TRANSFER', '',  'Utilisez la référence : [NOM PRÉNOM - COTISATION MOIS/ANNÉE].',                        false),
    ('Western Union',   'INTL_TRANSFER', '',  'Envoyez au nom de l''Amicale S2A. Communiquez le MTCN au trésorier après envoi.',      false);
