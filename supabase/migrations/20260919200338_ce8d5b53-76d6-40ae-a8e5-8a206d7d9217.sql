CREATE OR REPLACE VIEW public.profiles_public AS
  SELECT user_id, full_name, username, avatar_url, verified_tier, verified_until,
         birthday, city, account_status, created_at
  FROM public.profiles;

ALTER VIEW public.profiles_public SET (security_invoker = off);
REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO service_role;

CREATE OR REPLACE FUNCTION public.can_view_avatar(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND (storage.foldername(_object_name))[1] ~ '^[0-9a-fA-F-]{36}$';
$function$;