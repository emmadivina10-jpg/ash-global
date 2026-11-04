CREATE TABLE IF NOT EXISTS app_private.reconcile_credentials (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  token text NOT NULL,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON app_private.reconcile_credentials FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_token_matches(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private, extensions AS $$
  SELECT EXISTS (SELECT 1 FROM app_private.reconcile_credentials
                 WHERE singleton AND token_hash = encode(extensions.digest(_token, 'sha256'), 'hex'));
$$;
REVOKE ALL ON FUNCTION public.reconcile_token_matches(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_token_matches(text) TO service_role;

CREATE OR REPLACE FUNCTION public.issue_booking_code()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE rate numeric; campus_rate numeric; c text; tries int := 0;
BEGIN
  IF NEW.status::text = 'CONFIRMED' AND OLD.status::text IS DISTINCT FROM 'CONFIRMED'
     AND NOT EXISTS (SELECT 1 FROM public.booking_verification_codes WHERE booking_id = NEW.id) THEN
    campus_rate := public.campus_commission_rate(NEW.provider_id);
    IF campus_rate IS NULL THEN
      SELECT commission_rate INTO rate FROM public.marketplace_settings WHERE id;
      rate := coalesce(NEW.commission_rate, rate, 0.15);
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
END $function$;

CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO anon;
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read feature flags"
  ON public.feature_flags FOR SELECT TO anon, authenticated USING (true);