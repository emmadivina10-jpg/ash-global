CREATE OR REPLACE FUNCTION public.guard_verified_group_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.chat_groups g
    WHERE lower(btrim(g.name)) = lower(btrim(NEW.name))
      AND g.owner_id <> NEW.owner_id
      AND g.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND public.is_verified(g.owner_id)
  ) THEN
    RAISE EXCEPTION 'GROUP_NAME_PROTECTED_BY_VERIFIED_ACCOUNT';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_verified_group_name() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS guard_verified_group_name_trg ON public.chat_groups;
CREATE TRIGGER guard_verified_group_name_trg
BEFORE INSERT OR UPDATE OF name ON public.chat_groups
FOR EACH ROW EXECUTE FUNCTION public.guard_verified_group_name();