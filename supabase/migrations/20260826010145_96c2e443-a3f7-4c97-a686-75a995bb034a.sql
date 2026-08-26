-- 1. Strip Supabase's default table grants from the platform-internal tables.
REVOKE ALL ON public.rate_limit_hits FROM anon, authenticated;
GRANT ALL ON public.rate_limit_hits TO service_role;

REVOKE ALL ON public.security_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.security_events FROM authenticated;
GRANT SELECT ON public.security_events TO authenticated;  -- admin-only via RLS
GRANT ALL ON public.security_events TO service_role;

-- 2. Precise "anonymously writable" detection.
CREATE OR REPLACE FUNCTION public.security_selfcheck()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  findings jsonb := '[]'::jsonb;
  rec RECORD;
  critical_count int := 0;
  warn_count int := 0;
BEGIN
  -- (a) SECURITY DEFINER routines callable without signing in.
  FOR rec IN
    SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    findings := findings || jsonb_build_object(
      'code', 'ANON_SECURITY_DEFINER_EXECUTABLE', 'severity', 'CRITICAL',
      'object', rec.name || '(' || rec.args || ')',
      'detail', 'Privileged routine can be called without signing in.');
    critical_count := critical_count + 1;
  END LOOP;

  -- (b) Public tables with row level security switched off.
  FOR rec IN
    SELECT c.relname AS name
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  LOOP
    findings := findings || jsonb_build_object(
      'code', 'RLS_DISABLED', 'severity', 'CRITICAL', 'object', rec.name,
      'detail', 'Table has no row level security, so the API exposes every row.');
    critical_count := critical_count + 1;
  END LOOP;

  -- (c) RLS on, no policies, but still reachable by an app role.
  FOR rec IN
    SELECT c.relname AS name
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
       AND NOT EXISTS (SELECT 1 FROM pg_policy pol WHERE pol.polrelid = c.oid)
       AND (has_table_privilege('anon', c.oid, 'SELECT')
            OR has_table_privilege('authenticated', c.oid, 'SELECT'))
  LOOP
    findings := findings || jsonb_build_object(
      'code', 'RLS_NO_POLICY', 'severity', 'WARN', 'object', rec.name,
      'detail', 'Table is reachable by app roles but defines no access rules.');
    warn_count := warn_count + 1;
  END LOOP;

  -- (d) Genuinely anon-writable: the grant exists AND a policy actually lets
  --     anon write. A bare grant is Supabase's default on every new table and
  --     is neutralised by RLS, so flagging it alone would only create noise.
  FOR rec IN
    SELECT DISTINCT c.relname AS name, pol.polname AS policy
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_policy pol ON pol.polrelid = c.oid
     WHERE n.nspname = 'public' AND c.relkind = 'r'
       AND c.relrowsecurity
       AND pol.polcmd IN ('a', 'w', 'd', '*')          -- insert / update / delete / all
       AND pol.polpermissive
       AND (pol.polroles = '{0}'::oid[]                 -- PUBLIC
            OR 'anon'::regrole = ANY (pol.polroles))
       AND (has_table_privilege('anon', c.oid, 'INSERT')
            OR has_table_privilege('anon', c.oid, 'UPDATE')
            OR has_table_privilege('anon', c.oid, 'DELETE'))
  LOOP
    findings := findings || jsonb_build_object(
      'code', 'ANON_WRITABLE_TABLE', 'severity', 'CRITICAL',
      'object', rec.name || ' (policy: ' || rec.policy || ')',
      'detail', 'An access rule permits anonymous visitors to write to this table.');
    critical_count := critical_count + 1;
  END LOOP;

  INSERT INTO public.security_events (kind, severity, subject, route, detail)
  VALUES ('SELFCHECK',
          CASE WHEN critical_count > 0 THEN 'CRITICAL' WHEN warn_count > 0 THEN 'WARN' ELSE 'INFO' END,
          'system', 'security_selfcheck',
          jsonb_build_object('critical', critical_count, 'warn', warn_count, 'findings', findings));

  RETURN jsonb_build_object(
    'ok', critical_count = 0,
    'critical', critical_count,
    'warn', warn_count,
    'findings', findings,
    'checked_at', now());
END;
$$;
REVOKE ALL ON FUNCTION public.security_selfcheck() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_selfcheck() TO service_role;