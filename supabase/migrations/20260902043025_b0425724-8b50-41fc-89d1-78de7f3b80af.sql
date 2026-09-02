-- Give every storefront default working hours so booking slots exist immediately.
INSERT INTO public.provider_availability (provider_id, weekday, start_minute, end_minute)
SELECT p.id, d.wd, 480, 1080
FROM public.provider_profiles p
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6)) AS d(wd)
WHERE NOT EXISTS (SELECT 1 FROM public.provider_availability a WHERE a.provider_id = p.id);

CREATE OR REPLACE FUNCTION public.seed_default_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.provider_availability a WHERE a.provider_id = NEW.id) THEN
    INSERT INTO public.provider_availability (provider_id, weekday, start_minute, end_minute)
    SELECT NEW.id, d.wd, 480, 1080 FROM (VALUES (1),(2),(3),(4),(5),(6)) AS d(wd);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_default_availability_on_create ON public.provider_profiles;
CREATE TRIGGER seed_default_availability_on_create
AFTER INSERT ON public.provider_profiles
FOR EACH ROW EXECUTE FUNCTION public.seed_default_availability();