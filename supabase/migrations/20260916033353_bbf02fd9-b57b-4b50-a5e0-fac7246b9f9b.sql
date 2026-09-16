REVOKE EXECUTE ON FUNCTION public.is_verified(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_verified(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.enforce_not_moderation_banned() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_not_moderation_banned() TO service_role;
REVOKE ALL ON FUNCTION public.security_housekeeping() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_housekeeping() TO service_role;