CREATE OR REPLACE FUNCTION public.ugc_visible(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner IS NULL
    OR _owner = auth.uid()
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
    OR (
      NOT public.is_author_restricted(_owner)
      AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), _owner))
    )
$$;
REVOKE EXECUTE ON FUNCTION public.ugc_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ugc_visible(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.provider_owner(_provider_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.provider_profiles WHERE id = _provider_id
$$;
REVOKE EXECUTE ON FUNCTION public.provider_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_owner(uuid) TO anon, authenticated, service_role;

CREATE POLICY "safety visibility" ON public.market_posts AS RESTRICTIVE FOR SELECT USING (public.ugc_visible(author_id));
CREATE POLICY "safety visibility" ON public.provider_profiles AS RESTRICTIVE FOR SELECT USING (public.ugc_visible(user_id));
CREATE POLICY "safety visibility" ON public.provider_services AS RESTRICTIVE FOR SELECT USING (public.ugc_visible(public.provider_owner(provider_id)));
CREATE POLICY "safety visibility" ON public.property_listings AS RESTRICTIVE FOR SELECT USING (public.ugc_visible(owner_id));
CREATE POLICY "safety visibility" ON public.events AS RESTRICTIVE FOR SELECT USING (public.ugc_visible(organizer_id));
CREATE POLICY "safety visibility" ON public.campus_instructor_profiles AS RESTRICTIVE FOR SELECT USING (public.ugc_visible(user_id));