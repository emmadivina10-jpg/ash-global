CREATE OR REPLACE FUNCTION public.set_spotlight_reaction(_spotlight_id uuid, _reaction_type text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid:=auth.uid(); r text:=nullif(btrim(coalesce(_reaction_type,'')),'');
BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.spotlight_posts s WHERE s.id=_spotlight_id AND s.is_published AND s.created_at > now() - interval '30 days') THEN RAISE EXCEPTION 'Spotlight unavailable'; END IF;
IF r IS NULL THEN DELETE FROM public.spotlight_reactions WHERE spotlight_id=_spotlight_id AND user_id=uid;
ELSIF r NOT IN ('love','like','haha','wow','sad','angry') THEN RAISE EXCEPTION 'Invalid reaction';
ELSE INSERT INTO public.spotlight_reactions(spotlight_id,user_id,reaction_type) VALUES(_spotlight_id,uid,r)
ON CONFLICT(spotlight_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,updated_at=now(); END IF; END $function$;