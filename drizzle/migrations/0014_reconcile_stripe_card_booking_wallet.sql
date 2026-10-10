-- 1) Campus/tutor bookings now use 15% like all bookings
CREATE OR REPLACE FUNCTION public.campus_commission_rate(_provider_id uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM public.campus_instructor_profiles p
    WHERE p.provider_id = _provider_id AND p.is_verified = true) THEN 0.15 ELSE NULL END;
$$;

-- 2) Card (Stripe) earnings are held in Stripe: recorded as PENDING, never added to the mobile-money wallet
CREATE OR REPLACE FUNCTION public.charge_platform_commission()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD; fee numeric := 0; net numeric := 0; rate numeric;
  is_card boolean := coalesce(NEW.payment_provider,'') = 'STRIPE';
  st text;
  old_s text := coalesce(OLD.status::text, ''); new_s text := NEW.status::text;
BEGIN
  SELECT user_id INTO p FROM public.provider_profiles WHERE id = NEW.provider_id;
  IF p.user_id IS NULL THEN RETURN NEW; END IF;
  rate := coalesce(public.campus_commission_rate(NEW.provider_id), NEW.commission_rate, 0.15);
  fee := coalesce(nullif(NEW.platform_fee, 0), round(NEW.price * rate));
  net := NEW.price - fee;
  st := CASE WHEN is_card THEN 'PENDING' ELSE 'COMPLETED' END;

  IF new_s = 'COMPLETED' AND old_s IS DISTINCT FROM 'COMPLETED' THEN
    IF fee > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
      VALUES (p.user_id, 'PLATFORM_FEE', -fee, 'XAF', 'FEE-' || NEW.id::text,
              'Platform fee (' || round(rate*100)::text || '%) for ' || NEW.service_title, st)
      ON CONFLICT (reference) DO NOTHING;
    END IF;
    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (p.user_id, 'BOOKING_EARNING', net, 'XAF', 'BKG-' || NEW.id::text,
            CASE WHEN is_card THEN 'Card booking earning held in Stripe for ' ELSE 'Booking earning for ' END || NEW.service_title, st)
    ON CONFLICT (reference) DO NOTHING;
    IF NOT is_card THEN
      UPDATE public.wallets SET available_balance = available_balance + net,
        total_earned = total_earned + net, updated_at = now() WHERE user_id = p.user_id;
    END IF;
  END IF;

  IF old_s = 'COMPLETED' AND new_s IN ('REFUNDED','DISPUTED','NO_SHOW','CANCELLED') THEN
    IF is_card THEN
      UPDATE public.transactions SET status = 'REVERSED'
       WHERE reference IN ('FEE-' || NEW.id::text, 'BKG-' || NEW.id::text) AND status = 'PENDING';
    ELSE
      IF fee > 0 THEN
        INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
        VALUES (p.user_id, 'PLATFORM_FEE_REVERSAL', fee, 'XAF', 'FEEREV-' || NEW.id::text,
                'Platform fee reversed for ' || NEW.service_title, 'COMPLETED') ON CONFLICT (reference) DO NOTHING;
      END IF;
      INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
      VALUES (p.user_id, 'BOOKING_REVERSAL', -net, 'XAF', 'BKGREV-' || NEW.id::text,
              'Booking earning reversed for ' || NEW.service_title, 'COMPLETED') ON CONFLICT (reference) DO NOTHING;
      UPDATE public.wallets SET available_balance = greatest(available_balance - net, 0),
        total_earned = greatest(total_earned - net, 0), updated_at = now() WHERE user_id = p.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Finance dashboard: card booking money sits in Stripe, not in TchokoPay cash
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
  IF jwt_role <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT coalesce(sum(amount),0) INTO activation_revenue FROM public.activations WHERE status = 'PAID';
  SELECT coalesce(sum(amount),0) INTO subscription_revenue FROM public.provider_subscriptions WHERE status = 'ACTIVE';
  SELECT coalesce(sum(-t.amount),0) INTO commission_revenue FROM public.transactions t
    WHERE t.type IN ('PLATFORM_FEE','PLATFORM_FEE_REVERSAL') AND t.status = 'COMPLETED'
      AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.payment_provider = 'STRIPE'
        AND t.reference IN ('FEE-'||b.id::text, 'FEEREV-'||b.id::text, 'FEE-ADJ-'||b.id::text));
  SELECT coalesce(sum(t.amount),0) INTO booking_cash FROM public.transactions t
    WHERE t.type IN ('BOOKING_EARNING','BOOKING_REVERSAL') AND t.status = 'COMPLETED'
      AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.payment_provider = 'STRIPE'
        AND t.reference IN ('BKG-'||b.id::text, 'BKGREV-'||b.id::text));
  booking_cash := booking_cash + commission_revenue;
  SELECT (SELECT coalesce(sum(amount),0) FROM public.payment_link_charges WHERE status='PAID')
  + (SELECT coalesce(sum(amount),0) FROM public.event_tickets WHERE status='PAID')
  + (SELECT coalesce(sum(amount),0) FROM public.promotions WHERE status IN ('PAID','ACTIVE'))
  + (SELECT coalesce(sum(amount),0) FROM public.verifications WHERE status='PAID')
  + (SELECT coalesce(sum(total),0) FROM public.clean_orders WHERE payment_status='PAID') INTO other_cash;
  SELECT coalesce(sum(w.available_balance + w.pending_balance),0) INTO provider_owed FROM public.wallets w
    WHERE EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.user_id = w.user_id);
  SELECT coalesce(sum(w.available_balance + w.pending_balance),0) INTO member_owed FROM public.wallets w
    WHERE NOT EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.user_id = w.user_id);
  SELECT coalesce(sum(amount),0) INTO pending_withdrawals FROM public.withdrawals WHERE status IN ('PENDING','PROCESSING');
  SELECT coalesce(sum(price),0) INTO refund_liability FROM public.bookings WHERE status::text = 'DISPUTED';
  SELECT coalesce(sum(amount),0) INTO paid_out FROM public.withdrawals WHERE status = 'COMPLETED';
  SELECT coalesce(sum(amount),0) INTO owner_paid FROM public.platform_payouts WHERE status IN ('COMPLETED','PENDING','PROCESSING');
  cash_in := activation_revenue + subscription_revenue + booking_cash + other_cash;
  cash_on_hand := greatest(cash_in - paid_out - owner_paid, 0);
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

