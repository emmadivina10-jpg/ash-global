-- PROPOSED — NOT APPLIED. Awaiting approval ("approve feature flags").
-- Phase 1: feature-flag mechanism required by the Constitution (rule 8).
-- Additive only: one new table, RLS, grants. No existing object touched.
--
-- Design:
--  * Anyone (including signed-out guests) may READ flags — the nav shell and
--    guest pages need them before login.
--  * Nobody can write flags through the Data API (no INSERT/UPDATE/DELETE
--    policies); flags change only via service role (console/server) or SQL.
--  * Flag rows themselves (new_nav, discover, buy_sell, kitchen, services_hub,
--    my_account, courses, uploads — all disabled) are inserted afterwards
--    through the database query tools, not in this migration.

CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_flags TO anon;
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read feature flags"
  ON public.feature_flags
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Rollback (manual, only if ever needed):
--   DROP TABLE public.feature_flags;
