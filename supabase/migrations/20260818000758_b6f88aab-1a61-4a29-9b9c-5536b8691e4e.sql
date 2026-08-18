ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'PAYMENT_PROCESSING';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'PAYMENT_EXPIRED';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS respond_by timestamptz,
  ADD COLUMN IF NOT EXISTS pay_by timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS platform_fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_amount integer,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_reference_key ON public.bookings (payment_reference) WHERE payment_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_invoice_number_key ON public.bookings (invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_provider_status_idx ON public.bookings (provider_id, status);
CREATE INDEX IF NOT EXISTS bookings_client_idx ON public.bookings (client_id, created_at DESC);

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepting_bookings boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS service_areas text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'TEXT',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS photo_path text;

CREATE SEQUENCE IF NOT EXISTS public.ash_invoice_seq START 1001;
GRANT USAGE ON SEQUENCE public.ash_invoice_seq TO service_role;