ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
UPDATE public.profiles
SET username = lower(regexp_replace(coalesce(nullif(full_name,''),'member'), '[^[:alnum:]_]+', '', 'g')) || '_' || left(replace(user_id::text,'-',''), 6)
WHERE username IS NULL;
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique ON public.profiles(lower(username));
CREATE INDEX IF NOT EXISTS profiles_username_prefix_idx ON public.profiles(lower(username) text_pattern_ops);

ALTER TABLE public.post_likes
  ADD COLUMN IF NOT EXISTS reaction_type text NOT NULL DEFAULT 'like',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.comment_likes
  ADD COLUMN IF NOT EXISTS reaction_type text NOT NULL DEFAULT 'like',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_reaction_type_check;
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_reaction_type_check CHECK (reaction_type IN ('love','like','haha','wow','sad','angry'));
ALTER TABLE public.comment_likes DROP CONSTRAINT IF EXISTS comment_likes_reaction_type_check;
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_reaction_type_check CHECK (reaction_type IN ('love','like','haha','wow','sad','angry'));
CREATE INDEX IF NOT EXISTS post_likes_post_reaction_idx ON public.post_likes(post_id, reaction_type);
CREATE INDEX IF NOT EXISTS comment_likes_comment_reaction_idx ON public.comment_likes(comment_id, reaction_type);

CREATE TABLE public.hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (normalized_name ~ '^[[:alnum:]_]{1,64}$')
);
GRANT SELECT ON public.hashtags TO authenticated;
GRANT ALL ON public.hashtags TO service_role;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY hashtags_read ON public.hashtags FOR SELECT TO authenticated USING (true);
CREATE INDEX hashtags_usage_idx ON public.hashtags(usage_count DESC, updated_at DESC);

CREATE TABLE public.post_hashtags (
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, hashtag_id)
);
GRANT SELECT ON public.post_hashtags TO authenticated;
GRANT ALL ON public.post_hashtags TO service_role;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_hashtags_read ON public.post_hashtags FOR SELECT TO authenticated USING (true);
CREATE INDEX post_hashtags_tag_recent_idx ON public.post_hashtags(hashtag_id, created_at DESC, post_id);

CREATE TABLE public.spotlight_hashtags (
  spotlight_id uuid NOT NULL REFERENCES public.spotlight_posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spotlight_id, hashtag_id)
);
GRANT SELECT ON public.spotlight_hashtags TO authenticated;
GRANT ALL ON public.spotlight_hashtags TO service_role;
ALTER TABLE public.spotlight_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY spotlight_hashtags_read ON public.spotlight_hashtags FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.spotlight_posts s WHERE s.id = spotlight_id AND (s.is_published OR s.author_id = auth.uid()))
);
CREATE INDEX spotlight_hashtags_tag_recent_idx ON public.spotlight_hashtags(hashtag_id, created_at DESC, spotlight_id);

CREATE TABLE public.tag_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  who_can_tag text NOT NULL DEFAULT 'everyone' CHECK (who_can_tag IN ('everyone','friends','no_one')),
  review_tags boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_preferences TO authenticated;
GRANT ALL ON public.tag_preferences TO service_role;
ALTER TABLE public.tag_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY tag_preferences_read_own ON public.tag_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY tag_preferences_insert_own ON public.tag_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY tag_preferences_update_own ON public.tag_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY tag_preferences_delete_own ON public.tag_preferences FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.content_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('post','comment','spotlight')),
  content_id uuid NOT NULL,
  mentioned_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id, mentioned_user_id)
);
GRANT SELECT ON public.content_mentions TO authenticated;
GRANT ALL ON public.content_mentions TO service_role;
ALTER TABLE public.content_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_mentions_read ON public.content_mentions FOR SELECT TO authenticated USING (
  actor_id = auth.uid() OR mentioned_user_id = auth.uid()
  OR (content_type = 'post' AND EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = content_id))
  OR (content_type = 'comment' AND EXISTS (SELECT 1 FROM public.post_comments c WHERE c.id = content_id AND NOT c.is_hidden))
  OR (content_type = 'spotlight' AND EXISTS (SELECT 1 FROM public.spotlight_posts s WHERE s.id = content_id AND s.is_published))
);
CREATE INDEX content_mentions_user_recent_idx ON public.content_mentions(mentioned_user_id, created_at DESC);
CREATE INDEX content_mentions_content_idx ON public.content_mentions(content_type, content_id);

