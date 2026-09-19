SELECT net.http_post(
  url := 'https://project--27f7580a-d6af-45a7-9546-ba56b1916cbe-dev.lovable.app/api/public/cleanup-stories',
  headers := jsonb_build_object(
    'content-type', 'application/json',
    'x-story-cleanup-secret', (SELECT token FROM app_private.story_cleanup_credentials WHERE singleton = true)
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 20000
);