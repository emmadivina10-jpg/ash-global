CREATE POLICY post_likes_update_own ON public.post_likes FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY comment_likes_update_own ON public.comment_likes FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

ALTER FUNCTION public.set_post_reaction(uuid,text) SECURITY INVOKER;
ALTER FUNCTION public.set_comment_reaction(uuid,text) SECURITY INVOKER;
ALTER FUNCTION public.set_story_reaction(uuid,text) SECURITY INVOKER;
ALTER FUNCTION public.set_spotlight_reaction(uuid,text) SECURITY INVOKER;
ALTER FUNCTION public.search_tag_people(text,integer) SECURITY INVOKER;
ALTER FUNCTION public.hashtag_feed(text,integer,integer,text) SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.assign_profile_username() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE base text; candidate text; suffix integer:=0;
BEGIN
  IF NEW.username IS NOT NULL AND btrim(NEW.username)<>'' THEN
    base:=lower(regexp_replace(NEW.username,'[^[:alnum:]_]+','','g'));
  ELSE
    base:=lower(regexp_replace(coalesce(nullif(NEW.full_name,''),'member'),'[^[:alnum:]_]+','','g'));
  END IF;
  IF base='' THEN base:='member'; END IF;
  base:=left(base,32);
  candidate:=base||'_'||left(replace(NEW.user_id::text,'-',''),6);
  WHILE EXISTS(SELECT 1 FROM public.profiles p WHERE lower(p.username)=lower(candidate) AND p.user_id<>NEW.user_id) LOOP suffix:=suffix+1; candidate:=base||'_'||left(replace(NEW.user_id::text,'-',''),6)||suffix::text; END LOOP;
  NEW.username:=candidate;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.assign_profile_username() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_profile_username() TO service_role;
CREATE TRIGGER assign_profile_username BEFORE INSERT OR UPDATE OF username,full_name ON public.profiles FOR EACH ROW WHEN (NEW.username IS NULL OR btrim(NEW.username)='') EXECUTE FUNCTION public.assign_profile_username();

CREATE OR REPLACE FUNCTION public.guard_photo_tag_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.tagged_user_id<>auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF NEW.post_id<>OLD.post_id OR NEW.image_index<>OLD.image_index OR NEW.tagged_user_id<>OLD.tagged_user_id OR NEW.tagged_by<>OLD.tagged_by OR NEW.x<>OLD.x OR NEW.y<>OLD.y OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Only tag review status can change'; END IF;
  IF NEW.status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid tag decision'; END IF;
  NEW.updated_at:=now(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_photo_tag_update() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_photo_tag_update() TO service_role;
CREATE TRIGGER photo_tag_update_guard BEFORE UPDATE ON public.post_photo_tags FOR EACH ROW EXECUTE FUNCTION public.guard_photo_tag_update();

CREATE OR REPLACE FUNCTION public.notify_social_engagement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; actor uuid; actor_name text; label text; category text; payload jsonb:='{}'::jsonb; target_post uuid;
BEGIN
  IF TG_TABLE_NAME='post_likes' THEN actor:=NEW.user_id; SELECT author_id INTO owner_id FROM public.social_posts WHERE id=NEW.post_id; target_post:=NEW.post_id; category:='SOCIAL_REACTION'; label:=CASE NEW.reaction_type WHEN 'love' THEN 'loved' WHEN 'haha' THEN 'reacted 😂 to' WHEN 'wow' THEN 'reacted 😮 to' WHEN 'sad' THEN 'reacted 😢 to' WHEN 'angry' THEN 'reacted 😡 to' ELSE 'liked' END; payload:=jsonb_build_object('post_id',NEW.post_id,'reaction_type',NEW.reaction_type);
  ELSIF TG_TABLE_NAME='comment_likes' THEN actor:=NEW.user_id; SELECT c.author_id,c.post_id INTO owner_id,target_post FROM public.post_comments c WHERE c.id=NEW.comment_id; category:='COMMENT_REACTION'; label:='reacted to your comment on'; payload:=jsonb_build_object('post_id',target_post,'comment_id',NEW.comment_id,'reaction_type',NEW.reaction_type);
  ELSIF TG_TABLE_NAME='story_reactions' THEN actor:=NEW.user_id; SELECT author_id INTO owner_id FROM public.stories WHERE id=NEW.story_id; category:='STORY_REACTION'; label:='reacted to'; payload:=jsonb_build_object('story_id',NEW.story_id,'reaction_type',NEW.reaction_type);
  ELSIF TG_TABLE_NAME='story_replies' THEN actor:=NEW.user_id; SELECT author_id INTO owner_id FROM public.stories WHERE id=NEW.story_id; category:='STORY_REPLY'; label:='replied to'; payload:=jsonb_build_object('story_id',NEW.story_id);
  ELSIF TG_TABLE_NAME='spotlight_reactions' THEN actor:=NEW.user_id; SELECT author_id INTO owner_id FROM public.spotlight_posts WHERE id=NEW.spotlight_id; category:='SPOTLIGHT_REACTION'; label:='reacted to'; payload:=jsonb_build_object('spotlight_id',NEW.spotlight_id,'reaction_type',NEW.reaction_type);
  ELSIF TG_TABLE_NAME='content_mentions' THEN actor:=NEW.actor_id; owner_id:=NEW.mentioned_user_id; category:='MENTION'; IF NEW.content_type='post' THEN target_post:=NEW.content_id; ELSIF NEW.content_type='comment' THEN SELECT post_id INTO target_post FROM public.post_comments WHERE id=NEW.content_id; END IF; label:=CASE NEW.content_type WHEN 'comment' THEN 'mentioned you in a comment on' WHEN 'spotlight' THEN 'mentioned you in' ELSE 'mentioned you in' END; payload:=jsonb_strip_nulls(jsonb_build_object('post_id',target_post,'spotlight_id',CASE WHEN NEW.content_type='spotlight' THEN NEW.content_id ELSE NULL END,'comment_id',CASE WHEN NEW.content_type='comment' THEN NEW.content_id ELSE NULL END));
  ELSIF TG_TABLE_NAME='post_photo_tags' THEN actor:=NEW.tagged_by; owner_id:=NEW.tagged_user_id; category:='PHOTO_TAG'; label:='tagged you in'; payload:=jsonb_build_object('post_id',NEW.post_id,'photo_tag_id',NEW.id,'status',NEW.status);
  END IF;
  IF owner_id IS NULL OR actor IS NULL OR owner_id=actor THEN RETURN NULL; END IF;
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id=actor;
  PERFORM public.notify_actor(owner_id,actor,category,coalesce(nullif(actor_name,''),'An ASH member')||' '||label||CASE WHEN category IN ('STORY_REACTION','STORY_REPLY') THEN ' your story' WHEN category='SPOTLIGHT_REACTION' THEN ' your Spotlight' ELSE ' a post' END,'',payload);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_social_engagement() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.notify_social_engagement() TO service_role;