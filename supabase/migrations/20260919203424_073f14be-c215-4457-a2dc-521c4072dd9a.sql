-- lovable-cron-fallback-reviewed: Story media deletion requires the Storage API at a known future expiry; a five-minute callback gives a bounded maximum delay and keeps failed deletions retryable.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS app_private.story_cleanup_credentials (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE app_private.story_cleanup_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE app_private.story_cleanup_credentials TO service_role;

INSERT INTO app_private.story_cleanup_credentials (singleton, token)
VALUES (true, encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_story_cleanup_secret(_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_private.story_cleanup_credentials c
    WHERE extensions.digest(c.token, 'sha256') = extensions.digest(coalesce(_secret, ''), 'sha256')
  );
$$;
REVOKE ALL ON FUNCTION public.verify_story_cleanup_secret(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_story_cleanup_secret(text) TO anon, service_role;

CREATE OR REPLACE FUNCTION public.release_housekeeping()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rate_count integer := 0;
  event_count integer := 0;
BEGIN
  DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day';
  GET DIAGNOSTICS rate_count = ROW_COUNT;
  DELETE FROM public.security_events WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS event_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'rate_limit_rows', rate_count,
    'old_security_events', event_count
  );
END;
$$;
REVOKE ALL ON FUNCTION public.release_housekeeping() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_housekeeping() TO service_role;

CREATE OR REPLACE FUNCTION public.security_housekeeping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day';
  DELETE FROM public.security_events WHERE created_at < now() - interval '180 days';
END;
$$;
REVOKE ALL ON FUNCTION public.security_housekeeping() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_housekeeping() TO service_role;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ash-security-housekeeping';

SELECT cron.schedule(
  'ash-security-housekeeping',
  '30 4 * * 0',
  $$SELECT public.security_housekeeping();$$
);

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ash-story-expiry-cleanup';

SELECT cron.schedule(
  'ash-story-expiry-cleanup',
  '*/5 * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://project--27f7580a-d6af-45a7-9546-ba56b1916cbe-dev.lovable.app/api/public/cleanup-stories',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-story-cleanup-secret', (SELECT token FROM app_private.story_cleanup_credentials WHERE singleton = true)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    );
  $job$
);