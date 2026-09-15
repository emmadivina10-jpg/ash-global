CREATE TABLE public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_likes_read" ON public.comment_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "comment_likes_insert_own" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "comment_likes_delete_own" ON public.comment_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_comment_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSE
    UPDATE public.post_comments SET like_count = greatest(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_comment_like_count() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_comment_like_count() TO authenticated, service_role;

CREATE TRIGGER trg_sync_comment_like_count
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_comment_like_count();

CREATE OR REPLACE FUNCTION public.notify_story_friends()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE actor_name text; friend record;
BEGIN
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.author_id;
  FOR friend IN
    SELECT CASE WHEN requester_id = NEW.author_id THEN addressee_id ELSE requester_id END AS user_id
    FROM public.friendships
    WHERE status = 'ACCEPTED' AND (requester_id = NEW.author_id OR addressee_id = NEW.author_id)
  LOOP
    PERFORM public.notify_actor(friend.user_id, NEW.author_id, 'STORY',
      coalesce(nullif(actor_name,''),'An ASH member') || ' added a new Spotlight', '',
      jsonb_build_object('story_id', NEW.id));
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_story_friends() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_story_friends() TO authenticated, service_role;

CREATE TRIGGER trg_notify_story_friends
AFTER INSERT ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.notify_story_friends();