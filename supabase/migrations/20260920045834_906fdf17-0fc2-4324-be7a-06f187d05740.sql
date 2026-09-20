CREATE OR REPLACE FUNCTION public.enforce_admin_verified_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(NEW.user_id, 'admin'::public.app_role) THEN
    NEW.verified_tier := 'BUSINESS_PLUS';
    NEW.verified_until := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_verified_badge_on_profile ON public.profiles;
CREATE TRIGGER enforce_admin_verified_badge_on_profile
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_admin_verified_badge();

CREATE OR REPLACE FUNCTION public.grant_admin_verified_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin'::public.app_role THEN
    UPDATE public.profiles
       SET verified_tier = 'BUSINESS_PLUS',
           verified_until = NULL
     WHERE user_id = NEW.user_id;

    UPDATE public.public_profiles
       SET verified_tier = 'BUSINESS_PLUS',
           verified_until = NULL
     WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_admin_verified_badge_on_role ON public.user_roles;
CREATE TRIGGER grant_admin_verified_badge_on_role
AFTER INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.grant_admin_verified_badge();

UPDATE public.profiles AS p
   SET verified_tier = 'BUSINESS_PLUS',
       verified_until = NULL
 WHERE EXISTS (
   SELECT 1
   FROM public.user_roles AS ur
   WHERE ur.user_id = p.user_id
     AND ur.role = 'admin'::public.app_role
 );

UPDATE public.public_profiles AS pp
   SET verified_tier = 'BUSINESS_PLUS',
       verified_until = NULL
 WHERE EXISTS (
   SELECT 1
   FROM public.user_roles AS ur
   WHERE ur.user_id = pp.user_id
     AND ur.role = 'admin'::public.app_role
 );