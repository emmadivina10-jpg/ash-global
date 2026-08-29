GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.provider_profiles TO authenticated;
GRANT ALL ON TABLE public.provider_profiles TO service_role;
GRANT SELECT ON TABLE public.provider_profiles TO anon;