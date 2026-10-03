CREATE OR REPLACE FUNCTION public.social_feed(_limit integer DEFAULT 30, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, author_id uuid, caption text, media jsonb, city text, like_count integer, comment_count integer, repost_count integer, filter_comments boolean, reposted_from uuid, created_at timestamp with time zone, liked boolean, reposted boolean, score double precision)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
     AND (
       p.author_id = auth.uid() OR (
         p.moderation_status = 'APPROVED'
         AND NOT public.is_author_restricted(p.author_id)
         AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), p.author_id))
       )
     )
   ORDER BY score DESC, p.created_at DESC
   LIMIT greatest(1, least(_limit, 60)) OFFSET greatest(0, _offset)
$function$;