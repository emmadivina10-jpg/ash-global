REVOKE ALL ON FUNCTION public.campus_commission_rate(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campus_commission_rate(uuid) TO service_role;