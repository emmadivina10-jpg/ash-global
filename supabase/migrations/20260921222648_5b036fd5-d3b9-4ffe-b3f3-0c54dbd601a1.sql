REVOKE ALL ON FUNCTION public.touch_support_ticket_on_message() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_support_ticket_on_message() FROM anon;
REVOKE ALL ON FUNCTION public.touch_support_ticket_on_message() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.touch_support_ticket_on_message() TO service_role;