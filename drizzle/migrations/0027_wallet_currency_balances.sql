CREATE TABLE public.wallet_balances (
  user_id uuid NOT NULL,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  available numeric NOT NULL DEFAULT 0 CHECK (available >= 0),
  pending numeric NOT NULL DEFAULT 0 CHECK (pending >= 0),
  total_in numeric NOT NULL DEFAULT 0,
  total_out numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, currency)
);
GRANT SELECT ON public.wallet_balances TO authenticated;
GRANT ALL ON public.wallet_balances TO service_role;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their currency balances" ON public.wallet_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);
COMMENT ON TABLE public.wallet_balances IS 'Card/Stripe-funded wallet money held in the Stripe settlement currency (non-XAF). XAF Mobile Money money stays in wallets.available_balance.';

-- Card/Stripe top-up: credit the real settled amount in its own currency; never touches XAF.
CREATE OR REPLACE FUNCTION public.complete_wallet_topup_stripe(_payment_reference text, _provider_transaction_id text, _currency text, _amount numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.payment_transactions%ROWTYPE; cur text := upper(coalesce(_currency, ''));
BEGIN
  IF cur !~ '^[A-Z]{3}$' OR cur = 'XAF' OR _amount IS NULL OR _amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT'); END IF;
  SELECT * INTO r FROM public.payment_transactions WHERE reference = _payment_reference AND purpose = 'WALLET_TOPUP' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'TOPUP_NOT_FOUND'); END IF;
  IF r.status = 'SUCCESS' THEN RETURN jsonb_build_object('ok', true, 'duplicate', true); END IF;
  IF r.status = 'REFUNDED' OR r.method <> 'CARD' OR r.user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'TOPUP_INVALID'); END IF;
  UPDATE public.payment_transactions SET status = 'SUCCESS', completed_at = now(), updated_at = now(),
    provider_reference = COALESCE(provider_reference, NULLIF(_provider_transaction_id, '')), reconciliation_status = 'RECONCILED',
    detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object('settled_currency', cur, 'settled_amount', _amount)
   WHERE id = r.id;
  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (r.user_id, 'WALLET_TOPUP', _amount, cur, r.reference, 'Wallet top-up (CARD)', 'COMPLETED')
  ON CONFLICT (reference) DO NOTHING;
  INSERT INTO public.wallet_balances (user_id, currency, available, total_in) VALUES (r.user_id, cur, _amount, _amount)
  ON CONFLICT (user_id, currency) DO UPDATE SET available = public.wallet_balances.available + EXCLUDED.available,
    total_in = public.wallet_balances.total_in + EXCLUDED.total_in, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END $function$;
