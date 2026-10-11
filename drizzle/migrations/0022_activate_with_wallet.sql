CREATE OR REPLACE FUNCTION public.activate_with_wallet()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  st text;
  w public.wallets%ROWTYPE;
  fee numeric := 5000;
  ref text;
  act_id uuid;
  done jsonb;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;

  SELECT account_status INTO st FROM public.profiles WHERE user_id = uid;
  IF st = 'ACTIVE' THEN RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_ACTIVE'); END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NO_WALLET'); END IF;
  IF w.available_balance < fee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_BALANCE', 'balance', w.available_balance);
  END IF;

  ref := 'WALLET-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  UPDATE public.wallets
     SET available_balance = available_balance - fee, updated_at = now()
   WHERE user_id = uid;

  INSERT INTO public.activations (user_id, amount, currency, payment_provider, payment_reference, status)
  VALUES (uid, fee, 'XAF', 'WALLET', ref, 'PENDING')
  RETURNING id INTO act_id;

  done := public.complete_activation(ref, 'WALLET');
  IF coalesce((done ->> 'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'activation completion failed: %', done;
  END IF;

  RETURN jsonb_build_object('ok', true, 'reference', ref, 'balance', w.available_balance - fee);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_with_wallet() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_with_wallet() TO authenticated;