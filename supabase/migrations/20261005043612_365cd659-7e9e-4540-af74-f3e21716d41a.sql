REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;

DROP POLICY IF EXISTS "moderation removed hidden" ON public.property_listings;
CREATE POLICY "moderation removed hidden" ON public.property_listings AS RESTRICTIVE FOR SELECT
  USING (moderation_status <> 'REMOVED' OR owner_id = auth.uid() OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "moderation removed hidden" ON public.provider_profiles;
CREATE POLICY "moderation removed hidden" ON public.provider_profiles AS RESTRICTIVE FOR SELECT
  USING (moderation_status <> 'REMOVED' OR user_id = auth.uid() OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "safety visibility" ON public.social_posts;
CREATE POLICY "safety visibility" ON public.social_posts AS RESTRICTIVE FOR SELECT TO public
USING (
  author_id = auth.uid() OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')) OR (
    moderation_status = 'APPROVED'
    AND NOT public.is_author_restricted(author_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), author_id))
  )
);

DROP POLICY IF EXISTS "safety visibility" ON public.spotlight_posts;
CREATE POLICY "safety visibility" ON public.spotlight_posts AS RESTRICTIVE FOR SELECT TO public
USING (
  author_id = auth.uid() OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')) OR (
    moderation_status = 'APPROVED'
    AND NOT public.is_author_restricted(author_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), author_id))
  )
);

DROP POLICY IF EXISTS "safety visibility" ON public.post_comments;
CREATE POLICY "safety visibility" ON public.post_comments AS RESTRICTIVE FOR SELECT TO public
USING (
  author_id = auth.uid() OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')) OR (
    moderation_status = 'APPROVED'
    AND NOT public.is_author_restricted(author_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), author_id))
  )
);