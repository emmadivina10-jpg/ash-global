-- provider_slots is SECURITY DEFINER and reads bookings to detect conflicts.
-- It is only ever called from the signed-in booking screen, so anonymous
-- callers must not be able to enumerate a provider's booked-out times.
REVOKE ALL ON FUNCTION public.provider_slots(uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_slots(uuid, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_slots(uuid, date, integer) TO service_role;