-- SPOTLIGHT POSTS -----------------------------------------------------------
CREATE TABLE public.spotlight_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.provider_profiles(id) ON DELETE SET NULL,
  caption text NOT NULL DEFAULT '',
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotlight_posts TO authenticated;
GRANT ALL ON public.spotlight_posts TO service_role;

ALTER TABLE public.spotlight_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spotlight_read_published" ON public.spotlight_posts
  FOR SELECT TO authenticated USING (is_published OR author_id = auth.uid());
CREATE POLICY "spotlight_insert_own" ON public.spotlight_posts
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "spotlight_update_own" ON public.spotlight_posts
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "spotlight_delete_own" ON public.spotlight_posts
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX spotlight_posts_created_idx ON public.spotlight_posts (created_at DESC);
CREATE INDEX spotlight_posts_author_idx ON public.spotlight_posts (author_id);

CREATE TRIGGER spotlight_posts_touch
  BEFORE UPDATE ON public.spotlight_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- FORUM POSTS ----------------------------------------------------------------
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space text NOT NULL DEFAULT 'COMMUNITY',
  body text NOT NULL,
  image_path text,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_posts TO service_role;

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_posts_read" ON public.forum_posts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_posts_insert_own" ON public.forum_posts
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "forum_posts_update_own" ON public.forum_posts
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "forum_posts_delete_own" ON public.forum_posts
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX forum_posts_created_idx ON public.forum_posts (created_at DESC);
CREATE INDEX forum_posts_space_idx ON public.forum_posts (space, created_at DESC);

CREATE TRIGGER forum_posts_touch
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- FORUM COMMENTS -------------------------------------------------------------
CREATE TABLE public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_comments TO authenticated;
GRANT ALL ON public.forum_comments TO service_role;

ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_comments_read" ON public.forum_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_comments_insert_own" ON public.forum_comments
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "forum_comments_update_own" ON public.forum_comments
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "forum_comments_delete_own" ON public.forum_comments
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX forum_comments_post_idx ON public.forum_comments (post_id, created_at);

CREATE TRIGGER forum_comments_touch
  BEFORE UPDATE ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- FORUM LIKES ----------------------------------------------------------------
CREATE TABLE public.forum_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.forum_likes TO authenticated;
GRANT ALL ON public.forum_likes TO service_role;

ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_likes_read" ON public.forum_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_likes_insert_own" ON public.forum_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "forum_likes_delete_own" ON public.forum_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- COUNT MAINTENANCE ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_forum_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER forum_comments_count
  AFTER INSERT OR DELETE ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_forum_comment_count();

CREATE OR REPLACE FUNCTION public.sync_forum_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER forum_likes_count
  AFTER INSERT OR DELETE ON public.forum_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_forum_like_count();