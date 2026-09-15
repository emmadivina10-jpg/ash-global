CREATE POLICY "spotlight_media_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'spotlight');

CREATE POLICY "spotlight_media_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'spotlight' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "spotlight_media_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'spotlight' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'spotlight' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "spotlight_media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'spotlight' AND (storage.foldername(name))[1] = auth.uid()::text);

REVOKE EXECUTE ON FUNCTION public.sync_forum_comment_count() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_forum_like_count() FROM anon, authenticated, PUBLIC;