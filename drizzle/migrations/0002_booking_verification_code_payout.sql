CREATE TABLE public.marketplace_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  commission_rate numeric NOT NULL DEFAULT 0.12 CHECK (commission_rate IN (0.12, 0.15)),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.marketplace_settings TO service_role;
ALTER TABLE public.marketplace_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all marketplace_settings" ON public.marketplace_settings FOR ALL USING (false);
INSERT INTO public.marketplace_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS commission_rate numeric,
  ADD COLUMN IF NOT EXISTS processing_fee numeric,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'NOT_ISSUED',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_transfer_status text NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN IF NOT EXISTS provider_transfer_id text;

CREATE TABLE public.booking_verification_codes (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_verification_codes TO authenticated;
GRANT ALL ON public.booking_verification_codes TO service_role;
ALTER TABLE public.booking_verification_codes ENABLE ROW LEVEL SECURITY;
-- Only the paying customer can ever read their code; providers cannot.
CREATE POLICY "customer reads own code" ON public.booking_verification_codes
  FOR SELECT TO authenticated USING (client_id = auth.uid());

CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public, extensions AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  out text := 'ASH-';
  i int;
BEGIN
  FOR i IN 0..5 LOOP
    out := out || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN out;
END $$;
REVOKE ALL ON FUNCTION public.generate_booking_code() FROM PUBLIC, anon, authenticated;

-- Issue a code exactly once whenever a booking becomes CONFIRMED (any rail).
CREATE OR REPLACE FUNCTION public.issue_booking_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rate numeric;
  campus_rate numeric;
  c text;
  tries int := 0;
BEGIN
  IF NEW.status::text = 'CONFIRMED' AND OLD.status::text IS DISTINCT FROM 'CONFIRMED'
     AND NOT EXISTS (SELECT 1 FROM public.booking_verification_codes WHERE booking_id = NEW.id) THEN
    campus_rate := public.campus_commission_rate(NEW.provider_id);
    IF campus_rate IS NULL THEN
      SELECT commission_rate INTO rate FROM public.marketplace_settings WHERE id;
      rate := coalesce(NEW.commission_rate, rate, 0.12);
      NEW.commission_rate := rate;
      NEW.platform_fee := round(NEW.price * rate);
      NEW.provider_amount := NEW.price - round(NEW.price * rate);
    ELSE
      NEW.commission_rate := campus_rate;
    END IF;
    NEW.verification_status := 'ISSUED';
    NEW.provider_transfer_status := 'PENDING_VERIFICATION';
    LOOP
      c := public.generate_booking_code();
      tries := tries + 1;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.booking_verification_codes WHERE code = c) OR tries > 10;
    END LOOP;
    INSERT INTO public.booking_verification_codes (booking_id, client_id, code, expires_at)
    VALUES (NEW.id, NEW.client_id, c, greatest(NEW.scheduled_at, now()) + interval '30 days');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_issue_booking_code ON public.bookings;
CREATE TRIGGER trg_issue_booking_code BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.issue_booking_code();

-- Providers can no longer mark a paid booking COMPLETED by themselves:
-- completion (and the wallet credit) only happens through verify_booking_code.
CREATE OR REPLACE FUNCTION public.guard_booking_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status::text = 'COMPLETED' AND OLD.status::text IS DISTINCT FROM 'COMPLETED'
     AND coalesce(current_setting('app.booking_verify', true), '') <> 'on'
     AND OLD.verification_status = 'ISSUED'
     AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'VERIFICATION_CODE_REQUIRED';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_booking_completion ON public.bookings;
CREATE TRIGGER trg_guard_booking_completion BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_completion();

CREATE OR REPLACE FUNCTION public.verify_booking_code(_booking_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  b public.bookings%ROWTYPE;
  v public.booking_verification_codes%ROWTYPE;
  clean text := upper(regexp_replace(coalesce(_code, ''), '\s', '', 'g'));
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL OR NOT EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = b.provider_id AND p.user_id = uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  END IF;
  SELECT * INTO v FROM public.booking_verification_codes WHERE booking_id = b.id FOR UPDATE;
  IF v.booking_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NO_CODE'); END IF;
  IF v.used_at IS NOT NULL OR b.verification_status = 'VERIFIED' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  IF b.status::text NOT IN ('CONFIRMED', 'IN_PROGRESS') OR b.paid_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_PAYABLE_STATE');
  END IF;
  IF v.failed_attempts >= 5 THEN RETURN jsonb_build_object('ok', false, 'error', 'LOCKED'); END IF;
  IF v.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'EXPIRED'); END IF;
  IF clean <> v.code AND ('ASH-' || clean) <> v.code THEN
    UPDATE public.booking_verification_codes SET failed_attempts = failed_attempts + 1 WHERE booking_id = b.id;
    RETURN jsonb_build_object('ok', false, 'error', 'WRONG_CODE', 'attempts_left', 4 - v.failed_attempts);
  END IF;

  UPDATE public.booking_verification_codes SET used_at = now() WHERE booking_id = b.id;
  PERFORM set_config('app.booking_rpc', 'on', true);
  PERFORM set_config('app.booking_verify', 'on', true);
  -- COMPLETED fires charge_platform_commission, which credits the provider
  -- wallet once (unique transaction reference BKG-<id>).
  UPDATE public.bookings
     SET status = 'COMPLETED', completed_at = now(), verification_status = 'VERIFIED',
         verified_at = now(), provider_transfer_status = 'AVAILABLE_IN_WALLET'
   WHERE id = b.id;
  PERFORM public.notify_user(b.client_id, 'BOOKING', 'Service verified',
    'Your booking for "' || b.service_title || '" is complete. Thank you for using ASH.',
    jsonb_build_object('booking_id', b.id, 'status', 'COMPLETED'));
  RETURN jsonb_build_object('ok', true, 'provider_amount', b.provider_amount);
END $$;
REVOKE ALL ON FUNCTION public.verify_booking_code(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_booking_code(uuid, text) TO authenticated;