CREATE TABLE public.post_photo_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  image_index smallint NOT NULL CHECK (image_index BETWEEN 0 AND 3),
  tagged_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  tagged_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  x numeric(5,4) NOT NULL CHECK (x BETWEEN 0 AND 1),
  y numeric(5,4) NOT NULL CHECK (y BETWEEN 0 AND 1),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, image_index, tagged_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_photo_tags TO authenticated;
GRANT ALL ON public.post_photo_tags TO service_role;
ALTER TABLE public.post_photo_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_photo_tags_read ON public.post_photo_tags FOR SELECT TO authenticated USING (
  tagged_by = auth.uid() OR tagged_user_id = auth.uid() OR status = 'approved'
);
CREATE POLICY post_photo_tags_insert_author ON public.post_photo_tags FOR INSERT TO authenticated WITH CHECK (
  tagged_by = auth.uid() AND EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
);
CREATE POLICY post_photo_tags_update_target ON public.post_photo_tags FOR UPDATE TO authenticated USING (tagged_user_id = auth.uid()) WITH CHECK (tagged_user_id = auth.uid());
CREATE POLICY post_photo_tags_delete_participant ON public.post_photo_tags FOR DELETE TO authenticated USING (tagged_by = auth.uid() OR tagged_user_id = auth.uid());
CREATE INDEX post_photo_tags_profile_idx ON public.post_photo_tags(tagged_user_id, status, created_at DESC);

CREATE TABLE public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('love','like','haha','wow','sad','angry')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_reactions TO authenticated;
GRANT ALL ON public.story_reactions TO service_role;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY story_reactions_read_participants ON public.story_reactions FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.author_id = auth.uid())
);
CREATE POLICY story_reactions_insert_own ON public.story_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY story_reactions_update_own ON public.story_reactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY story_reactions_delete_own ON public.story_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX story_reactions_story_idx ON public.story_reactions(story_id, reaction_type);

CREATE TABLE public.story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 600),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.story_replies TO authenticated;
GRANT ALL ON public.story_replies TO service_role;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY story_replies_read_participants ON public.story_replies FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.author_id = auth.uid())
);
CREATE POLICY story_replies_insert_own ON public.story_replies FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY story_replies_delete_own ON public.story_replies FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX story_replies_story_recent_idx ON public.story_replies(story_id, created_at DESC);

CREATE TABLE public.spotlight_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotlight_id uuid NOT NULL REFERENCES public.spotlight_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('love','like','haha','wow','sad','angry')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spotlight_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotlight_reactions TO authenticated;
GRANT ALL ON public.spotlight_reactions TO service_role;
ALTER TABLE public.spotlight_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY spotlight_reactions_read ON public.spotlight_reactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.spotlight_posts s WHERE s.id = spotlight_id AND (s.is_published OR s.author_id = auth.uid()))
);
CREATE POLICY spotlight_reactions_insert_own ON public.spotlight_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY spotlight_reactions_update_own ON public.spotlight_reactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY spotlight_reactions_delete_own ON public.spotlight_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX spotlight_reactions_post_idx ON public.spotlight_reactions(spotlight_id, reaction_type);

