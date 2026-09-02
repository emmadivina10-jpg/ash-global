CREATE TABLE public.platform_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XAF',
  destination text NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.platform_payouts TO service_role;

ALTER TABLE public.platform_payouts ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (admin console backend) may read/write.

CREATE OR REPLACE FUNCTION public.console_platform_payout(_amount integer, _destination text, _note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
  fin jsonb;
  available numeric;
BEGIN
  IF jwt_role <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT');
  END IF;
  IF coalesce(trim(_destination), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'DESTINATION_REQUIRED');
  END IF;

  fin := public.console_financials();
  available := (fin->>'safe_to_withdraw')::numeric
             - coalesce((SELECT sum(amount) FROM public.platform_payouts), 0);
  IF _amount > available THEN
    RETURN jsonb_build_object('ok', false, 'error', 'EXCEEDS_AVAILABLE', 'available', available);
  END IF;

  INSERT INTO public.platform_payouts (amount, destination, note)
  VALUES (_amount, left(trim(_destination), 200), nullif(trim(coalesce(_note, '')), ''));

  RETURN jsonb_build_object('ok', true, 'remaining', available - _amount);
END;
$fn$;

REVOKE ALL ON FUNCTION public.console_platform_payout(integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.console_platform_payout(integer, text, text) TO authenticated, service_role;