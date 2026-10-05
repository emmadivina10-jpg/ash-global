CREATE OR REPLACE FUNCTION safety.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;
REVOKE ALL ON FUNCTION safety.is_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION safety.is_admin() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "moderation removed hidden" ON public.property_listings;
CREATE POLICY "moderation removed hidden" ON public.property_listings AS RESTRICTIVE FOR SELECT
  USING (moderation_status <> 'REMOVED' OR owner_id = auth.uid() OR safety.is_admin());

DROP POLICY IF EXISTS "moderation removed hidden" ON public.provider_profiles;
CREATE POLICY "moderation removed hidden" ON public.provider_profiles AS RESTRICTIVE FOR SELECT
  USING (moderation_status <> 'REMOVED' OR user_id = auth.uid() OR safety.is_admin());

DROP POLICY IF EXISTS "Live providers are visible to signed-in users" ON public.provider_profiles;
CREATE POLICY "Live providers are visible to signed-in users" ON public.provider_profiles FOR SELECT
  USING (is_live = true OR user_id = auth.uid() OR safety.is_admin());

DROP POLICY IF EXISTS "Services of visible providers are readable" ON public.provider_services;
CREATE POLICY "Services of visible providers are readable" ON public.provider_services FOR SELECT
  USING (public.is_provider_visible(provider_id) OR safety.is_admin());

DROP POLICY IF EXISTS "safety visibility" ON public.social_posts;
CREATE POLICY "safety visibility" ON public.social_posts AS RESTRICTIVE FOR SELECT TO public
USING (
  author_id = auth.uid() OR safety.is_admin() OR (
    moderation_status = 'APPROVED'
    AND NOT public.is_author_restricted(author_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), author_id))
  )
);

DROP POLICY IF EXISTS "safety visibility" ON public.spotlight_posts;
CREATE POLICY "safety visibility" ON public.spotlight_posts AS RESTRICTIVE FOR SELECT TO public
USING (
  author_id = auth.uid() OR safety.is_admin() OR (
    moderation_status = 'APPROVED'
    AND NOT public.is_author_restricted(author_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), author_id))
  )
);

DROP POLICY IF EXISTS "safety visibility" ON public.post_comments;
CREATE POLICY "safety visibility" ON public.post_comments AS RESTRICTIVE FOR SELECT TO public
USING (
  author_id = auth.uid() OR safety.is_admin() OR (
    moderation_status = 'APPROVED'
    AND NOT public.is_author_restricted(author_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), author_id))
  )
);