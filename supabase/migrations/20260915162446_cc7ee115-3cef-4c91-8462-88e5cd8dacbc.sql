DROP POLICY "Active payment links are public" ON public.payment_links;

CREATE POLICY "Anyone can view active payment links"
ON public.payment_links
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Members view active links and their own"
ON public.payment_links
FOR SELECT
TO authenticated
USING (is_active = true OR public.is_provider_owner(provider_id));