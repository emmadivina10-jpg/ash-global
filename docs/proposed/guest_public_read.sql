-- Phase 3: guest (signed-out) read access. PROPOSED — NOT APPLIED.
-- Existing RESTRICTIVE safety/moderation policies stay in force for guests too.

-- 1. Feed posts: published + approved only (restrictive "safety visibility" also applies)
GRANT SELECT ON public.social_posts TO anon;
CREATE POLICY "guests read published posts" ON public.social_posts
  FOR SELECT TO anon
  USING (is_published AND moderation_status = 'APPROVED');

-- 2. Market listings: published only
GRANT SELECT ON public.market_posts TO anon;
CREATE POLICY "guests read published market posts" ON public.market_posts
  FOR SELECT TO anon
  USING (is_published);

-- 3. Courses / subjects: policy "Anyone can read active subjects" already exists; only the grant is missing
GRANT SELECT ON public.campus_subjects TO anon;

-- 4. Property listings: active, unexpired; phone/WhatsApp columns withheld from guests
GRANT SELECT (id, owner_kind, listing_kind, category, title, description, country, region,
  city, neighborhood, university, distance_km, approx_lat, approx_lng, price, currency,
  price_period, bedrooms, bathrooms, size_value, size_unit, land_use, amenities,
  is_furnished, available_from, status, verification_status, expires_at, created_at,
  moderation_status) ON public.property_listings TO anon;
CREATE POLICY "guests read active listings" ON public.property_listings
  FOR SELECT TO anon
  USING (status = 'ACTIVE' AND expires_at > now());

GRANT SELECT ON public.property_images TO anon;
CREATE POLICY "guests read images of active listings" ON public.property_images
  FOR SELECT TO anon
  USING (public.property_is_public(listing_id));

-- ROLLBACK
-- DROP POLICY "guests read published posts" ON public.social_posts;      REVOKE SELECT ON public.social_posts FROM anon;
-- DROP POLICY "guests read published market posts" ON public.market_posts; REVOKE SELECT ON public.market_posts FROM anon;
-- REVOKE SELECT ON public.campus_subjects FROM anon;
-- DROP POLICY "guests read active listings" ON public.property_listings; REVOKE SELECT ON public.property_listings FROM anon;
-- DROP POLICY "guests read images of active listings" ON public.property_images; REVOKE SELECT ON public.property_images FROM anon;
