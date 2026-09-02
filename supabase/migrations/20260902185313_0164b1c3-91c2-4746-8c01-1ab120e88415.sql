-- 1. Property routines are only used by signed-in flows: remove anonymous execute
REVOKE EXECUTE ON FUNCTION public.expire_property_listings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_property(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.property_is_public(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_property_view(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_property_viewing(uuid, timestamptz, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.respond_property_viewing(uuid, text, text, timestamptz) FROM anon;

-- 2. Property listings + images: signed-in visitors only (removes anon contact-detail exposure)
DROP POLICY IF EXISTS "public reads active listings" ON public.property_listings;
CREATE POLICY "signed-in reads active listings" ON public.property_listings
  FOR SELECT TO authenticated
  USING (status = 'ACTIVE' AND expires_at > now());

DROP POLICY IF EXISTS "public reads images of active listings" ON public.property_images;
CREATE POLICY "signed-in reads images of active listings" ON public.property_images
  FOR SELECT TO authenticated
  USING (public.property_is_public(listing_id));

REVOKE SELECT ON public.property_listings FROM anon;
REVOKE SELECT ON public.property_images FROM anon;

-- 3. Freelance projects: only open projects, own projects, awarded work or projects you bid on
DROP POLICY IF EXISTS projects_read ON public.freelance_projects;
CREATE POLICY projects_read ON public.freelance_projects
  FOR SELECT TO authenticated
  USING (
    status = 'OPEN'
    OR client_id = auth.uid()
    OR awarded_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.freelance_proposals p
      WHERE p.project_id = freelance_projects.id AND p.freelancer_id = auth.uid()
    )
  );

-- 4. Promotions: payment identifiers restricted to the owner; everyone else reads a safe view
DROP POLICY IF EXISTS promotions_public_read ON public.promotions;
CREATE POLICY promotions_owner_read ON public.promotions
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.promotions FROM anon;

CREATE OR REPLACE VIEW public.promotions_public
WITH (security_invoker = off) AS
  SELECT id, headline, target_type, target_id, city, category, plan,
         status, starts_at, ends_at, impressions, clicks, created_at
  FROM public.promotions
  WHERE status = 'ACTIVE' AND ends_at > now();

GRANT SELECT ON public.promotions_public TO anon, authenticated;