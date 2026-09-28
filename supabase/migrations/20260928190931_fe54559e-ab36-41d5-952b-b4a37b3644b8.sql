CREATE OR REPLACE FUNCTION public.console_financials()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  activation_revenue numeric; subscription_revenue numeric; commission_revenue numeric;
  booking_cash numeric; other_cash numeric; provider_owed numeric; member_owed numeric;
  pending_withdrawals numeric; refund_liability numeric; paid_out numeric; owner_paid numeric;
  cash_in numeric; cash_on_hand numeric; total_liabilities numeric; safe_to_withdraw numeric;
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
BEGIN
  IF jwt_role <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT coalesce(sum(amount),0) INTO activation_revenue FROM public.activations WHERE status = 'PAID';
  SELECT coalesce(sum(amount),0) INTO subscription_revenue FROM public.provider_subscriptions WHERE status = 'ACTIVE';
  SELECT coalesce(sum(-amount),0) INTO commission_revenue FROM public.transactions
    WHERE type IN ('PLATFORM_FEE','PLATFORM_FEE_REVERSAL') AND status = 'COMPLETED';
  SELECT coalesce(sum(amount),0) INTO booking_cash FROM public.transactions
    WHERE type IN ('BOOKING_EARNING','BOOKING_REVERSAL') AND status = 'COMPLETED';
  booking_cash := booking_cash + commission_revenue;
  SELECT
    (SELECT coalesce(sum(amount),0) FROM public.payment_link_charges WHERE status='PAID')
  + (SELECT coalesce(sum(amount),0) FROM public.event_tickets WHERE status='PAID')
  + (SELECT coalesce(sum(amount),0) FROM public.promotions WHERE status IN ('PAID','ACTIVE'))
  + (SELECT coalesce(sum(amount),0) FROM public.verifications WHERE status='PAID')
  + (SELECT coalesce(sum(total),0) FROM public.clean_orders WHERE payment_status='PAID')
  INTO other_cash;
  SELECT coalesce(sum(w.available_balance + w.pending_balance),0) INTO provider_owed FROM public.wallets w
    WHERE EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.user_id = w.user_id);
  SELECT coalesce(sum(w.available_balance + w.pending_balance),0) INTO member_owed FROM public.wallets w
    WHERE NOT EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.user_id = w.user_id);
  SELECT coalesce(sum(amount),0) INTO pending_withdrawals FROM public.withdrawals WHERE status IN ('PENDING','PROCESSING');
  SELECT coalesce(sum(price),0) INTO refund_liability FROM public.bookings WHERE status::text = 'DISPUTED';
  SELECT coalesce(sum(amount),0) INTO paid_out FROM public.withdrawals WHERE status = 'COMPLETED';
  SELECT coalesce(sum(amount),0) INTO owner_paid FROM public.platform_payouts WHERE status IN ('COMPLETED','PENDING','PROCESSING');

  cash_in := activation_revenue + subscription_revenue + booking_cash + other_cash;
  cash_on_hand := cash_in - paid_out - owner_paid;
  total_liabilities := provider_owed + member_owed + refund_liability;
  safe_to_withdraw := greatest(cash_on_hand - total_liabilities, 0);
  RETURN jsonb_build_object(
    'activation_revenue', activation_revenue, 'subscription_revenue', subscription_revenue,
    'commission_revenue', commission_revenue, 'booking_cash', booking_cash, 'other_cash', other_cash,
    'platform_revenue', activation_revenue + subscription_revenue + commission_revenue,
    'provider_owed', provider_owed, 'member_owed', member_owed,
    'pending_withdrawals', pending_withdrawals, 'refund_liability', refund_liability,
    'paid_out', paid_out, 'owner_paid_out', owner_paid, 'cash_in', cash_in, 'cash_on_hand', cash_on_hand,
    'total_liabilities', total_liabilities, 'safe_to_withdraw', safe_to_withdraw,
    'available_to_platform', safe_to_withdraw);
END; $function$;