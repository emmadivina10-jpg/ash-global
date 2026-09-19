REVOKE ALL ON FUNCTION public.verify_story_cleanup_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_story_cleanup_secret(text) TO service_role;