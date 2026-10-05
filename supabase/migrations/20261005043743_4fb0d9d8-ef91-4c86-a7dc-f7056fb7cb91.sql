DROP POLICY IF EXISTS "Services of visible providers are readable" ON public.provider_services;
CREATE POLICY "Services of visible providers are readable" ON public.provider_services FOR SELECT
  USING (public.is_provider_visible(provider_id) OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')));