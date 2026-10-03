CREATE SCHEMA IF NOT EXISTS safety;
REVOKE ALL ON SCHEMA safety FROM PUBLIC;
GRANT USAGE ON SCHEMA safety TO anon, authenticated, service_role;
ALTER FUNCTION public.ugc_visible(uuid) SET SCHEMA safety;
ALTER FUNCTION public.provider_owner(uuid) SET SCHEMA safety;