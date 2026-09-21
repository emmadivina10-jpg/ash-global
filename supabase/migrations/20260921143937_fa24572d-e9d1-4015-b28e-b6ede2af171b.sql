REVOKE ALL ON FUNCTION public.guard_campus_application() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_campus_instructor_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campus_touch_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_campus_application() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_campus_instructor_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.campus_touch_updated_at() TO service_role;