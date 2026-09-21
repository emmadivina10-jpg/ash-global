CREATE OR REPLACE FUNCTION public.expired_spotlight_video_batch(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, media jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.media
  FROM public.spotlight_posts p
  WHERE p.created_at <= now() - interval '30 days'
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.media) AS m
      WHERE m->>'type' = 'video'
    )
  ORDER BY p.created_at ASC
  LIMIT greatest(1, least(coalesce(_limit, 50), 200));
$$;
REVOKE ALL ON FUNCTION public.expired_spotlight_video_batch(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expired_spotlight_video_batch(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_spotlight_video_cleanup(_post_id uuid, _removed_paths text[])
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining jsonb;
BEGIN
  IF _removed_paths IS NULL OR array_length(_removed_paths, 1) IS NULL THEN
    RETURN 'skipped';
  END IF;

  SELECT coalesce(jsonb_agg(m), '[]'::jsonb) INTO remaining
  FROM public.spotlight_posts p,
       LATERAL jsonb_array_elements(p.media) AS m
  WHERE p.id = _post_id
    AND NOT ((m->>'path') = ANY (_removed_paths));

  IF remaining IS NULL OR jsonb_array_length(remaining) = 0 THEN
    DELETE FROM public.spotlight_posts WHERE id = _post_id;
    RETURN 'deleted';
  END IF;

  UPDATE public.spotlight_posts SET media = remaining WHERE id = _post_id;
  RETURN 'trimmed';
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_spotlight_video_cleanup(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_spotlight_video_cleanup(uuid, text[]) TO service_role;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ash-spotlight-video-expiry';

SELECT cron.schedule(
  'ash-spotlight-video-expiry',
  '17 * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://project--27f7580a-d6af-45a7-9546-ba56b1916cbe-dev.lovable.app/api/public/cleanup-spotlight-videos',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-story-cleanup-secret', (SELECT token FROM app_private.story_cleanup_credentials WHERE singleton = true)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    );
  $job$
);