REVOKE EXECUTE ON FUNCTION public.is_provider_visible(uuid) FROM anon;
DROP POLICY IF EXISTS "Services of visible providers are readable" ON public.provider_services;
CREATE POLICY "Services of visible providers are readable" ON public.provider_services FOR SELECT TO authenticated
  USING (public.is_provider_visible(provider_id) OR safety.is_admin());