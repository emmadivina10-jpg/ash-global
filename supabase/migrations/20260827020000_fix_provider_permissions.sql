-- Fix trigger function permissions and security context
ALTER FUNCTION public.enforce_provider_live() SECURITY DEFINER;
ALTER FUNCTION public.assign_provider_slug() SECURITY DEFINER;
ALTER FUNCTION public.touch_updated_at() SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.enforce_provider_live() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_provider_slug() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.touch_updated_at() TO authenticated, service_role;

-- Ensure RLS allows the owner to read their own profile even if not live
-- (This is already mostly covered but ensuring consistency)
DROP POLICY IF EXISTS "Live providers are visible to signed-in users" ON public.provider_profiles;
CREATE POLICY "Live providers are visible to signed-in users"
  ON public.provider_profiles FOR SELECT TO authenticated
  USING (is_live = true OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
