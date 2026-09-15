
-- ============ stories ============
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  caption text NOT NULL DEFAULT '',
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX stories_active_idx ON public.stories (expires_at DESC, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories readable while live" ON public.stories FOR SELECT TO authenticated USING (expires_at > now() OR author_id = auth.uid());
CREATE POLICY "stories insert own" ON public.stories FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "stories delete own" ON public.stories FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);
GRANT SELECT, INSERT ON public.story_views TO authenticated;
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "story views visible to owner and viewer" ON public.story_views FOR SELECT TO authenticated
  USING (viewer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.author_id = auth.uid()));
CREATE POLICY "story views insert own" ON public.story_views FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_story_view_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.stories SET view_count = view_count + 1 WHERE id = NEW.story_id;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_story_view_count() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_story_view_count AFTER INSERT ON public.story_views FOR EACH ROW EXECUTE FUNCTION public.sync_story_view_count();

-- ============ social posts ============
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption text NOT NULL DEFAULT '',
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  city text,
  tags text[] NOT NULL DEFAULT '{}',
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  repost_count integer NOT NULL DEFAULT 0,
  filter_comments boolean NOT NULL DEFAULT false,
  reposted_from uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX social_posts_recent_idx ON public.social_posts (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts readable" ON public.social_posts FOR SELECT TO authenticated USING (is_published OR author_id = auth.uid());
CREATE POLICY "posts insert own" ON public.social_posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts update own" ON public.social_posts FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts delete own" ON public.social_posts FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_social_posts_touch BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes insert own" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes delete own" ON public.post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.post_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_reposts TO authenticated;
GRANT ALL ON public.post_reposts TO service_role;
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reposts readable" ON public.post_reposts FOR SELECT TO authenticated USING (true);
CREATE POLICY "reposts insert own" ON public.post_reposts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reposts delete own" ON public.post_reposts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON public.post_comments (post_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable" ON public.post_comments FOR SELECT TO authenticated
  USING (NOT is_hidden OR author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.author_id = auth.uid()));
CREATE POLICY "comments insert own" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments update own or post owner" ON public.post_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.author_id = auth.uid()))
  WITH CHECK (true);
CREATE POLICY "comments delete own or post owner" ON public.post_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.author_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- counters
CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.social_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSE UPDATE public.social_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id; END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_post_like_count() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_post_like_count AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.sync_post_like_count();

CREATE OR REPLACE FUNCTION public.sync_post_repost_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.social_posts SET repost_count = repost_count + 1 WHERE id = NEW.post_id;
  ELSE UPDATE public.social_posts SET repost_count = GREATEST(repost_count - 1, 0) WHERE id = OLD.post_id; END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_post_repost_count() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_post_repost_count AFTER INSERT OR DELETE ON public.post_reposts FOR EACH ROW EXECUTE FUNCTION public.sync_post_repost_count();

CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.social_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSE UPDATE public.social_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id; END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_post_comment_count() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_post_comment_count AFTER INSERT OR DELETE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_count();

-- ============ friendships ============
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','DECLINED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships visible to both" ON public.friendships FOR SELECT TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "friendships request own" ON public.friendships FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "friendships answer" ON public.friendships FOR UPDATE TO authenticated USING (addressee_id = auth.uid()) WITH CHECK (addressee_id = auth.uid());
CREATE POLICY "friendships remove" ON public.friendships FOR DELETE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE TRIGGER trg_friendships_touch BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'ACCEPTED'
      AND ((f.requester_id = _a AND f.addressee_id = _b) OR (f.requester_id = _b AND f.addressee_id = _a))
  )
$$;

-- ============ groups ============
CREATE TABLE public.chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_members m WHERE m.group_id = _group_id AND m.user_id = auth.uid()
  )
$$;
CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.chat_groups g WHERE g.id = _group_id AND g.owner_id = auth.uid()
  )
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_groups TO authenticated;
GRANT ALL ON public.chat_groups TO service_role;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups readable by members" ON public.chat_groups FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_group_member(id));
CREATE POLICY "groups create own" ON public.chat_groups FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "groups update owner" ON public.chat_groups FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "groups delete owner" ON public.chat_groups FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER trg_chat_groups_touch BEFORE UPDATE ON public.chat_groups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group members readable by members" ON public.group_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_group_member(group_id) OR public.is_group_owner(group_id));
CREATE POLICY "group members added by owner" ON public.group_members FOR INSERT TO authenticated WITH CHECK (public.is_group_owner(group_id));
CREATE POLICY "group members leave or removed" ON public.group_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_group_owner(group_id));

