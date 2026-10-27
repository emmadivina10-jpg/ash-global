ALTER TABLE public.spotlight_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.spotlight_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS spotlight_comments_parent_idx ON public.spotlight_comments(parent_id);

-- Spotlight owners may remove comments on their own Spotlight.
CREATE POLICY "Spotlight owner deletes comments" ON public.spotlight_comments FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.spotlight_posts s WHERE s.id = spotlight_comments.spotlight_id AND s.author_id = auth.uid()));

CREATE TABLE public.spotlight_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.spotlight_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.spotlight_comment_likes TO authenticated;
GRANT ALL ON public.spotlight_comment_likes TO service_role;
ALTER TABLE public.spotlight_comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read comment likes" ON public.spotlight_comment_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Like as self" ON public.spotlight_comment_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND safety.identity_access_allowed(auth.uid()));
CREATE POLICY "Unlike own" ON public.spotlight_comment_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_spotlight_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner uuid; parent_author uuid; actor_name text;
BEGIN
  SELECT author_id INTO owner FROM public.spotlight_posts WHERE id = NEW.spotlight_id;
  SELECT coalesce(nullif(full_name,''),'An ASH member') INTO actor_name FROM public.profiles WHERE user_id = NEW.author_id;
  actor_name := coalesce(actor_name,'An ASH member');
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_author FROM public.spotlight_comments WHERE id = NEW.parent_id;
    PERFORM public.notify_actor(parent_author, NEW.author_id, 'SPOTLIGHT_COMMENT', actor_name || ' replied to your comment', left(NEW.body,140), jsonb_build_object('spotlight_id',NEW.spotlight_id,'comment_id',NEW.id));
  END IF;
  IF owner IS DISTINCT FROM parent_author THEN
    PERFORM public.notify_actor(owner, NEW.author_id, 'SPOTLIGHT_COMMENT', actor_name || ' commented on your Spotlight', left(NEW.body,140), jsonb_build_object('spotlight_id',NEW.spotlight_id,'comment_id',NEW.id));
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_spotlight_comment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_spotlight_comment AFTER INSERT ON public.spotlight_comments FOR EACH ROW EXECUTE FUNCTION public.notify_spotlight_comment();

CREATE OR REPLACE FUNCTION public.notify_spotlight_comment_like() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; actor_name text;
BEGIN
  SELECT author_id, spotlight_id INTO c FROM public.spotlight_comments WHERE id = NEW.comment_id;
  SELECT coalesce(nullif(full_name,''),'An ASH member') INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM public.notify_actor(c.author_id, NEW.user_id, 'SPOTLIGHT_COMMENT', coalesce(actor_name,'An ASH member') || ' liked your comment', '', jsonb_build_object('spotlight_id',c.spotlight_id,'comment_id',NEW.comment_id));
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_spotlight_comment_like() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_spotlight_comment_like AFTER INSERT ON public.spotlight_comment_likes FOR EACH ROW EXECUTE FUNCTION public.notify_spotlight_comment_like();

CREATE TABLE public.profile_views (
  viewer_id uuid NOT NULL,
  viewed_id uuid NOT NULL,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (viewer_id, viewed_id)
);
GRANT ALL ON public.profile_views TO service_role;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Records a profile view and notifies the owner at most once per viewer per day.
CREATE OR REPLACE FUNCTION public.record_profile_view(_viewed_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); prev timestamptz; actor_name text;
BEGIN
  IF uid IS NULL OR _viewed_id IS NULL OR uid = _viewed_id THEN RETURN; END IF;
  IF public.is_blocked_pair(uid, _viewed_id) THEN RETURN; END IF;
  SELECT last_viewed_at INTO prev FROM public.profile_views WHERE viewer_id = uid AND viewed_id = _viewed_id;
  INSERT INTO public.profile_views(viewer_id, viewed_id, last_viewed_at) VALUES (uid, _viewed_id, now())
  ON CONFLICT (viewer_id, viewed_id) DO UPDATE SET last_viewed_at = now();
  IF prev IS NULL OR prev < now() - interval '24 hours' THEN
    SELECT coalesce(nullif(full_name,''),'An ASH member') INTO actor_name FROM public.profiles WHERE user_id = uid;
    PERFORM public.notify_actor(_viewed_id, uid, 'PROFILE_VIEW', coalesce(actor_name,'An ASH member') || ' viewed your profile', '', jsonb_build_object('viewer_id', uid));
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_profile_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_profile_view(uuid) TO authenticated;