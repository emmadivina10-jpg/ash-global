CREATE SCHEMA IF NOT EXISTS ash_internal;
REVOKE ALL ON SCHEMA ash_internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA ash_internal TO authenticated, service_role;
CREATE OR REPLACE FUNCTION ash_internal.is_blocked_pair(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  )
$$;
REVOKE ALL ON FUNCTION ash_internal.is_blocked_pair(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ash_internal.is_blocked_pair(uuid, uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.is_blocked_pair(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT ash_internal.is_blocked_pair(_a, _b) $$;
REVOKE ALL ON FUNCTION public.is_blocked_pair(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) TO authenticated, service_role;