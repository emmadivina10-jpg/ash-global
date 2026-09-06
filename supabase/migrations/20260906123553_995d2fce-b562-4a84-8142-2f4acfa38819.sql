GRANT DELETE ON public.messages TO authenticated;
DROP POLICY IF EXISTS "Senders delete own messages" ON public.messages;
CREATE POLICY "Senders delete own messages"
  ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id));