ALTER TABLE public.conversations ADD COLUMN group_id uuid REFERENCES public.chat_groups(id) ON DELETE CASCADE;
CREATE INDEX conversations_group_idx ON public.conversations (group_id);

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select auth.uid() is not null and exists (
    select 1 from public.conversations c
    left join public.provider_profiles p on p.id = c.provider_id
    where c.id = _conversation_id
      and (c.client_id = auth.uid() or c.owner_id = auth.uid() or p.user_id = auth.uid()
           or (c.group_id is not null and public.is_group_member(c.group_id)))
  )
$$;

-- ============ chat settings ============
CREATE TABLE public.chat_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallpaper text NOT NULL DEFAULT 'default',
  wallpaper_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_settings TO authenticated;
GRANT ALL ON public.chat_settings TO service_role;
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat settings own" ON public.chat_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_chat_settings_touch BEFORE UPDATE ON public.chat_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ notifications: who triggered it ============
ALTER TABLE public.notifications ADD COLUMN actor_id uuid;

CREATE OR REPLACE FUNCTION public.notify_actor(_user_id uuid, _actor_id uuid, _category text, _title text, _body text DEFAULT '', _data jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, actor_id, category, title, body, data)
  SELECT _user_id, _actor_id, _category, _title, coalesce(_body,''), coalesce(_data,'{}'::jsonb)
  WHERE _user_id IS NOT NULL AND _user_id <> coalesce(_actor_id, '00000000-0000-0000-0000-000000000000'::uuid);
$$;
REVOKE EXECUTE ON FUNCTION public.notify_actor(uuid, uuid, text, text, text, jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_actor(uuid, uuid, text, text, text, jsonb) TO service_role;

-- social notification triggers
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT author_id INTO owner_id FROM public.social_posts WHERE id = NEW.post_id;
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM public.notify_actor(owner_id, NEW.user_id, 'SOCIAL_LIKE',
    coalesce(nullif(actor_name,''),'An ASH member') || ' liked your post', '',
    jsonb_build_object('post_id', NEW.post_id));
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_post_like() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_notify_post_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();

CREATE OR REPLACE FUNCTION public.notify_post_repost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT author_id INTO owner_id FROM public.social_posts WHERE id = NEW.post_id;
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM public.notify_actor(owner_id, NEW.user_id, 'SOCIAL_REPOST',
    coalesce(nullif(actor_name,''),'An ASH member') || ' reposted your post', '',
    jsonb_build_object('post_id', NEW.post_id));
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_post_repost() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_notify_post_repost AFTER INSERT ON public.post_reposts FOR EACH ROW EXECUTE FUNCTION public.notify_post_repost();

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; parent_author uuid; actor_name text;
BEGIN
  SELECT author_id INTO owner_id FROM public.social_posts WHERE id = NEW.post_id;
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.author_id;
  PERFORM public.notify_actor(owner_id, NEW.author_id, 'SOCIAL_COMMENT',
    coalesce(nullif(actor_name,''),'An ASH member') || ' commented on your post', left(NEW.body,140),
    jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id));
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_author FROM public.post_comments WHERE id = NEW.parent_id;
    IF parent_author IS NOT NULL AND parent_author <> owner_id THEN
      PERFORM public.notify_actor(parent_author, NEW.author_id, 'SOCIAL_REPLY',
        coalesce(nullif(actor_name,''),'An ASH member') || ' replied to your comment', left(NEW.body,140),
        jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id));
    END IF;
  END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_post_comment() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_notify_post_comment AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();

