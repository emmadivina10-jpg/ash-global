REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_report() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.screen_ugc_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_comment_not_blocked() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_user_block() FROM PUBLIC, anon, authenticated;