REVOKE ALL ON FUNCTION public.complete_wallet_topup_stripe(text, text, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_wallet_topup_stripe(text, text, text, numeric) TO service_role;

-- XAF top-ups only (Mobile Money / bank transfer). Card top-ups must use the Stripe settlement path.
CREATE OR REPLACE FUNCTION public.complete_wallet_topup(_payment_reference text, _provider_transaction_id text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.payment_transactions%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.payment_transactions WHERE reference = _payment_reference AND purpose = 'WALLET_TOPUP' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOPUP_NOT_FOUND'; END IF;
  IF r.status = 'SUCCESS' THEN RETURN; END IF;
  IF r.status IN ('REFUNDED') THEN RAISE EXCEPTION 'TOPUP_FINAL'; END IF;
  IF r.method = 'CARD' THEN RAISE EXCEPTION 'USE_STRIPE_SETTLEMENT'; END IF;
  IF r.user_id IS NULL OR r.amount IS NULL OR r.amount <= 0 THEN RAISE EXCEPTION 'TOPUP_INVALID'; END IF;
  UPDATE public.payment_transactions SET status = 'SUCCESS', completed_at = now(), updated_at = now(),
         provider_reference = COALESCE(provider_reference, NULLIF(_provider_transaction_id, '')), reconciliation_status = 'RECONCILED'
   WHERE id = r.id;
  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (r.user_id, 'WALLET_TOPUP', r.amount, r.currency, r.reference, 'Wallet top-up (' || r.method || ')', 'COMPLETED')
  ON CONFLICT (reference) DO NOTHING;
  INSERT INTO public.wallets (user_id, available_balance, currency) VALUES (r.user_id, r.amount, r.currency)
  ON CONFLICT (user_id) DO UPDATE SET available_balance = public.wallets.available_balance + EXCLUDED.available_balance, updated_at = now();
END $function$;

-- Withdraw from one currency, by the method that matches where the money is.
CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(_amount numeric, _method text, _phone text, _currency text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); cur text := upper(coalesce(_currency, 'XAF')); w public.wallets%ROWTYPE;
  b public.wallet_balances%ROWTYPE; payouts_ok boolean; ref text; dest text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  IF cur = 'XAF' THEN
    IF _method NOT IN ('MTN_MOMO','ORANGE_MONEY') THEN RETURN jsonb_build_object('ok', false, 'error', 'WRONG_FUNDING_SOURCE'); END IF;
    IF _phone !~ '^(\+?237)?6[0-9]{8}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_PHONE'); END IF;
    IF _amount IS NULL OR _amount < 100 THEN RETURN jsonb_build_object('ok', false, 'error', 'MIN_AMOUNT_100'); END IF;
    dest := _phone;
  ELSE
    IF _method <> 'STRIPE_BANK' THEN RETURN jsonb_build_object('ok', false, 'error', 'WRONG_FUNDING_SOURCE'); END IF;
    SELECT stripe_payouts_enabled INTO payouts_ok FROM public.profiles WHERE user_id = uid;
    IF NOT coalesce(payouts_ok, false) THEN RETURN jsonb_build_object('ok', false, 'error', 'BANK_PAYOUTS_NOT_READY'); END IF;
    IF _amount IS NULL OR _amount < 1 THEN RETURN jsonb_build_object('ok', false, 'error', 'MIN_AMOUNT_1'); END IF;
    _amount := round(_amount, 2);
    dest := 'STRIPE_BANK';
  END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals wd WHERE wd.user_id = uid AND wd.status IN ('PENDING','PROCESSING')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PENDING_WITHDRAWAL_EXISTS');
  END IF;
  IF cur = 'XAF' THEN
    SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
    IF w.user_id IS NULL OR w.available_balance - w.card_balance < _amount THEN RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_BALANCE'); END IF;
  ELSE
    SELECT * INTO b FROM public.wallet_balances WHERE user_id = uid AND currency = cur FOR UPDATE;
    IF b.user_id IS NULL OR b.available < _amount THEN RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_BALANCE'); END IF;
  END IF;
  ref := 'WD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  INSERT INTO public.withdrawals (user_id, amount, currency, payment_method, phone_number, status, reference)
  VALUES (uid, _amount, cur, _method, dest, 'PENDING', ref);
  IF cur = 'XAF' THEN
    UPDATE public.wallets SET available_balance = available_balance - _amount, pending_balance = pending_balance + _amount, updated_at = now() WHERE user_id = uid;
  ELSE
    UPDATE public.wallet_balances SET available = available - _amount, pending = pending + _amount, updated_at = now() WHERE user_id = uid AND currency = cur;
  END IF;
  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (uid, 'WITHDRAWAL', -_amount, cur, ref, CASE WHEN cur = 'XAF' THEN 'Mobile money withdrawal request' ELSE 'Bank withdrawal request' END, 'PENDING')
  ON CONFLICT (reference) DO NOTHING;
  PERFORM public.notify_user(uid, 'WITHDRAWAL', 'Withdrawal requested',
    'Your withdrawal of ' || _amount::text || ' ' || cur || ' is pending.', jsonb_build_object('reference', ref, 'method', _method));
  RETURN jsonb_build_object('ok', true, 'reference', ref);
END $function$;
REVOKE ALL ON FUNCTION public.request_wallet_withdrawal(numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal(numeric, text, text, text) TO authenticated, service_role;

-- Shared settlement of a withdrawal against the right currency balance.
CREATE OR REPLACE FUNCTION public.apply_withdrawal_settlement(wd public.withdrawals, _status text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cur text := upper(coalesce(wd.currency, 'XAF'));
BEGIN
  IF _status = 'COMPLETED' THEN
    IF cur = 'XAF' THEN
      UPDATE public.wallets SET pending_balance = pending_balance - wd.amount, total_withdrawn = total_withdrawn + wd.amount, updated_at = now() WHERE user_id = wd.user_id;
    ELSE
      UPDATE public.wallet_balances SET pending = pending - wd.amount, total_out = total_out + wd.amount, updated_at = now() WHERE user_id = wd.user_id AND currency = cur;
    END IF;
    UPDATE public.transactions SET status = 'COMPLETED' WHERE reference = wd.reference;
  ELSIF _status IN ('FAILED','REVERSED') THEN
    IF cur = 'XAF' THEN
      UPDATE public.wallets SET pending_balance = pending_balance - wd.amount, available_balance = available_balance + wd.amount,
        card_balance = card_balance + CASE WHEN wd.payment_method = 'STRIPE_BANK' THEN wd.amount ELSE 0 END, updated_at = now() WHERE user_id = wd.user_id;
    ELSE
      UPDATE public.wallet_balances SET pending = pending - wd.amount, available = available + wd.amount, updated_at = now() WHERE user_id = wd.user_id AND currency = cur;
    END IF;
    UPDATE public.transactions SET status = 'REVERSED' WHERE reference = wd.reference;
    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (wd.user_id, 'WITHDRAWAL_REVERSAL', wd.amount, cur, wd.reference || '-REV', 'Withdrawal reversed', 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;
  END IF;
END $function$;
REVOKE ALL ON FUNCTION public.apply_withdrawal_settlement(public.withdrawals, text) FROM PUBLIC, anon, authenticated;

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
  PERFORM public.apply_withdrawal_settlement(wd, _status);
  RETURN jsonb_build_object('ok', true);
END $function$;

CREATE OR REPLACE FUNCTION public.console_settle_withdrawal(_withdrawal_id uuid, _status text, _provider_reference text DEFAULT NULL::text, _note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE wd public.withdrawals%ROWTYPE; cur text;
BEGIN
  IF _status NOT IN ('PROCESSING','COMPLETED','FAILED','REVERSED') THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_STATUS'); END IF;
  SELECT * INTO wd FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF wd.status IN ('COMPLETED','FAILED','REVERSED') THEN RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_SETTLED'); END IF;
  cur := upper(coalesce(wd.currency, 'XAF'));
  UPDATE public.withdrawals SET status = _status, provider_reference = coalesce(_provider_reference, provider_reference),
    admin_note = coalesce(_note, admin_note),
    processed_at = CASE WHEN _status IN ('COMPLETED','FAILED','REVERSED') THEN now() ELSE processed_at END
  WHERE id = wd.id;
  PERFORM public.apply_withdrawal_settlement(wd, _status);
  IF _status = 'COMPLETED' THEN
    PERFORM public.notify_user(wd.user_id, 'WITHDRAWAL', 'Withdrawal completed', wd.amount::text || ' ' || cur || ' has been sent.', jsonb_build_object('reference', wd.reference));
  ELSIF _status = 'PROCESSING' THEN
    PERFORM public.notify_user(wd.user_id, 'WITHDRAWAL', 'Withdrawal processing', 'Your withdrawal of ' || wd.amount::text || ' ' || cur || ' is being processed.', jsonb_build_object('reference', wd.reference));
  ELSIF _status IN ('FAILED','REVERSED') THEN
    PERFORM public.notify_user(wd.user_id, 'WITHDRAWAL', 'Withdrawal ' || lower(_status), 'Your withdrawal of ' || wd.amount::text || ' ' || cur || ' was returned to your available balance.', jsonb_build_object('reference', wd.reference));
  END IF;
  RETURN jsonb_build_object('ok', true);
END $function$;

COMMENT ON COLUMN public.wallets.card_balance IS 'DEPRECATED: card/Stripe money now lives in wallet_balances in its settled currency.';