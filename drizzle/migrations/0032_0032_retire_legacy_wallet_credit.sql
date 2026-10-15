-- PROPOSED production migration 0032 (v3, for review) — NOT APPLIED.
-- Apply ONLY after 0031 is live, the new app is published, and all release checks pass.
-- Retires the unaudited legacy credit path. The function and all historical data are kept.

-- Read-only check BEFORE (expected today: postgres=X/postgres,service_role=X/postgres):
--   SELECT array_to_string(proacl::text[], ',') FROM pg_proc
--    WHERE oid = 'public.admin_credit_wallet(uuid,numeric,text)'::regprocedure;

REVOKE EXECUTE ON FUNCTION public.admin_credit_wallet(uuid, numeric, text) FROM PUBLIC, anon, authenticated, service_role;
-- Owner (postgres) keeps EXECUTE implicitly as function owner; no grant is added for any app role.

COMMENT ON FUNCTION public.admin_credit_wallet(uuid, numeric, text) IS
  'DEPRECATED AND RETIRED: no app role may execute. Use admin_credit_wallet_audited.';

-- Read-only check AFTER (expected: postgres=X/postgres only):
--   SELECT r.rolname, has_function_privilege(r.rolname, 'public.admin_credit_wallet(uuid,numeric,text)', 'EXECUTE')
--     FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role','postgres');
