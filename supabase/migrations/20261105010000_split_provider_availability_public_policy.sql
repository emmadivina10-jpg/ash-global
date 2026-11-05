-- Keep public availability limited to live storefronts without requiring anon
-- to read provider_profiles.user_id. Authenticated owners retain the original
-- live-or-owner visibility rule.
DROP POLICY IF EXISTS "Availability readable for live providers" ON public.provider_availability;

CREATE POLICY "Public availability for live providers"
ON public.provider_availability
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.provider_profiles AS p
    WHERE p.id = provider_id
      AND p.is_live
  )
  AND safety.identity_access_allowed(auth.uid())
);

CREATE POLICY "Availability readable for live providers"
ON public.provider_availability
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.provider_profiles AS p
    WHERE p.id = provider_id
      AND (p.is_live OR p.user_id = auth.uid())
  )
  AND safety.identity_access_allowed(auth.uid())
);
