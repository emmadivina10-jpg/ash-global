DROP POLICY IF EXISTS "spotlight_media_read" ON storage.objects;

CREATE POLICY "spotlight_media_read_authorized_content"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'spotlight'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.spotlight_posts sp
      CROSS JOIN LATERAL jsonb_array_elements(sp.media) AS item
      WHERE sp.is_published = true
        AND item->>'path' = storage.objects.name
    )
    OR EXISTS (
      SELECT 1
      FROM public.social_posts post
      CROSS JOIN LATERAL jsonb_array_elements(post.media) AS item
      WHERE post.is_published = true
        AND trim(both '"' from item::text) = storage.objects.name
    )
    OR EXISTS (
      SELECT 1
      FROM public.articles article
      WHERE article.is_published = true
        AND article.cover_path = storage.objects.name
    )
    OR EXISTS (
      SELECT 1
      FROM public.forum_posts forum_post
      WHERE forum_post.image_path = storage.objects.name
    )
    OR EXISTS (
      SELECT 1
      FROM public.stories story
      WHERE story.media_path = storage.objects.name
        AND story.expires_at > now()
        AND (
          (
            story.audience = 'ALL'
            AND NOT (auth.uid() = ANY (story.block_ids))
          )
          OR (
            story.audience = 'SELECT'
            AND auth.uid() = ANY (story.allow_ids)
          )
        )
    )
  )
);