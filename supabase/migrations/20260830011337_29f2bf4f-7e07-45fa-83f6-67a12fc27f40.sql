GRANT SELECT ON TABLE public.provider_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.provider_profiles TO authenticated;
GRANT ALL ON TABLE public.provider_profiles TO service_role;

GRANT SELECT ON TABLE public.provider_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.provider_services TO authenticated;
GRANT ALL ON TABLE public.provider_services TO service_role;

GRANT EXECUTE ON FUNCTION public.slugify(text) TO authenticated, service_role;