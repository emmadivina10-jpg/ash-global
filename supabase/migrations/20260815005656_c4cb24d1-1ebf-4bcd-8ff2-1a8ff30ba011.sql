ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'SUBSCRIPTION';

ALTER TABLE public.provider_profiles
  DROP CONSTRAINT IF EXISTS provider_profiles_billing_mode_check;
ALTER TABLE public.provider_profiles
  ADD CONSTRAINT provider_profiles_billing_mode_check
  CHECK (billing_mode IN ('SUBSCRIPTION','COMMISSION'));

CREATE OR REPLACE FUNCTION public.enforce_provider_live()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.billing_mode = 'COMMISSION' THEN
    NEW.is_live := true;
  ELSE
    NEW.is_live := coalesce(NEW.subscription_expires_at, to_timestamp(0)) > now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provider_profiles_enforce_live ON public.provider_profiles;
CREATE TRIGGER provider_profiles_enforce_live
BEFORE INSERT OR UPDATE ON public.provider_profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_provider_live();

CREATE OR REPLACE FUNCTION public.charge_platform_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  fee numeric;
BEGIN
  IF NEW.status = 'COMPLETED' AND (OLD.status IS DISTINCT FROM 'COMPLETED') THEN
    SELECT user_id, billing_mode INTO p FROM public.provider_profiles WHERE id = NEW.provider_id;
    IF p.billing_mode = 'COMMISSION' THEN
      fee := round(NEW.price * 0.01);
      IF fee > 0 THEN
        INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
        VALUES (p.user_id, 'PLATFORM_FEE', -fee, 'XAF', 'FEE-' || NEW.id::text,
                'Platform fee (1%) for ' || NEW.service_title, 'COMPLETED')
        ON CONFLICT (reference) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_platform_commission ON public.bookings;
CREATE TRIGGER bookings_platform_commission
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.charge_platform_commission();

REVOKE EXECUTE ON FUNCTION public.charge_platform_commission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_provider_live() FROM PUBLIC, anon, authenticated;

UPDATE public.provider_profiles
  SET is_live = coalesce(subscription_expires_at, to_timestamp(0)) > now()
  WHERE billing_mode = 'SUBSCRIPTION';