-- 4) One-time correction for the card booking cff2875b (approved by CEO in chat)
DO $$
DECLARE uid uuid := '9c8fcc11-a8a1-45d2-a6ea-4c8a5629a4ab'; bid uuid := 'cff2875b-7f22-4340-bfc0-56de0759e27f';
BEGIN
  -- cancel stuck 300 XAF withdrawal (no money had left)
  UPDATE public.withdrawals SET status='FAILED', processed_at=now(),
    admin_note='Cancelled in reconciliation: card booking funds are in Stripe, not TchokoPay'
   WHERE id='5434c4fb-3a5d-4b73-baee-827cfd7427a8' AND status='PENDING';
  UPDATE public.transactions SET status='REVERSED' WHERE reference='WD-87C9B5564896';
  -- correct commission to 15% (500 -> 75 fee, 425 provider)
  PERFORM set_config('app.booking_rpc','on',true);
  UPDATE public.bookings SET commission_rate=0.15, platform_fee=75, provider_amount=425 WHERE id=bid;
  INSERT INTO public.transactions (user_id,type,amount,currency,reference,description,status)
  VALUES (uid,'PLATFORM_FEE',-25,'XAF','FEE-ADJ-'||bid::text,'Commission corrected from 10% to 15%','COMPLETED')
  ON CONFLICT (reference) DO NOTHING;
  -- remove the unbacked remainder so the wallet matches TchokoPay (0)
  INSERT INTO public.transactions (user_id,type,amount,currency,reference,description,status)
  VALUES (uid,'ADJUSTMENT',-325,'XAF','ADJ-RECON-STRIPE-'||left(bid::text,8),
    'Reconciliation: card booking funds held in Stripe, not available in TchokoPay','COMPLETED')
  ON CONFLICT (reference) DO NOTHING;
  UPDATE public.wallets SET available_balance=0, pending_balance=0, updated_at=now() WHERE user_id=uid;
END $$;