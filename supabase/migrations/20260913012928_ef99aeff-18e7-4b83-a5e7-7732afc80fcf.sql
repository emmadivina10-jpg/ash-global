
DROP FUNCTION IF EXISTS public.request_booking(uuid, uuid, timestamp with time zone, text, text);

REVOKE EXECUTE ON FUNCTION public.request_booking(uuid, uuid, timestamp with time zone, text, text, text, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking(uuid, uuid, timestamp with time zone, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_booking(uuid, uuid, timestamp with time zone, text, text, text, integer) TO service_role;
