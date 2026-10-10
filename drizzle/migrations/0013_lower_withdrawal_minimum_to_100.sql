CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method text, _phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  w public.wallets%ROWTYPE;
  st text;
  ref text;
  payouts_ok boolean;
  dest text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT account_status, stripe_payouts_enabled INTO st, payouts_ok FROM public.profiles WHERE user_id = uid;
  IF st <> 'ACTIVE' THEN RETURN jsonb_build_object('ok', false, 'error', 'ACCOUNT_NOT_ACTIVE'); END IF;
  IF _method NOT IN ('MTN_MOMO','ORANGE_MONEY','STRIPE_BANK') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_METHOD');
  END IF;

  IF _method = 'STRIPE_BANK' THEN
    IF NOT coalesce(payouts_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'BANK_PAYOUTS_NOT_READY');
    END IF;
    dest := 'STRIPE_BANK';
  ELSE
    IF _phone !~ '^(\+?237)?6[0-9]{8}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_PHONE'); END IF;
    dest := _phone;
  END IF;

  IF _amount IS NULL OR _amount < 100 THEN RETURN jsonb_build_object('ok', false, 'error', 'MIN_AMOUNT_100'); END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF w.user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'WALLET_NOT_FOUND'); END IF;
  IF w.available_balance < _amount THEN RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_BALANCE'); END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals wd WHERE wd.user_id = uid AND wd.status IN ('PENDING','PROCESSING')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PENDING_WITHDRAWAL_EXISTS');
  END IF;

  ref := 'WD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  INSERT INTO public.withdrawals (user_id, amount, currency, payment_method, phone_number, status, reference)
  VALUES (uid, _amount, w.currency, _method, dest, 'PENDING', ref);

  UPDATE public.wallets
     SET available_balance = available_balance - _amount,
         pending_balance = pending_balance + _amount,
         updated_at = now()
   WHERE user_id = uid;

  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (uid, 'WITHDRAWAL', -_amount, w.currency, ref,
          CASE WHEN _method = 'STRIPE_BANK' THEN 'Bank withdrawal request' ELSE 'Mobile money withdrawal request' END,
          'PENDING')
  ON CONFLICT (reference) DO NOTHING;

  PERFORM public.notify_user(uid, 'WITHDRAWAL', 'Withdrawal requested',
    'Your withdrawal of ' || _amount::bigint || ' XAF is pending review.',
    jsonb_build_object('reference', ref, 'method', _method));

  RETURN jsonb_build_object('ok', true, 'reference', ref);
END;
$function$;