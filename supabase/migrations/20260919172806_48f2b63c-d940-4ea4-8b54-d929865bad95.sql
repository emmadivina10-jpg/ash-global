CREATE TABLE public.member_presence (
  user_id uuid PRIMARY KEY,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.member_presence TO authenticated;
GRANT ALL ON public.member_presence TO service_role;

ALTER TABLE public.member_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view presence"
  ON public.member_presence FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "members can create own presence"
  ON public.member_presence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members can update own presence"
  ON public.member_presence FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX member_presence_recent_idx ON public.member_presence(last_active_at DESC);

CREATE OR REPLACE FUNCTION public.touch_member_presence()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO public.member_presence (user_id, last_active_at, updated_at)
  VALUES (auth.uid(), now(), now())
  ON CONFLICT (user_id) DO UPDATE
  SET last_active_at = EXCLUDED.last_active_at,
      updated_at = EXCLUDED.updated_at
  WHERE public.member_presence.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.touch_member_presence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_member_presence() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_post_comment_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.author_id IS DISTINCT FROM OLD.author_id
     OR NEW.post_id IS DISTINCT FROM OLD.post_id
     OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'COMMENT_PROTECTED_FIELDS';
  END IF;

  IF NEW.like_count IS DISTINCT FROM OLD.like_count
     AND pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'COMMENT_PROTECTED_FIELDS';
  END IF;

  IF auth.uid() <> OLD.author_id AND NEW.body IS DISTINCT FROM OLD.body THEN
    RAISE EXCEPTION 'ONLY_AUTHOR_EDITS_COMMENT';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_post_comment_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_post_comment_fields() TO service_role;