CREATE OR REPLACE FUNCTION public.set_post_reaction(_post_id uuid, _reaction_type text)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE uid uuid:=auth.uid(); r text:=nullif(btrim(coalesce(_reaction_type,'')),'');
BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
IF r IS NULL THEN DELETE FROM public.post_likes WHERE post_id=_post_id AND user_id=uid;
ELSIF r NOT IN ('love','like','haha','wow','sad','angry') THEN RAISE EXCEPTION 'Invalid reaction';
ELSE INSERT INTO public.post_likes(post_id,user_id,reaction_type) VALUES(_post_id,uid,r)
ON CONFLICT(post_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,updated_at=now(); END IF; END $function$;

CREATE OR REPLACE FUNCTION public.set_comment_reaction(_comment_id uuid, _reaction_type text)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE uid uuid:=auth.uid(); r text:=nullif(btrim(coalesce(_reaction_type,'')),'');
BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
IF r IS NULL THEN DELETE FROM public.comment_likes WHERE comment_id=_comment_id AND user_id=uid;
ELSIF r NOT IN ('love','like','haha','wow','sad','angry') THEN RAISE EXCEPTION 'Invalid reaction';
ELSE INSERT INTO public.comment_likes(comment_id,user_id,reaction_type) VALUES(_comment_id,uid,r)
ON CONFLICT(comment_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,updated_at=now(); END IF; END $function$;

CREATE OR REPLACE FUNCTION public.set_story_reaction(_story_id uuid, _reaction_type text)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE uid uuid:=auth.uid(); r text:=nullif(btrim(coalesce(_reaction_type,'')),'');
BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.stories s WHERE s.id=_story_id AND s.expires_at>now()) THEN RAISE EXCEPTION 'Story unavailable'; END IF;
IF r IS NULL THEN DELETE FROM public.story_reactions WHERE story_id=_story_id AND user_id=uid;
ELSIF r NOT IN ('love','like','haha','wow','sad','angry') THEN RAISE EXCEPTION 'Invalid reaction';
ELSE INSERT INTO public.story_reactions(story_id,user_id,reaction_type) VALUES(_story_id,uid,r)
ON CONFLICT(story_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,updated_at=now(); END IF; END $function$;

CREATE OR REPLACE FUNCTION public.set_spotlight_reaction(_spotlight_id uuid, _reaction_type text)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE uid uuid:=auth.uid(); r text:=nullif(btrim(coalesce(_reaction_type,'')),'');
BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.spotlight_posts s WHERE s.id=_spotlight_id AND s.is_published) THEN RAISE EXCEPTION 'Spotlight unavailable'; END IF;
IF r IS NULL THEN DELETE FROM public.spotlight_reactions WHERE spotlight_id=_spotlight_id AND user_id=uid;
ELSIF r NOT IN ('love','like','haha','wow','sad','angry') THEN RAISE EXCEPTION 'Invalid reaction';
ELSE INSERT INTO public.spotlight_reactions(spotlight_id,user_id,reaction_type) VALUES(_spotlight_id,uid,r)
ON CONFLICT(spotlight_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,updated_at=now(); END IF; END $function$;