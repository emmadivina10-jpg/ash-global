CREATE OR REPLACE FUNCTION public.console_platform_payout(_amount integer, _destination text, _note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
  fin jsonb; available numeric; payout_id uuid; payout_reference text;
  cleaned_destination text; cleaned_note text;
BEGIN
  IF jwt_role <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT');
  END IF;
  cleaned_destination := left(trim(coalesce(_destination, '')), 200);
  IF cleaned_destination = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'DESTINATION_REQUIRED');
  END IF;
  cleaned_note := nullif(left(trim(coalesce(_note, '')), 500), '');

  -- safe_to_withdraw already deducts completed + pending/processing owner payouts
  -- (owner_paid inside console_financials). Deduct them exactly once.
  fin := public.console_financials();
  available := greatest((fin->>'safe_to_withdraw')::numeric, 0);

  IF _amount > available THEN
    RETURN jsonb_build_object('ok', false, 'error', 'EXCEEDS_AVAILABLE', 'available', available);
  END IF;

  payout_reference := 'PLAT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  INSERT INTO public.platform_payouts (amount, currency, destination, note, reference, status, provider)
  VALUES (_amount, 'XAF', cleaned_destination, cleaned_note, payout_reference, 'PENDING', NULL)
  RETURNING id INTO payout_id;

  RETURN jsonb_build_object('ok', true, 'id', payout_id, 'reference', payout_reference,
    'status', 'PENDING', 'remaining', available - _amount);
END;
$function$;