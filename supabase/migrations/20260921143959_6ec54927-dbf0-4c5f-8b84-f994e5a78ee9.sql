CREATE POLICY "Applicants upload own campus documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'campus-verification' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Applicants read own campus documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'campus-verification' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Applicants remove own campus documents" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'campus-verification' AND (storage.foldername(name))[1] = auth.uid()::text);