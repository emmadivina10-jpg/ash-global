DROP VIEW IF EXISTS public.promotions_public;

-- Anyone may read live adverts, but payment identifiers are column-restricted
CREATE POLICY promotions_public_read ON public.promotions
  FOR SELECT TO anon, authenticated
  USING (status = 'ACTIVE' AND ends_at > now());

REVOKE SELECT ON public.promotions FROM anon, authenticated;
GRANT SELECT (id, owner_id, target_type, target_id, headline, plan, amount, currency,
              city, category, status, starts_at, ends_at, impressions, clicks,
              created_at, updated_at)
  ON public.promotions TO anon, authenticated;