CREATE OR REPLACE FUNCTION public.notify_friendship()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.requester_id;
    PERFORM public.notify_actor(NEW.addressee_id, NEW.requester_id, 'FRIEND_REQUEST',
      coalesce(nullif(actor_name,''),'An ASH member') || ' sent you a friend request', '',
      jsonb_build_object('friendship_id', NEW.id));
  ELSIF NEW.status = 'ACCEPTED' AND OLD.status <> 'ACCEPTED' THEN
    SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.addressee_id;
    PERFORM public.notify_actor(NEW.requester_id, NEW.addressee_id, 'FRIEND_ACCEPTED',
      coalesce(nullif(actor_name,''),'An ASH member') || ' accepted your friend request', '',
      jsonb_build_object('friendship_id', NEW.id));
  END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_friendship() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_notify_friendship AFTER INSERT OR UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.notify_friendship();

CREATE OR REPLACE FUNCTION public.notify_group_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gname text;
BEGIN
  SELECT name INTO gname FROM public.chat_groups WHERE id = NEW.group_id;
  PERFORM public.notify_actor(NEW.user_id, NEW.added_by, 'GROUP_ADDED',
    'You were added to ' || coalesce(gname,'a group'), '',
    jsonb_build_object('group_id', NEW.group_id));
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_group_member() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_notify_group_member AFTER INSERT ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.notify_group_member();

-- group-aware message notifications
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  conv RECORD;
  recipient uuid;
  sender_name text;
BEGIN
  SELECT c.client_id, c.owner_id, c.group_id, p.user_id AS provider_user_id, p.business_name
    INTO conv
    FROM public.conversations c
    LEFT JOIN public.provider_profiles p ON p.id = c.provider_id
   WHERE c.id = NEW.conversation_id;

  SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;

  IF conv.group_id IS NOT NULL THEN
    PERFORM public.notify_actor(m.user_id, NEW.sender_id, 'MESSAGE',
      coalesce(nullif(sender_name,''),'ASH member') || ' in group chat', left(NEW.body,140),
      jsonb_build_object('conversation_id', NEW.conversation_id, 'group_id', conv.group_id))
    FROM public.group_members m WHERE m.group_id = conv.group_id AND m.user_id <> NEW.sender_id;
    RETURN NEW;
  END IF;

  IF conv.client_id IS NULL THEN RETURN NEW; END IF;
  recipient := CASE
    WHEN NEW.sender_id = conv.client_id THEN coalesce(conv.provider_user_id, conv.owner_id)
    ELSE conv.client_id END;
  IF recipient IS NULL OR recipient = NEW.sender_id THEN RETURN NEW; END IF;

  IF conv.provider_user_id IS NOT NULL AND NEW.sender_id = conv.provider_user_id THEN
    sender_name := conv.business_name;
  END IF;

  PERFORM public.notify_actor(recipient, NEW.sender_id, 'MESSAGE',
    'New message from ' || coalesce(nullif(sender_name, ''), 'ASH member'),
    left(NEW.body, 140),
    jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id));

  RETURN NEW;
END; $$;

-- ============ feed ranking ============
CREATE OR REPLACE FUNCTION public.social_feed(_limit integer DEFAULT 30, _offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid, author_id uuid, caption text, media jsonb, city text,
  like_count integer, comment_count integer, repost_count integer,
  filter_comments boolean, reposted_from uuid, created_at timestamptz,
  liked boolean, reposted boolean, score double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.author_id, p.caption, p.media, p.city,
         p.like_count, p.comment_count, p.repost_count,
         p.filter_comments, p.reposted_from, p.created_at,
         EXISTS (SELECT 1 FROM public.post_likes l WHERE l.post_id = p.id AND l.user_id = auth.uid()) AS liked,
         EXISTS (SELECT 1 FROM public.post_reposts r WHERE r.post_id = p.id AND r.user_id = auth.uid()) AS reposted,
         (
           CASE WHEN public.are_friends(p.author_id, auth.uid()) THEN 40 ELSE 0 END
           + CASE WHEN p.author_id = auth.uid() THEN 25 ELSE 0 END
           + (p.like_count * 2 + p.comment_count * 3 + p.repost_count * 4)
           - (EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0) * 1.5
         )::double precision AS score
    FROM public.social_posts p
   WHERE p.is_published
   ORDER BY score DESC, p.created_at DESC
   LIMIT greatest(1, least(_limit, 60)) OFFSET greatest(0, _offset)
$$;
REVOKE EXECUTE ON FUNCTION public.social_feed(integer, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.social_feed(integer, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_group_owner(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_owner(uuid) TO authenticated, service_role;
