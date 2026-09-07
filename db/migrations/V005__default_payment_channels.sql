-- ============================================================
-- Migration: V005 - Default active payment channels
-- Flooz, Mixx by Yas, Espèces (CASH) activated with treasury numbers.
-- ============================================================

-- Flooz (legacy seed name: "Moov Flooz")
UPDATE public."PaymentChannels"
SET
  provider_name = 'Flooz',
  channel_type = 'MOBILE_MONEY',
  account_number = '79769514',
  instructions = 'Envoyez au numéro Flooz 79769514. Indiquez votre nom complet dans le motif.',
  is_active = true,
  updated_at = NOW()
WHERE provider_name IN ('Moov Flooz', 'Flooz')
   OR account_number = '79769514';

INSERT INTO public."PaymentChannels" (provider_name, channel_type, account_number, instructions, is_active)
SELECT 'Flooz', 'MOBILE_MONEY', '79769514',
       'Envoyez au numéro Flooz 79769514. Indiquez votre nom complet dans le motif.',
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public."PaymentChannels"
  WHERE provider_name = 'Flooz' OR account_number = '79769514'
);

-- Mixx by Yas (legacy seed name: "Tmoney / Mixx")
UPDATE public."PaymentChannels"
SET
  provider_name = 'Mixx by Yas',
  channel_type = 'MOBILE_MONEY',
  account_number = '90288808',
  instructions = 'Envoyez au numéro Mixx by Yas 90288808. Indiquez votre nom complet dans le motif.',
  is_active = true,
  updated_at = NOW()
WHERE provider_name IN ('Tmoney / Mixx', 'Mixx by Yas')
   OR account_number = '90288808';

INSERT INTO public."PaymentChannels" (provider_name, channel_type, account_number, instructions, is_active)
SELECT 'Mixx by Yas', 'MOBILE_MONEY', '90288808',
       'Envoyez au numéro Mixx by Yas 90288808. Indiquez votre nom complet dans le motif.',
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public."PaymentChannels"
  WHERE provider_name = 'Mixx by Yas' OR account_number = '90288808'
);

-- Espèces (CASH) — not in V003 seed
INSERT INTO public."PaymentChannels" (provider_name, channel_type, account_number, instructions, is_active)
SELECT 'Espèces', 'CASH', 'CASH',
       'Remise en main propre au trésorier ou lors d''une réunion de l''Amicale.',
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public."PaymentChannels"
  WHERE channel_type = 'CASH' OR provider_name = 'Espèces'
);

UPDATE public."PaymentChannels"
SET is_active = true, updated_at = NOW()
WHERE channel_type = 'CASH' OR provider_name = 'Espèces';
