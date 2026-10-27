CREATE OR REPLACE FUNCTION public.complete_wallet_topup_stripe(_payment_reference text, _provider_transaction_id text, _currency text, _amount numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.payment_transactions%ROWTYPE; cur text := upper(coalesce(_currency, ''));
BEGIN
  IF cur !~ '^[A-Z]{3}$' OR cur = 'XAF' OR _amount IS NULL OR _amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT'); END IF;
  SELECT * INTO r FROM public.payment_transactions WHERE reference = _payment_reference AND purpose = 'WALLET_TOPUP' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'TOPUP_NOT_FOUND'); END IF;
  IF r.status = 'SUCCESS' THEN RETURN jsonb_build_object('ok', true, 'duplicate', true); END IF;
  IF upper(r.status) IN ('REFUNDED','EXPIRED','CANCELLED','CANCELED') OR r.method <> 'CARD' OR r.user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'TOPUP_INVALID'); END IF;
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