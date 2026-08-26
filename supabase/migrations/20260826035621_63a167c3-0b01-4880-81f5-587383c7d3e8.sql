-- Helper: decides who may read a given avatar object.
CREATE OR REPLACE FUNCTION public.can_view_avatar(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH parts AS (
    SELECT (storage.foldername(_object_name))[1] AS owner_text
  ), owner AS (
    SELECT CASE
             WHEN owner_text ~ '^[0-9a-fA-F-]{36}$' THEN owner_text::uuid
             ELSE NULL
           END AS owner_id
    FROM parts
  )
  SELECT auth.uid() IS NOT NULL
     AND owner.owner_id IS NOT NULL
     AND (
       -- Your own avatar.
       owner.owner_id = auth.uid()
       -- Avatars of providers whose storefront is publicly live.
       OR EXISTS (
         SELECT 1 FROM public.provider_profiles p
         WHERE p.user_id = owner.owner_id AND p.is_live
       )
       -- People you are already talking to.
       OR EXISTS (
         SELECT 1
         FROM public.conversations c
         JOIN public.provider_profiles p ON p.id = c.provider_id
         WHERE (c.client_id = auth.uid() AND p.user_id = owner.owner_id)
            OR (p.user_id = auth.uid() AND c.client_id = owner.owner_id)
       )
       -- People you have a booking with.
       OR EXISTS (
         SELECT 1
         FROM public.bookings b
         JOIN public.provider_profiles p ON p.id = b.provider_id
         WHERE (b.client_id = auth.uid() AND p.user_id = owner.owner_id)
            OR (p.user_id = auth.uid() AND b.client_id = owner.owner_id)
       )
     )
  FROM owner;
$$;

REVOKE ALL ON FUNCTION public.can_view_avatar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_avatar(text) TO authenticated, service_role;

-- Replace the blanket read policy with a scoped one (no anonymous access).
DROP POLICY IF EXISTS "avatars read" ON storage.objects;

CREATE POLICY "avatars scoped read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND public.can_view_avatar(name));