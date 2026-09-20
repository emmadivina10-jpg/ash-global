REVOKE ALL ON FUNCTION public.enforce_admin_verified_badge() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_verified_badge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_admin_verified_badge() TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_admin_verified_badge() TO service_role;