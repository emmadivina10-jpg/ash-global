
CREATE OR REPLACE FUNCTION public.console_financials()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  activation_revenue numeric;
  subscription_revenue numeric;
  commission_revenue numeric;
  booking_cash numeric;
  provider_owed numeric;
  member_owed numeric;
  pending_withdrawals numeric;
  refund_liability numeric;
  paid_out numeric;
  cash_in numeric;
  cash_on_hand numeric;
  total_liabilities numeric;
  safe_to_withdraw numeric;
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
  SELECT booking_cash + coalesce(sum(-amount),0) INTO booking_cash FROM public.transactions
    WHERE type IN ('PLATFORM_FEE','PLATFORM_FEE_REVERSAL') AND status = 'COMPLETED';

  SELECT coalesce(sum(w.available_balance + w.pending_balance),0) INTO provider_owed FROM public.wallets w
    WHERE EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.user_id = w.user_id);
  SELECT coalesce(sum(w.available_balance + w.pending_balance),0) INTO member_owed FROM public.wallets w
    WHERE NOT EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.user_id = w.user_id);
  SELECT coalesce(sum(amount),0) INTO pending_withdrawals FROM public.withdrawals WHERE status IN ('PENDING','PROCESSING');
  SELECT coalesce(sum(price),0) INTO refund_liability FROM public.bookings WHERE status::text = 'DISPUTED';
  SELECT coalesce(sum(total_withdrawn),0) INTO paid_out FROM public.wallets;

  cash_in := activation_revenue + subscription_revenue + booking_cash;
  cash_on_hand := cash_in - paid_out;
  total_liabilities := provider_owed + member_owed + refund_liability;
  safe_to_withdraw := greatest(cash_on_hand - total_liabilities, 0);

  RETURN jsonb_build_object(
    'activation_revenue', activation_revenue,
    'subscription_revenue', subscription_revenue,
    'commission_revenue', commission_revenue,
    'booking_cash', booking_cash,
    'platform_revenue', activation_revenue + subscription_revenue + commission_revenue,
    'provider_owed', provider_owed,
    'member_owed', member_owed,
    'pending_withdrawals', pending_withdrawals,
    'refund_liability', refund_liability,
    'paid_out', paid_out,
    'cash_in', cash_in,
    'cash_on_hand', cash_on_hand,
    'total_liabilities', total_liabilities,
    'safe_to_withdraw', safe_to_withdraw,
    'available_to_platform', safe_to_withdraw
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.console_financials() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.console_financials() TO authenticated, service_role;

-- Accurate people/booking counters that are not capped by API page size.
CREATE OR REPLACE FUNCTION public.console_counts()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
  result jsonb;
BEGIN
  IF jwt_role <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'active_users', (SELECT count(*) FROM public.profiles WHERE account_status = 'ACTIVE'),
    'pending_users', (SELECT count(*) FROM public.profiles WHERE account_status <> 'ACTIVE'),
    'total_providers', (SELECT count(*) FROM public.provider_profiles),
    'live_providers', (SELECT count(*) FROM public.provider_profiles WHERE is_live),
    'total_services', (SELECT count(*) FROM public.provider_services WHERE is_active),
    'total_bookings', (SELECT count(*) FROM public.bookings),
    'paid_bookings', (SELECT count(*) FROM public.bookings WHERE status::text IN ('CONFIRMED','IN_PROGRESS','COMPLETED','SETTLED')),
    'completed_bookings', (SELECT count(*) FROM public.bookings WHERE status::text IN ('COMPLETED','SETTLED')),
    'pending_bookings', (SELECT count(*) FROM public.bookings WHERE status::text IN ('REQUESTED','ACCEPTED','PAYMENT_PROCESSING','PAYMENT_FAILED')),
    'gmv', (SELECT coalesce(sum(price),0) FROM public.bookings WHERE status::text IN ('CONFIRMED','IN_PROGRESS','COMPLETED','SETTLED')),
    'completed_gmv', (SELECT coalesce(sum(price),0) FROM public.bookings WHERE status::text IN ('COMPLETED','SETTLED'))
  ) INTO result;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.console_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.console_counts() TO authenticated, service_role;
