ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS card_balance numeric NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.wallets.card_balance IS 'Portion of available_balance funded by card/bank (Stripe). Withdrawable only via STRIPE_BANK. Mobile money portion = available_balance - card_balance.';

UPDATE public.wallets w SET card_balance = LEAST(w.available_balance, coalesce((
  SELECT sum(pt.amount) FROM public.payment_transactions pt
   WHERE pt.user_id = w.user_id AND pt.purpose = 'WALLET_TOPUP' AND pt.status = 'SUCCESS' AND pt.method IN ('CARD','BANK')), 0));

ALTER TABLE public.wallets ADD CONSTRAINT wallets_card_balance_range CHECK (card_balance >= 0 AND card_balance <= available_balance) NOT VALID;

CREATE OR REPLACE FUNCTION public.complete_wallet_topup(_payment_reference text, _provider_transaction_id text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.payment_transactions%ROWTYPE; card_amt numeric;
BEGIN
  SELECT * INTO r FROM public.payment_transactions WHERE reference = _payment_reference AND purpose = 'WALLET_TOPUP' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOPUP_NOT_FOUND'; END IF;
  IF r.status = 'SUCCESS' THEN RETURN; END IF;
  IF r.status IN ('REFUNDED') THEN RAISE EXCEPTION 'TOPUP_FINAL'; END IF;
  IF r.user_id IS NULL OR r.amount IS NULL OR r.amount <= 0 THEN RAISE EXCEPTION 'TOPUP_INVALID'; END IF;
  card_amt := CASE WHEN r.method IN ('CARD','BANK') THEN r.amount ELSE 0 END;

  UPDATE public.payment_transactions
     SET status = 'SUCCESS', completed_at = now(), updated_at = now(),
         provider_reference = COALESCE(provider_reference, NULLIF(_provider_transaction_id, '')),
         reconciliation_status = 'RECONCILED'
   WHERE id = r.id;

  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (r.user_id, 'WALLET_TOPUP', r.amount, r.currency, r.reference, 'Wallet top-up (' || r.method || ')', 'COMPLETED')
  ON CONFLICT (reference) DO NOTHING;

  INSERT INTO public.wallets (user_id, available_balance, card_balance, currency)
  VALUES (r.user_id, r.amount, card_amt, r.currency)
  ON CONFLICT (user_id) DO UPDATE SET available_balance = public.wallets.available_balance + EXCLUDED.available_balance,
    card_balance = public.wallets.card_balance + EXCLUDED.card_balance, updated_at = now();
END $function$;

CREATE OR REPLACE FUNCTION public.activate_with_wallet()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid(); st text; w public.wallets%ROWTYPE; fee numeric := 5000;
  ref text; act_id uuid; done jsonb; from_card numeric;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT account_status INTO st FROM public.profiles WHERE user_id = uid;
  IF st = 'ACTIVE' THEN RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_ACTIVE'); END IF;
  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NO_WALLET'); END IF;
  IF w.available_balance < fee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_BALANCE', 'balance', w.available_balance);
  END IF;
  -- Spend mobile-money funds first, then card funds.
  from_card := GREATEST(fee - (w.available_balance - w.card_balance), 0);
  ref := 'WALLET-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  UPDATE public.wallets SET available_balance = available_balance - fee,
     card_balance = card_balance - from_card, updated_at = now() WHERE user_id = uid;
  INSERT INTO public.activations (user_id, amount, currency, payment_provider, payment_reference, status)
  VALUES (uid, fee, 'XAF', 'WALLET', ref, 'PENDING') RETURNING id INTO act_id;
  done := public.complete_activation(ref, 'WALLET');
  IF coalesce((done ->> 'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'activation completion failed: %', done;
  END IF;
  RETURN jsonb_build_object('ok', true, 'reference', ref, 'balance', w.available_balance - fee);
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method text, _phone text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid(); w public.wallets%ROWTYPE; payouts_ok boolean; ref text; dest text;
  is_card boolean := _method = 'STRIPE_BANK'; allowed numeric;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT stripe_payouts_enabled INTO payouts_ok FROM public.profiles WHERE user_id = uid;
  IF _method NOT IN ('MTN_MOMO','ORANGE_MONEY','STRIPE_BANK') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_METHOD');
  END IF;
  IF is_card THEN
    IF NOT coalesce(payouts_ok, false) THEN RETURN jsonb_build_object('ok', false, 'error', 'BANK_PAYOUTS_NOT_READY'); END IF;
    dest := 'STRIPE_BANK';
  ELSE
    IF _phone !~ '^(\+?237)?6[0-9]{8}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_PHONE'); END IF;
    dest := _phone;
  END IF;
  IF _amount IS NULL OR _amount < 100 THEN RETURN jsonb_build_object('ok', false, 'error', 'MIN_AMOUNT_100'); END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF w.user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'WALLET_NOT_FOUND'); END IF;
  -- Money leaves the same way it came in.
  allowed := CASE WHEN is_card THEN w.card_balance ELSE w.available_balance - w.card_balance END;
  IF allowed < _amount THEN
    RETURN jsonb_build_object('ok', false,
      'error', CASE WHEN w.available_balance >= _amount THEN 'WRONG_FUNDING_SOURCE' ELSE 'INSUFFICIENT_BALANCE' END,
      'allowed', allowed);
  END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals wd WHERE wd.user_id = uid AND wd.status IN ('PENDING','PROCESSING')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PENDING_WITHDRAWAL_EXISTS');
  END IF;

  ref := 'WD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  INSERT INTO public.withdrawals (user_id, amount, currency, payment_method, phone_number, status, reference)
  VALUES (uid, _amount, w.currency, _method, dest, 'PENDING', ref);
  UPDATE public.wallets
     SET available_balance = available_balance - _amount,
         card_balance = card_balance - CASE WHEN is_card THEN _amount ELSE 0 END,
         pending_balance = pending_balance + _amount, updated_at = now()
   WHERE user_id = uid;
  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (uid, 'WITHDRAWAL', -_amount, w.currency, ref,
          CASE WHEN is_card THEN 'Bank withdrawal request' ELSE 'Mobile money withdrawal request' END, 'PENDING')
  ON CONFLICT (reference) DO NOTHING;
  PERFORM public.notify_user(uid, 'WITHDRAWAL', 'Withdrawal requested',
    'Your withdrawal of ' || _amount::bigint || ' XAF is pending review.',
    jsonb_build_object('reference', ref, 'method', _method));
  RETURN jsonb_build_object('ok', true, 'reference', ref);
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_withdrawal(_withdrawal_id uuid, _status text, _provider_reference text DEFAULT NULL::text, _note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); wd public.withdrawals%ROWTYPE;
BEGIN
  IF NOT public.has_role(uid,'admin') THEN RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN'); END IF;
  IF _status NOT IN ('PROCESSING','COMPLETED','FAILED','REVERSED') THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_STATUS'); END IF;
  SELECT * INTO wd FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF wd.status IN ('COMPLETED','FAILED','REVERSED') THEN RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_SETTLED'); END IF;
  UPDATE public.withdrawals SET status = _status, provider_reference = coalesce(_provider_reference, provider_reference),
    admin_note = coalesce(_note, admin_note),
    processed_at = CASE WHEN _status IN ('COMPLETED','FAILED','REVERSED') THEN now() ELSE processed_at END
  WHERE id = wd.id;
  IF _status = 'COMPLETED' THEN
    UPDATE public.wallets SET pending_balance = pending_balance - wd.amount,
      total_withdrawn = total_withdrawn + wd.amount, updated_at = now() WHERE user_id = wd.user_id;
    UPDATE public.transactions SET status = 'COMPLETED' WHERE reference = wd.reference;
  ELSIF _status IN ('FAILED','REVERSED') THEN
    UPDATE public.wallets SET pending_balance = pending_balance - wd.amount,
      available_balance = available_balance + wd.amount,
      card_balance = card_balance + CASE WHEN wd.payment_method = 'STRIPE_BANK' THEN wd.amount ELSE 0 END,
      updated_at = now() WHERE user_id = wd.user_id;
    UPDATE public.transactions SET status = 'REVERSED' WHERE reference = wd.reference;
    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (wd.user_id, 'WITHDRAWAL_REVERSAL', wd.amount, wd.currency, wd.reference || '-REV', 'Withdrawal reversed', 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.console_settle_withdrawal(_withdrawal_id uuid, _status text, _provider_reference text DEFAULT NULL::text, _note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE wd public.withdrawals%ROWTYPE;
BEGIN
  IF _status NOT IN ('PROCESSING','COMPLETED','FAILED','REVERSED') THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_STATUS'); END IF;
  SELECT * INTO wd FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF wd.status IN ('COMPLETED','FAILED','REVERSED') THEN RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_SETTLED'); END IF;
  UPDATE public.withdrawals SET status = _status,
    provider_reference = coalesce(_provider_reference, provider_reference),
    admin_note = coalesce(_note, admin_note),
    processed_at = CASE WHEN _status IN ('COMPLETED','FAILED','REVERSED') THEN now() ELSE processed_at END
  WHERE id = wd.id;
  IF _status = 'COMPLETED' THEN
    UPDATE public.wallets SET pending_balance = pending_balance - wd.amount,
      total_withdrawn = total_withdrawn + wd.amount, updated_at = now() WHERE user_id = wd.user_id;
    UPDATE public.transactions SET status = 'COMPLETED' WHERE reference = wd.reference;
    PERFORM public.notify_user(wd.user_id, 'WITHDRAWAL', 'Withdrawal completed',
      wd.amount::bigint || ' XAF has been sent to ' || wd.phone_number || '.',
      jsonb_build_object('reference', wd.reference));
  ELSIF _status = 'PROCESSING' THEN
    PERFORM public.notify_user(wd.user_id, 'WITHDRAWAL', 'Withdrawal processing',
      'Your withdrawal of ' || wd.amount::bigint || ' XAF is being processed.',
      jsonb_build_object('reference', wd.reference));
  ELSIF _status IN ('FAILED','REVERSED') THEN
    UPDATE public.wallets SET pending_balance = pending_balance - wd.amount,
      available_balance = available_balance + wd.amount,
      card_balance = card_balance + CASE WHEN wd.payment_method = 'STRIPE_BANK' THEN wd.amount ELSE 0 END,
      updated_at = now() WHERE user_id = wd.user_id;
    UPDATE public.transactions SET status = 'REVERSED' WHERE reference = wd.reference;
    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (wd.user_id, 'WITHDRAWAL_REVERSAL', wd.amount, wd.currency, wd.reference || '-REV', 'Withdrawal reversed', 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;
    PERFORM public.notify_user(wd.user_id, 'WITHDRAWAL', 'Withdrawal ' || lower(_status),
      'Your withdrawal of ' || wd.amount::bigint || ' XAF was returned to your available balance.',
      jsonb_build_object('reference', wd.reference));
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;