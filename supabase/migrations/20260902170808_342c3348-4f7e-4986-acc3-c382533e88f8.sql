CREATE POLICY "property images readable" ON storage.objects FOR SELECT
  USING (bucket_id = 'property');
CREATE POLICY "owners upload property images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owners update property images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owners delete property images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property' AND (storage.foldername(name))[1] = auth.uid()::text);