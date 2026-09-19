DROP POLICY IF EXISTS "Participants read conversations" ON public.conversations;
CREATE POLICY "Participants read unlocked conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  ((client_id = auth.uid()) OR (owner_id = auth.uid()) OR public.is_provider_owner(provider_id))
  AND NOT EXISTS (
    SELECT 1 FROM public.conversation_prefs cp
    WHERE cp.user_id = auth.uid()
      AND cp.conversation_id = conversations.id
      AND cp.locked = true
  )
);

DROP POLICY IF EXISTS "Group members read conversations" ON public.conversations;
CREATE POLICY "Group members read unlocked conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  group_id IS NOT NULL
  AND public.is_group_member(group_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.conversation_prefs cp
    WHERE cp.user_id = auth.uid()
      AND cp.conversation_id = conversations.id
      AND cp.locked = true
  )
);

DROP POLICY IF EXISTS "Members manage their own chat preferences" ON public.conversation_prefs;
CREATE POLICY "Members read their own chat preferences"
ON public.conversation_prefs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Participants create their own chat preferences"
ON public.conversation_prefs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_conversation_participant(conversation_id));

CREATE POLICY "Participants update their own chat preferences"
ON public.conversation_prefs
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND public.is_conversation_participant(conversation_id))
WITH CHECK (user_id = auth.uid() AND public.is_conversation_participant(conversation_id));

CREATE POLICY "Participants delete their own chat preferences"
ON public.conversation_prefs
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND public.is_conversation_participant(conversation_id));