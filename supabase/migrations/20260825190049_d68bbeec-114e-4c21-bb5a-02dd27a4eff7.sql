
-- 1) Marketplace is free: every provider is on 1% commission, no subscription needed.
ALTER TABLE public.provider_profiles ALTER COLUMN billing_mode SET DEFAULT 'COMMISSION';
UPDATE public.provider_profiles SET billing_mode = 'COMMISSION' WHERE billing_mode <> 'COMMISSION';

CREATE OR REPLACE FUNCTION public.enforce_provider_live()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  -- Free marketplace: providers are live as soon as they have a business name.
  NEW.billing_mode := 'COMMISSION';
  NEW.is_live := coalesce(nullif(btrim(NEW.business_name), ''), NULL) IS NOT NULL;
  RETURN NEW;
END;
$function$;

UPDATE public.provider_profiles SET updated_at = now();

-- 2) Platform always takes 1% of every booking transaction.
CREATE OR REPLACE FUNCTION public.charge_platform_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  p RECORD;
  fee numeric := 0;
  net numeric := 0;
  old_s text := coalesce(OLD.status::text, '');
  new_s text := NEW.status::text;
BEGIN
  SELECT user_id INTO p FROM public.provider_profiles WHERE id = NEW.provider_id;
  IF p.user_id IS NULL THEN RETURN NEW; END IF;

  fee := round(NEW.price * 0.01);
  net := NEW.price - fee;

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
