DROP POLICY IF EXISTS "Members read the public directory" ON public.public_profiles;
CREATE POLICY "Members read the public directory" ON public.public_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR NOT public.is_blocked_pair(auth.uid(), user_id));

DROP POLICY IF EXISTS "members can view presence" ON public.member_presence;
CREATE POLICY "Friends can view presence" ON public.member_presence FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id));

DROP POLICY IF EXISTS "Members read clean settings" ON public.clean_settings;
CREATE POLICY "Admins read clean settings" ON public.clean_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_clean_public_settings()
RETURNS TABLE(price_per_kg numeric, facility_address text, facility_hours text, facility_lat double precision, facility_lng double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.price_per_kg::numeric, s.facility_address::text, s.facility_hours::text, s.facility_lat::double precision, s.facility_lng::double precision
  FROM public.clean_settings s WHERE s.id = 1 AND auth.uid() IS NOT NULL
$$;
REVOKE EXECUTE ON FUNCTION public.get_clean_public_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_clean_public_settings() TO authenticated;