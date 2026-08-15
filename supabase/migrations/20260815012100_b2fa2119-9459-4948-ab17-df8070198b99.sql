CREATE OR REPLACE FUNCTION public.console_settle_withdrawal(_withdrawal_id uuid, _status text, _provider_reference text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  ELSIF _status IN ('FAILED','REVERSED') THEN
    UPDATE public.wallets SET pending_balance = pending_balance - wd.amount,
      available_balance = available_balance + wd.amount, updated_at = now() WHERE user_id = wd.user_id;
    UPDATE public.transactions SET status = 'REVERSED' WHERE reference = wd.reference;
    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (wd.user_id, 'WITHDRAWAL_REVERSAL', wd.amount, wd.currency, wd.reference || '-REV', 'Withdrawal reversed', 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.console_settle_withdrawal(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.console_settle_withdrawal(uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.console_financials()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  activation_revenue numeric;
  subscription_revenue numeric;
  commission_revenue numeric;
  provider_owed numeric;
  member_owed numeric;
  pending_withdrawals numeric;
  refund_liability numeric;
BEGIN
  SELECT coalesce(sum(amount),0) INTO activation_revenue FROM public.activations WHERE status = 'PAID';
  SELECT coalesce(sum(amount),0) INTO subscription_revenue FROM public.provider_subscriptions WHERE status = 'ACTIVE';
  SELECT coalesce(sum(-amount),0) INTO commission_revenue FROM public.transactions
    WHERE type IN ('PLATFORM_FEE','PLATFORM_FEE_REVERSAL') AND status = 'COMPLETED';
  SELECT coalesce(sum(w.available_balance + w.pending_balance),0) INTO provider_owed FROM public.wallets w
    WHERE EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.user_id = w.user_id);
  SELECT coalesce(sum(w.available_balance + w.pending_balance),0) INTO member_owed FROM public.wallets w
    WHERE NOT EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.user_id = w.user_id);
  SELECT coalesce(sum(amount),0) INTO pending_withdrawals FROM public.withdrawals WHERE status IN ('PENDING','PROCESSING');
  SELECT coalesce(sum(price),0) INTO refund_liability FROM public.bookings WHERE status::text = 'DISPUTED';

  RETURN jsonb_build_object(
    'activation_revenue', activation_revenue,
    'subscription_revenue', subscription_revenue,
    'commission_revenue', commission_revenue,
    'platform_revenue', activation_revenue + subscription_revenue + commission_revenue,
    'provider_owed', provider_owed,
    'member_owed', member_owed,
    'pending_withdrawals', pending_withdrawals,
    'refund_liability', refund_liability,
    'available_to_platform', (activation_revenue + subscription_revenue + commission_revenue) - pending_withdrawals - refund_liability
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.console_financials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.console_financials() TO service_role;