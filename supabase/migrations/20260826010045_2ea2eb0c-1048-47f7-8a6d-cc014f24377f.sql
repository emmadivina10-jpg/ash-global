CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Housekeeping so the security tables never grow without bound.
CREATE OR REPLACE FUNCTION public.security_housekeeping()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day';
  DELETE FROM public.security_events WHERE created_at < now() - interval '180 days';
$$;
REVOKE ALL ON FUNCTION public.security_housekeeping() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_housekeeping() TO service_role;

-- Daily deep re-scan, plus a 6-hourly check so a regression is caught quickly.
SELECT cron.unschedule(jobid) FROM cron.job
 WHERE jobname IN ('ash-security-selfcheck-daily', 'ash-security-selfcheck-6h', 'ash-security-housekeeping');

SELECT cron.schedule('ash-security-selfcheck-daily', '15 3 * * *', $$SELECT public.security_selfcheck();$$);
SELECT cron.schedule('ash-security-selfcheck-6h', '5 */6 * * *', $$SELECT public.security_selfcheck();$$);
SELECT cron.schedule('ash-security-housekeeping', '30 4 * * 0', $$SELECT public.security_housekeeping();$$);