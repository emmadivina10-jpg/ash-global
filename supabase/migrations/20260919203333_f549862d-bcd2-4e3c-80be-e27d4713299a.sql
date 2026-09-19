-- lovable-cron-fallback-reviewed: Story expiry is a time-based external Storage deletion; five-minute polling gives a bounded maximum delay and the worker deletes media before database rows.
CREATE OR REPLACE FUNCTION public.release_housekeeping()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rate_count integer := 0;
  event_count integer := 0;
  story_count integer := 0;
BEGIN
  DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day';
  GET DIAGNOSTICS rate_count = ROW_COUNT;
  DELETE FROM public.security_events WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS event_count = ROW_COUNT;
  DELETE FROM public.stories WHERE expires_at <= now();
  GET DIAGNOSTICS story_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'rate_limit_rows', rate_count,
    'old_security_events', event_count,
    'expired_stories', story_count
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
  DELETE FROM public.stories WHERE expires_at <= now();
END;
$$;
REVOKE ALL ON FUNCTION public.security_housekeeping() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_housekeeping() TO service_role;

CREATE OR REPLACE FUNCTION public.expired_story_cleanup_batch(_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, media_path text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.media_path
  FROM public.stories s
  WHERE s.expires_at <= now()
  ORDER BY s.expires_at ASC
  LIMIT greatest(1, least(coalesce(_limit, 100), 500));
$$;
REVOKE ALL ON FUNCTION public.expired_story_cleanup_batch(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expired_story_cleanup_batch(integer) TO service_role;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ash-security-housekeeping';

SELECT cron.schedule(
  'ash-security-housekeeping',
  '*/5 * * * *',
  $$SELECT public.security_housekeeping();$$
);