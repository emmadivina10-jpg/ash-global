/**
 * Storefront columns visitors without an account may read. Mirrors the column
 * grant in 20261104214000_restrict_anon_provider_profile_columns.sql.
 */
export const PUBLIC_PROVIDER_COLUMNS =
  "id, business_name, bio, city, categories, avatar_url, cover_url, is_live, rating_avg, rating_count, created_at, updated_at, is_verified, accepting_bookings, service_areas, completed_bookings, slug, tagline, country";
