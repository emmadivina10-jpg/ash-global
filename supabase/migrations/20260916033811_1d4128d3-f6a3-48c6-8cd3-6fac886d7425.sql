CREATE OR REPLACE FUNCTION public.protect_post_comment_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.author_id IS DISTINCT FROM OLD.author_id
     OR NEW.post_id IS DISTINCT FROM OLD.post_id
     OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
     OR NEW.like_count IS DISTINCT FROM OLD.like_count
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
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
DROP TRIGGER IF EXISTS protect_post_comment_fields ON public.post_comments;
CREATE TRIGGER protect_post_comment_fields
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.protect_post_comment_fields();
DROP POLICY IF EXISTS "comments update own or post owner" ON public.post_comments;
CREATE POLICY "comments update own or post owner"
  ON public.post_comments FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  )
  WITH CHECK (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.protect_friendship_parties()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'FRIENDSHIP_PARTIES_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_friendship_parties() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_friendship_parties() TO service_role;
DROP TRIGGER IF EXISTS protect_friendship_parties ON public.friendships;
CREATE TRIGGER protect_friendship_parties
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.protect_friendship_parties();