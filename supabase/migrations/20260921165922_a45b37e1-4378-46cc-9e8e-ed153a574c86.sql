CREATE OR REPLACE FUNCTION public.can_view_avatar(_object_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
  WITH parts AS (
    SELECT
      (storage.foldername(_object_name))[1] AS owner_text,
      (storage.foldername(_object_name))[2] AS area,
      split_part((storage.foldername(_object_name))[3], '-', 1) AS group_text
  ), parsed AS (
    SELECT
      CASE WHEN owner_text ~ '^[0-9a-fA-F-]{36}$' THEN owner_text::uuid ELSE NULL END AS owner_id,
      area,
      CASE WHEN group_text ~ '^[0-9a-fA-F-]{36}$' THEN group_text::uuid ELSE NULL END AS group_id
    FROM parts
  )
  SELECT auth.uid() IS NOT NULL
     AND parsed.owner_id IS NOT NULL
     AND CASE
       WHEN parsed.area = 'groups' THEN
         parsed.group_id IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM public.chat_groups g
           WHERE g.id = parsed.group_id
             AND (
               g.owner_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.group_members gm
                 WHERE gm.group_id = g.id AND gm.user_id = auth.uid()
               )
             )
         )
       ELSE
         parsed.owner_id = auth.uid()
         OR EXISTS (
           SELECT 1 FROM public.profiles pr
           WHERE pr.user_id = parsed.owner_id
             AND pr.avatar_url = _object_name
         )
     END
  FROM parsed;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_old_activity_events(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_active_user_interests(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_content_popularity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_user_interests(uuid, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.purge_old_activity_events(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_active_user_interests(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_content_popularity() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_user_interests(uuid, integer) TO service_role;