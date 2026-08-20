DROP POLICY IF EXISTS "Portfolio of visible providers is readable" ON public.portfolio_items;
CREATE POLICY "Portfolio of visible providers is readable"
ON public.portfolio_items FOR SELECT TO authenticated
USING (public.is_provider_visible(provider_id) OR public.is_provider_owner(provider_id) OR public.has_role(auth.uid(), 'admin'::app_role));