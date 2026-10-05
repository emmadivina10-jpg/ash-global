DROP POLICY IF EXISTS "Live providers are visible to signed-in users" ON public.provider_profiles;
CREATE POLICY "Live providers are visible to signed-in users" ON public.provider_profiles FOR SELECT
  USING (is_live = true OR user_id = auth.uid() OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')));