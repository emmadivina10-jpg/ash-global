ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'TCHOKOPAY',
  ADD COLUMN IF NOT EXISTS payment_currency text,
  ADD COLUMN IF NOT EXISTS payment_amount numeric;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_provider_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_provider_check
  CHECK (payment_provider IN ('TCHOKOPAY','STRIPE'));