CREATE OR REPLACE FUNCTION public.extract_social_tokens(_content_type text, _content_id uuid, _body text, _actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE token text; normalized text; tag_id uuid; target uuid;
BEGIN
  IF _actor_id IS NULL OR _content_type NOT IN ('post','comment','spotlight') THEN RAISE EXCEPTION 'Invalid social token request'; END IF;
  IF _content_type = 'post' AND NOT EXISTS (SELECT 1 FROM public.social_posts WHERE id=_content_id AND author_id=_actor_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _content_type = 'comment' AND NOT EXISTS (SELECT 1 FROM public.post_comments WHERE id=_content_id AND author_id=_actor_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _content_type = 'spotlight' AND NOT EXISTS (SELECT 1 FROM public.spotlight_posts WHERE id=_content_id AND author_id=_actor_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.content_mentions WHERE content_type=_content_type AND content_id=_content_id AND actor_id=_actor_id;
  IF _content_type='post' THEN DELETE FROM public.post_hashtags WHERE post_id=_content_id;
  ELSIF _content_type='spotlight' THEN DELETE FROM public.spotlight_hashtags WHERE spotlight_id=_content_id; END IF;
  FOR token IN SELECT DISTINCT (regexp_matches(coalesce(_body,''), '(?<![[:alnum:]_])#([[:alnum:]_]{1,64})', 'g'))[1] LOOP
    normalized := lower(token);
    INSERT INTO public.hashtags(name,normalized_name) VALUES(token,normalized)
      ON CONFLICT(normalized_name) DO UPDATE SET name=EXCLUDED.name, updated_at=now() RETURNING id INTO tag_id;
    IF _content_type='post' THEN INSERT INTO public.post_hashtags(post_id,hashtag_id) VALUES(_content_id,tag_id) ON CONFLICT DO NOTHING;
    ELSIF _content_type='spotlight' THEN INSERT INTO public.spotlight_hashtags(spotlight_id,hashtag_id) VALUES(_content_id,tag_id) ON CONFLICT DO NOTHING; END IF;
  END LOOP;
  FOR token IN SELECT DISTINCT lower((regexp_matches(coalesce(_body,''), '(?<![[:alnum:]_])@([[:alnum:]_.]{2,40})', 'g'))[1]) LOOP
    SELECT p.user_id INTO target FROM public.profiles p WHERE lower(p.username)=token LIMIT 1;
    IF target IS NOT NULL AND target<>_actor_id AND NOT public.is_blocked_pair(_actor_id,target) THEN
      INSERT INTO public.content_mentions(content_type,content_id,mentioned_user_id,actor_id) VALUES(_content_type,_content_id,target,_actor_id) ON CONFLICT DO NOTHING;
    END IF;
    target := NULL;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.extract_social_tokens(text,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extract_social_tokens(text,uuid,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_social_tokens_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.extract_social_tokens(TG_ARGV[0],NEW.id,CASE WHEN TG_ARGV[0]='comment' THEN NEW.body ELSE NEW.caption END,CASE WHEN TG_ARGV[0]='comment' THEN NEW.author_id ELSE NEW.author_id END); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.sync_social_tokens_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_social_tokens_trigger() TO service_role;
CREATE TRIGGER social_posts_tokens AFTER INSERT OR UPDATE OF caption ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.sync_social_tokens_trigger('post');
CREATE TRIGGER post_comments_tokens AFTER INSERT OR UPDATE OF body ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.sync_social_tokens_trigger('comment');
CREATE TRIGGER spotlight_posts_tokens AFTER INSERT OR UPDATE OF caption ON public.spotlight_posts FOR EACH ROW EXECUTE FUNCTION public.sync_social_tokens_trigger('spotlight');

CREATE OR REPLACE FUNCTION public.refresh_hashtag_usage() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE hid uuid;
BEGIN hid:=coalesce(NEW.hashtag_id,OLD.hashtag_id); UPDATE public.hashtags h SET usage_count=(SELECT count(*) FROM public.post_hashtags ph WHERE ph.hashtag_id=h.id)+(SELECT count(*) FROM public.spotlight_hashtags sh WHERE sh.hashtag_id=h.id), updated_at=now() WHERE h.id=hid; RETURN NULL; END $$;
REVOKE ALL ON FUNCTION public.refresh_hashtag_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_hashtag_usage() TO service_role;
CREATE TRIGGER post_hashtag_usage AFTER INSERT OR DELETE ON public.post_hashtags FOR EACH ROW EXECUTE FUNCTION public.refresh_hashtag_usage();
CREATE TRIGGER spotlight_hashtag_usage AFTER INSERT OR DELETE ON public.spotlight_hashtags FOR EACH ROW EXECUTE FUNCTION public.refresh_hashtag_usage();

CREATE OR REPLACE FUNCTION public.guard_photo_tag() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pref text; review boolean; media_count integer;
BEGIN
  IF NEW.tagged_by<>auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=NEW.tagged_user_id) THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF public.is_blocked_pair(NEW.tagged_by,NEW.tagged_user_id) THEN RAISE EXCEPTION 'Tagging is unavailable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id=NEW.post_id AND p.author_id=NEW.tagged_by) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_array_length(media) INTO media_count FROM public.social_posts WHERE id=NEW.post_id;
  IF NEW.image_index>=coalesce(media_count,0) THEN RAISE EXCEPTION 'Photo not found'; END IF;
  SELECT coalesce(who_can_tag,'everyone'),coalesce(review_tags,false) INTO pref,review FROM public.tag_preferences WHERE user_id=NEW.tagged_user_id;
  pref:=coalesce(pref,'everyone'); review:=coalesce(review,false);
  IF pref='no_one' AND NEW.tagged_by<>NEW.tagged_user_id THEN RAISE EXCEPTION 'This member does not allow tags'; END IF;
  IF pref='friends' AND NEW.tagged_by<>NEW.tagged_user_id AND NOT public.are_friends(NEW.tagged_by,NEW.tagged_user_id) THEN RAISE EXCEPTION 'Only friends can tag this member'; END IF;
  NEW.status:=CASE WHEN NEW.tagged_by=NEW.tagged_user_id OR NOT review THEN 'approved' ELSE 'pending' END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_photo_tag() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_photo_tag() TO service_role;
CREATE TRIGGER photo_tag_guard BEFORE INSERT ON public.post_photo_tags FOR EACH ROW EXECUTE FUNCTION public.guard_photo_tag();

CREATE OR REPLACE FUNCTION public.notify_social_engagement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; actor_name text; label text; category text; target_post uuid;
BEGIN
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id=coalesce(NEW.user_id,NEW.tagged_by,NEW.actor_id);
  IF TG_TABLE_NAME='post_likes' THEN SELECT author_id INTO owner_id FROM public.social_posts WHERE id=NEW.post_id; target_post:=NEW.post_id; category:='SOCIAL_REACTION';
    label:=CASE NEW.reaction_type WHEN 'love' THEN 'loved' WHEN 'haha' THEN 'reacted 😂 to' WHEN 'wow' THEN 'reacted 😮 to' WHEN 'sad' THEN 'reacted 😢 to' WHEN 'angry' THEN 'reacted 😡 to' ELSE 'liked' END;
  ELSIF TG_TABLE_NAME='comment_likes' THEN SELECT p.author_id,c.post_id INTO owner_id,target_post FROM public.post_comments c JOIN public.social_posts p ON p.id=c.post_id WHERE c.id=NEW.comment_id; category:='COMMENT_REACTION'; label:='reacted to a comment on';
  ELSIF TG_TABLE_NAME='story_reactions' THEN SELECT author_id INTO owner_id FROM public.stories WHERE id=NEW.story_id; category:='STORY_REACTION'; label:='reacted to';
  ELSIF TG_TABLE_NAME='story_replies' THEN SELECT author_id INTO owner_id FROM public.stories WHERE id=NEW.story_id; category:='STORY_REPLY'; label:='replied to';
  ELSIF TG_TABLE_NAME='spotlight_reactions' THEN SELECT author_id INTO owner_id FROM public.spotlight_posts WHERE id=NEW.spotlight_id; category:='SPOTLIGHT_REACTION'; label:='reacted to';
  ELSIF TG_TABLE_NAME='content_mentions' THEN owner_id:=NEW.mentioned_user_id; category:='MENTION'; label:='mentioned you in';
  ELSE owner_id:=NEW.tagged_user_id; category:='PHOTO_TAG'; label:='tagged you in'; target_post:=NEW.post_id; END IF;
  IF owner_id IS NULL OR owner_id=coalesce(NEW.user_id,NEW.tagged_by,NEW.actor_id) THEN RETURN NULL; END IF;
  PERFORM public.notify_actor(owner_id,coalesce(NEW.user_id,NEW.tagged_by,NEW.actor_id),category,
    coalesce(nullif(actor_name,''),'An ASH member')||' '||label||CASE WHEN category IN ('STORY_REACTION','STORY_REPLY') THEN ' your story' WHEN category='SPOTLIGHT_REACTION' THEN ' your Spotlight' WHEN category IN ('MENTION','PHOTO_TAG') THEN ' a post' ELSE ' your post' END,'',
    jsonb_strip_nulls(jsonb_build_object('post_id',target_post,'story_id',NEW.story_id,'spotlight_id',NEW.spotlight_id,'reaction_type',NEW.reaction_type,'comment_id',NEW.comment_id)));
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_social_engagement() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_social_engagement() TO service_role;
DROP TRIGGER IF EXISTS trg_notify_post_like ON public.post_likes;
CREATE TRIGGER notify_post_reaction AFTER INSERT OR UPDATE OF reaction_type ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.notify_social_engagement();
CREATE TRIGGER notify_comment_reaction AFTER INSERT OR UPDATE OF reaction_type ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.notify_social_engagement();
CREATE TRIGGER notify_story_reaction AFTER INSERT OR UPDATE OF reaction_type ON public.story_reactions FOR EACH ROW EXECUTE FUNCTION public.notify_social_engagement();
CREATE TRIGGER notify_story_reply AFTER INSERT ON public.story_replies FOR EACH ROW EXECUTE FUNCTION public.notify_social_engagement();
CREATE TRIGGER notify_spotlight_reaction AFTER INSERT OR UPDATE OF reaction_type ON public.spotlight_reactions FOR EACH ROW EXECUTE FUNCTION public.notify_social_engagement();
CREATE TRIGGER notify_content_mention AFTER INSERT ON public.content_mentions FOR EACH ROW EXECUTE FUNCTION public.notify_social_engagement();
CREATE TRIGGER notify_photo_tag AFTER INSERT ON public.post_photo_tags FOR EACH ROW EXECUTE FUNCTION public.notify_social_engagement();

CREATE OR REPLACE FUNCTION public.set_post_reaction(_post_id uuid,_reaction_type text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF; IF _reaction_type IS NULL THEN DELETE FROM public.post_likes WHERE post_id=_post_id AND user_id=uid; ELSIF _reaction_type NOT IN ('love','like','haha','wow','sad','angry') THEN RAISE EXCEPTION 'Invalid reaction'; ELSE INSERT INTO public.post_likes(post_id,user_id,reaction_type) VALUES(_post_id,uid,_reaction_type) ON CONFLICT(post_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,updated_at=now(); END IF; END $$;
CREATE OR REPLACE FUNCTION public.set_comment_reaction(_comment_id uuid,_reaction_type text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF; IF _reaction_type IS NULL THEN DELETE FROM public.comment_likes WHERE comment_id=_comment_id AND user_id=uid; ELSIF _reaction_type NOT IN ('love','like','haha','wow','sad','angry') THEN RAISE EXCEPTION 'Invalid reaction'; ELSE INSERT INTO public.comment_likes(comment_id,user_id,reaction_type) VALUES(_comment_id,uid,_reaction_type) ON CONFLICT(comment_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,updated_at=now(); END IF; END $$;
CREATE OR REPLACE FUNCTION public.set_story_reaction(_story_id uuid,_reaction_type text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF; IF NOT EXISTS(SELECT 1 FROM public.stories s WHERE s.id=_story_id AND s.expires_at>now()) THEN RAISE EXCEPTION 'Story unavailable'; END IF; IF _reaction_type IS NULL THEN DELETE FROM public.story_reactions WHERE story_id=_story_id AND user_id=uid; ELSIF _reaction_type NOT IN ('love','like','haha','wow','sad','angry') THEN RAISE EXCEPTION 'Invalid reaction'; ELSE INSERT INTO public.story_reactions(story_id,user_id,reaction_type) VALUES(_story_id,uid,_reaction_type) ON CONFLICT(story_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,updated_at=now(); END IF; END $$;
CREATE OR REPLACE FUNCTION public.set_spotlight_reaction(_spotlight_id uuid,_reaction_type text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF; IF NOT EXISTS(SELECT 1 FROM public.spotlight_posts s WHERE s.id=_spotlight_id AND s.is_published) THEN RAISE EXCEPTION 'Spotlight unavailable'; END IF; IF _reaction_type IS NULL THEN DELETE FROM public.spotlight_reactions WHERE spotlight_id=_spotlight_id AND user_id=uid; ELSIF _reaction_type NOT IN ('love','like','haha','wow','sad','angry') THEN RAISE EXCEPTION 'Invalid reaction'; ELSE INSERT INTO public.spotlight_reactions(spotlight_id,user_id,reaction_type) VALUES(_spotlight_id,uid,_reaction_type) ON CONFLICT(spotlight_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,updated_at=now(); END IF; END $$;
REVOKE ALL ON FUNCTION public.set_post_reaction(uuid,text), public.set_comment_reaction(uuid,text), public.set_story_reaction(uuid,text), public.set_spotlight_reaction(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_post_reaction(uuid,text), public.set_comment_reaction(uuid,text), public.set_story_reaction(uuid,text), public.set_spotlight_reaction(uuid,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.search_tag_people(_query text,_limit integer DEFAULT 10) RETURNS TABLE(user_id uuid,full_name text,username text,avatar_url text,verified_tier text,verified_until timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.user_id,p.full_name,p.username,p.avatar_url,p.verified_tier,p.verified_until FROM public.profiles p WHERE auth.uid() IS NOT NULL AND p.user_id<>auth.uid() AND NOT public.is_blocked_pair(auth.uid(),p.user_id) AND char_length(btrim(_query))>=2 AND (p.username ILIKE btrim(_query)||'%' OR p.full_name ILIKE '%'||btrim(_query)||'%') ORDER BY CASE WHEN p.username ILIKE btrim(_query)||'%' THEN 0 ELSE 1 END,p.full_name LIMIT least(greatest(_limit,1),20)
$$;
REVOKE ALL ON FUNCTION public.search_tag_people(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.search_tag_people(text,integer) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.hashtag_feed(_normalized_name text,_limit integer DEFAULT 20,_offset integer DEFAULT 0,_sort text DEFAULT 'recent') RETURNS TABLE(id uuid,author_id uuid,caption text,media jsonb,city text,like_count integer,comment_count integer,repost_count integer,filter_comments boolean,created_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.author_id,p.caption,p.media,p.city,p.like_count,p.comment_count,p.repost_count,p.filter_comments,p.created_at FROM public.post_hashtags ph JOIN public.hashtags h ON h.id=ph.hashtag_id JOIN public.social_posts p ON p.id=ph.post_id WHERE auth.uid() IS NOT NULL AND h.normalized_name=lower(regexp_replace(_normalized_name,'^#','')) AND NOT public.is_blocked_pair(auth.uid(),p.author_id) ORDER BY CASE WHEN _sort='top' THEN p.like_count*2+p.comment_count*3+p.repost_count*4 ELSE 0 END DESC,p.created_at DESC LIMIT least(greatest(_limit,1),50) OFFSET greatest(_offset,0)
$$;
REVOKE ALL ON FUNCTION public.hashtag_feed(text,integer,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hashtag_feed(text,integer,integer,text) TO authenticated,service_role;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.spotlight_reactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;