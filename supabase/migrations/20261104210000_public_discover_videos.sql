CREATE OR REPLACE FUNCTION public.current_user_is_active_campus_instructor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campus_instructor_profiles AS instructor
    WHERE instructor.user_id = auth.uid()
      AND instructor.is_active
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_active_campus_instructor() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_active_campus_instructor() TO authenticated;

CREATE OR REPLACE FUNCTION public.discover_active_instructors()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  headline text,
  bio text,
  subjects text[],
  skills text[],
  is_active boolean,
  is_verified boolean,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    instructor.id,
    instructor.user_id,
    instructor.display_name,
    instructor.headline,
    instructor.bio,
    instructor.subjects,
    instructor.skills,
    instructor.is_active,
    instructor.is_verified,
    profile.avatar_url
  FROM public.campus_instructor_profiles AS instructor
  LEFT JOIN public.public_profiles AS profile ON profile.user_id = instructor.user_id
  WHERE instructor.is_active
    AND safety.ugc_visible(instructor.user_id)
  ORDER BY instructor.years_experience DESC, instructor.approved_at DESC
  LIMIT 80;
$$;

REVOKE ALL ON FUNCTION public.discover_active_instructors() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discover_active_instructors() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.discover_video_feed(
  _limit integer DEFAULT 60,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  caption text,
  media jsonb,
  city text,
  like_count integer,
  comment_count integer,
  repost_count integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    post.id,
    post.author_id,
    post.caption,
    media.video_paths,
    post.city,
    post.like_count,
    post.comment_count,
    post.repost_count,
    post.created_at
  FROM public.social_posts AS post
  CROSS JOIN LATERAL (
    SELECT coalesce(
      jsonb_agg(to_jsonb(item.media_path) ORDER BY item.ordinality),
      '[]'::jsonb
    ) AS video_paths
    FROM jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(post.media) = 'array' THEN post.media
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS item(media_path, ordinality)
    WHERE split_part(item.media_path, '/', 1) = post.author_id::text
      AND split_part(item.media_path, '/', 2) = 'post'
      AND item.media_path ~* '\.(mp4|webm|mov|m4v|ogv)$'
  ) AS media
  WHERE post.is_published
    AND post.moderation_status = 'APPROVED'
    AND EXISTS (
      SELECT 1
      FROM public.campus_instructor_profiles AS instructor
      WHERE instructor.user_id = post.author_id
        AND instructor.is_active
    )
    AND safety.ugc_visible(post.author_id)
    AND jsonb_array_length(media.video_paths) > 0
  ORDER BY post.created_at DESC
  LIMIT greatest(1, least(coalesce(_limit, 60), 100))
  OFFSET greatest(0, coalesce(_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.discover_video_feed(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discover_video_feed(integer, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.discover_public_spotlight_feed(_limit integer DEFAULT 18)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  provider_id uuid,
  caption text,
  media jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    post.id,
    post.author_id,
    post.provider_id,
    post.caption,
    media.public_media,
    post.created_at
  FROM public.spotlight_posts AS post
  CROSS JOIN LATERAL (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'path', item.path,
          'type', CASE
            WHEN item.path ~* '\.(mp4|webm|mov|m4v|ogv)$' THEN 'video'
            ELSE 'image'
          END
        )
        ORDER BY item.ordinality
      ),
      '[]'::jsonb
    ) AS public_media
    FROM (
      SELECT
        value->>'path' AS path,
        ordinality
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(post.media) = 'array' THEN post.media
          ELSE '[]'::jsonb
        END
      ) WITH ORDINALITY AS media(value, ordinality)
    ) AS item
    WHERE split_part(item.path, '/', 1) = post.author_id::text
      AND item.path ~* '\.(mp4|webm|mov|m4v|ogv|jpg|jpeg|png|gif|webp)$'
  ) AS media
  WHERE post.is_published
    AND post.moderation_status = 'APPROVED'
    AND safety.ugc_visible(post.author_id)
    AND post.created_at > now() - interval '30 days'
    AND jsonb_array_length(media.public_media) > 0
  ORDER BY post.created_at DESC
  LIMIT greatest(1, least(coalesce(_limit, 18), 60));
$$;

REVOKE ALL ON FUNCTION public.discover_public_spotlight_feed(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discover_public_spotlight_feed(integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.discover_video_media_visible(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.social_posts AS post
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(post.media) = 'array' THEN post.media
        ELSE '[]'::jsonb
      END
    ) AS item(media_path)
    WHERE post.is_published
      AND post.moderation_status = 'APPROVED'
      AND EXISTS (
        SELECT 1
        FROM public.campus_instructor_profiles AS instructor
        WHERE instructor.user_id = post.author_id
          AND instructor.is_active
      )
      AND safety.ugc_visible(post.author_id)
      AND item.media_path = _object_name
      AND split_part(item.media_path, '/', 1) = post.author_id::text
      AND split_part(item.media_path, '/', 2) = 'post'
      AND item.media_path ~* '\.(mp4|webm|mov|m4v|ogv)$'
  );
$$;

REVOKE ALL ON FUNCTION public.discover_video_media_visible(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discover_video_media_visible(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.discover_public_spotlight_media_visible(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.discover_video_media_visible(_object_name)
    OR EXISTS (
      SELECT 1
      FROM public.spotlight_posts AS post
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(post.media) = 'array' THEN post.media
          ELSE '[]'::jsonb
        END
      ) AS item
      WHERE post.is_published
        AND post.moderation_status = 'APPROVED'
        AND safety.ugc_visible(post.author_id)
        AND post.created_at > now() - interval '30 days'
        AND item->>'path' = _object_name
        AND split_part(item->>'path', '/', 1) = post.author_id::text
        AND item->>'path' ~* '\.(mp4|webm|mov|m4v|ogv|jpg|jpeg|png|gif|webp)$'
    );
$$;

REVOKE ALL ON FUNCTION public.discover_public_spotlight_media_visible(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discover_public_spotlight_media_visible(text) TO anon, authenticated;

CREATE POLICY "public published Discover and Spotlight media"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'spotlight'
  AND public.discover_public_spotlight_media_visible(name)
);

CREATE POLICY "active instructors upload Discover videos"
ON storage.objects
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id <> 'spotlight'
  OR split_part(name, '/', 2) <> 'post'
  OR name !~* '\.(mp4|webm|mov|m4v|ogv)$'
  OR public.current_user_is_active_campus_instructor()
);

CREATE POLICY "active instructors update Discover videos"
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  bucket_id <> 'spotlight'
  OR split_part(name, '/', 2) <> 'post'
  OR name !~* '\.(mp4|webm|mov|m4v|ogv)$'
  OR public.current_user_is_active_campus_instructor()
)
WITH CHECK (
  bucket_id <> 'spotlight'
  OR split_part(name, '/', 2) <> 'post'
  OR name !~* '\.(mp4|webm|mov|m4v|ogv)$'
  OR public.current_user_is_active_campus_instructor()
);

CREATE POLICY "active instructors create Discover video posts"
ON public.social_posts
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(media) = 'array' THEN media
        ELSE '[]'::jsonb
      END
    ) AS item(media_path)
    WHERE split_part(item.media_path, '/', 2) = 'post'
      AND item.media_path ~* '\.(mp4|webm|mov|m4v|ogv)$'
  )
  OR public.current_user_is_active_campus_instructor()
);

CREATE POLICY "active instructors update Discover video posts"
ON public.social_posts
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(media) = 'array' THEN media
        ELSE '[]'::jsonb
      END
    ) AS item(media_path)
    WHERE split_part(item.media_path, '/', 2) = 'post'
      AND item.media_path ~* '\.(mp4|webm|mov|m4v|ogv)$'
  )
  OR public.current_user_is_active_campus_instructor()
)
WITH CHECK (
  NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(media) = 'array' THEN media
        ELSE '[]'::jsonb
      END
    ) AS item(media_path)
    WHERE split_part(item.media_path, '/', 2) = 'post'
      AND item.media_path ~* '\.(mp4|webm|mov|m4v|ogv)$'
  )
  OR public.current_user_is_active_campus_instructor()
);
