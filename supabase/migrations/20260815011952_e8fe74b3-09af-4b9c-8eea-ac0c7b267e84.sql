ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS' AFTER 'CONFIRMED';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'SETTLED';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'NO_SHOW';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'DISPUTED';

CREATE OR REPLACE FUNCTION public.charge_platform_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD;
  fee numeric := 0;
  net numeric := 0;
  old_s text := coalesce(OLD.status::text, '');
  new_s text := NEW.status::text;
BEGIN
  SELECT user_id, billing_mode INTO p FROM public.provider_profiles WHERE id = NEW.provider_id;
  IF p.user_id IS NULL THEN RETURN NEW; END IF;

  IF p.billing_mode = 'COMMISSION' THEN
    fee := round(NEW.price * 0.01);
  END IF;
  net := NEW.price - fee;

  -- Recognise revenue + credit provider only on entry into COMPLETED
  IF new_s = 'COMPLETED' AND old_s IS DISTINCT FROM 'COMPLETED' THEN
    IF fee > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
      VALUES (p.user_id, 'PLATFORM_FEE', -fee, 'XAF', 'FEE-' || NEW.id::text,
              'Platform fee (1%) for ' || NEW.service_title, 'COMPLETED')
      ON CONFLICT (reference) DO NOTHING;
    END IF;

    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (p.user_id, 'BOOKING_EARNING', net, 'XAF', 'BKG-' || NEW.id::text,
            'Booking earning for ' || NEW.service_title, 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;

    UPDATE public.wallets
       SET available_balance = available_balance + net,
           total_earned = total_earned + net,
           updated_at = now()
     WHERE user_id = p.user_id;
  END IF;

  -- Reverse revenue + provider credit when a completed booking goes bad
  IF old_s = 'COMPLETED' AND new_s IN ('REFUNDED','DISPUTED','NO_SHOW','CANCELLED') THEN
    IF fee > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
      VALUES (p.user_id, 'PLATFORM_FEE_REVERSAL', fee, 'XAF', 'FEEREV-' || NEW.id::text,
              'Platform fee reversed for ' || NEW.service_title, 'COMPLETED')
      ON CONFLICT (reference) DO NOTHING;
    END IF;

    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (p.user_id, 'BOOKING_REVERSAL', -net, 'XAF', 'BKGREV-' || NEW.id::text,
            'Booking earning reversed for ' || NEW.service_title, 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;

    UPDATE public.wallets
       SET available_balance = greatest(available_balance - net, 0),
           total_earned = greatest(total_earned - net, 0),
           updated_at = now()
     WHERE user_id = p.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.platform_financials()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  activation_revenue numeric;
  subscription_revenue numeric;
  commission_revenue numeric;
  provider_owed numeric;
  member_owed numeric;
  pending_withdrawals numeric;
  refund_liability numeric;
BEGIN
  IF uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT coalesce(sum(amount),0) INTO activation_revenue
    FROM public.activations WHERE status = 'PAID';

  SELECT coalesce(sum(amount),0) INTO subscription_revenue
    FROM public.provider_subscriptions WHERE status = 'ACTIVE';

  SELECT coalesce(sum(CASE WHEN type = 'PLATFORM_FEE' THEN -amount ELSE -amount END),0) INTO commission_revenue
    FROM public.transactions
   WHERE type IN ('PLATFORM_FEE','PLATFORM_FEE_REVERSAL') AND status = 'COMPLETED';

  SELECT coalesce(sum(w.available_balance + w.pending_balance),0) INTO provider_owed
    FROM public.wallets w
   WHERE EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.user_id = w.user_id);

  SELECT coalesce(sum(w.available_balance + w.pending_balance),0) INTO member_owed
    FROM public.wallets w
   WHERE NOT EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.user_id = w.user_id);

  SELECT coalesce(sum(amount),0) INTO pending_withdrawals
    FROM public.withdrawals WHERE status IN ('PENDING','PROCESSING');

  SELECT coalesce(sum(price),0) INTO refund_liability
    FROM public.bookings WHERE status::text = 'DISPUTED';

  RETURN jsonb_build_object(
    'activation_revenue', activation_revenue,
    'subscription_revenue', subscription_revenue,
    'commission_revenue', commission_revenue,
    'platform_revenue', activation_revenue + subscription_revenue + commission_revenue,
    'provider_owed', provider_owed,
    'member_owed', member_owed,
    'pending_withdrawals', pending_withdrawals,
    'refund_liability', refund_liability,
    'available_to_platform',
      (activation_revenue + subscription_revenue + commission_revenue)
      - pending_withdrawals - refund_liability
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.platform_financials() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_financials() TO authenticated;