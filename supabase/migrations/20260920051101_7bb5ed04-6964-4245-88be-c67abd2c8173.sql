CREATE OR REPLACE FUNCTION public.can_view_avatar(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
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
     AND (
       parsed.owner_id = auth.uid()
       OR (
         parsed.area = 'groups'
         AND parsed.group_id IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM public.chat_groups g
           WHERE g.id = parsed.group_id
             AND (
               g.owner_id = auth.uid()
               OR EXISTS (
                 SELECT 1
                 FROM public.group_members gm
                 WHERE gm.group_id = g.id
                   AND gm.user_id = auth.uid()
               )
             )
         )
       )
       OR EXISTS (
         SELECT 1 FROM public.provider_profiles p
         WHERE p.user_id = parsed.owner_id AND p.is_live
       )
       OR EXISTS (
         SELECT 1
         FROM public.conversations c
         JOIN public.provider_profiles p ON p.id = c.provider_id
         WHERE (c.client_id = auth.uid() AND p.user_id = parsed.owner_id)
            OR (p.user_id = auth.uid() AND c.client_id = parsed.owner_id)
       )
       OR EXISTS (
         SELECT 1
         FROM public.bookings b
         JOIN public.provider_profiles p ON p.id = b.provider_id
         WHERE (b.client_id = auth.uid() AND p.user_id = parsed.owner_id)
            OR (p.user_id = auth.uid() AND b.client_id = parsed.owner_id)
       )
     )
  FROM parsed;
$$;

REVOKE ALL ON FUNCTION public.can_view_avatar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_avatar(text) TO authenticated, service_role;