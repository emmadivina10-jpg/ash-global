CREATE OR REPLACE FUNCTION public.enforce_service_min_price()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.price IS DISTINCT FROM OLD.price THEN
    IF NEW.price < 1850 THEN
      RAISE EXCEPTION 'PRICE_BELOW_MINIMUM: minimum service price is 1850 XAF' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_service_min_price ON public.provider_services;
CREATE TRIGGER trg_enforce_service_min_price BEFORE INSERT OR UPDATE OF price ON public.provider_services
FOR EACH ROW EXECUTE FUNCTION public.enforce_service_min_price();