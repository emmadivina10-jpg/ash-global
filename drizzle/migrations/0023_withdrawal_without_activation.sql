-- Wallet funds come from verified payments, so withdrawing them must not
-- require referral activation. Drop the ACCOUNT_NOT_ACTIVE gate.
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method text, _phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  w public.wallets%ROWTYPE;
  ref text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  IF _method NOT IN ('MTN_MOMO','ORANGE_MONEY') THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_METHOD'); END IF;
  IF _phone !~ '^(\+?237)?6[0-9]{8}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_PHONE'); END IF;
  IF _amount < 100 THEN RETURN jsonb_build_object('ok', false, 'error', 'MIN_100'); END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NO_WALLET'); END IF;
  IF w.available_balance < _amount THEN RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_BALANCE'); END IF;

  ref := 'WD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  UPDATE public.wallets
     SET available_balance = available_balance - _amount,
         pending_balance = pending_balance + _amount,
         updated_at = now()
   WHERE user_id = uid;

  INSERT INTO public.withdrawals (user_id, amount, currency, method, phone, reference, status)
  VALUES (uid, _amount, 'XAF', _method, _phone, ref, 'PENDING');

  RETURN jsonb_build_object('ok', true, 'reference', ref);
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated;