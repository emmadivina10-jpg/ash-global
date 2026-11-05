-- Anonymous visitors may read only the storefront columns that public Shop
-- listings render. Row access is unchanged: the existing "Public can view live
-- storefronts" policy still limits anon to is_live = true rows.
--
-- Withheld from anon: user_id, phone, whatsapp, subscription_expires_at,
-- billing_mode, verification_status, verification_requested_at, verified_at,
-- slot_minutes, booking_lead_hours and moderation_status. Signed-in members keep
-- their existing table-level privileges.
--
-- Rollback: GRANT SELECT ON public.provider_profiles TO anon;

REVOKE SELECT ON public.provider_profiles FROM anon;

GRANT SELECT (
  id,
  business_name,
  bio,
  city,
  categories,
  avatar_url,
  cover_url,
  is_live,
  rating_avg,
  rating_count,
  created_at,
  updated_at,
  is_verified,
  accepting_bookings,
  service_areas,
  completed_bookings,
  slug,
  tagline,
  country
) ON public.provider_profiles TO anon;

-- Guests browsing Spotlight need to match a public post author to the vendor
-- storefront without reading user_id. The caller must already know the author
-- ids (they come from public posts), so owner ids are echoed back only for ids
-- the caller supplied and are NULL for rows matched by provider id.
CREATE OR REPLACE FUNCTION public.public_provider_identities(
  _user_ids uuid[] DEFAULT '{}',
  _provider_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  business_name text,
  slug text,
  city text,
  avatar_url text,
  is_verified boolean,
  categories text[],
  rating_avg numeric,
  rating_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    CASE WHEN p.user_id = ANY (_user_ids) THEN p.user_id ELSE NULL END,
    p.business_name,
    p.slug,
    p.city,
    p.avatar_url,
    p.is_verified,
    p.categories::text[],
    p.rating_avg,
    p.rating_count
  FROM public.provider_profiles AS p
  WHERE p.is_live
    AND p.moderation_status <> 'REMOVED'
    AND safety.ugc_visible(p.user_id)
    AND (
      p.user_id = ANY (coalesce(_user_ids[1:100], '{}'::uuid[]))
      OR p.id = ANY (coalesce(_provider_ids[1:100], '{}'::uuid[]))
    );
$$;

REVOKE ALL ON FUNCTION public.public_provider_identities(uuid[], uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_provider_identities(uuid[], uuid[]) TO anon, authenticated;
