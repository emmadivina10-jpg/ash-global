CREATE POLICY "Participants upload own voice notes" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='voice-notes'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid));

CREATE POLICY "Participants listen to voice notes" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='voice-notes'
  AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid));

CREATE POLICY "Senders delete own voice notes" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='voice-notes' AND (storage.foldername(name))[2] = auth.uid()::text);