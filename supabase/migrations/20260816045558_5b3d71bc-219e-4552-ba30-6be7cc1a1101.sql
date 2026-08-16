-- Remove direct client access to admin-only SECURITY DEFINER functions.
REVOKE ALL ON FUNCTION public.console_financials() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.console_financials() TO service_role;

REVOKE ALL ON FUNCTION public.settle_withdrawal(uuid, text, text, text) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_withdrawal(uuid, text, text, text) TO service_role;

-- Legacy, superseded by console_financials() and unused by the app.
DROP FUNCTION IF EXISTS public.platform_financials();