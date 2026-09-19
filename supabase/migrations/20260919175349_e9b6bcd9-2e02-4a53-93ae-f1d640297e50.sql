DROP POLICY IF EXISTS "Participants read unlocked conversations" ON public.conversations;
CREATE POLICY "Participants read conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING ((client_id = auth.uid()) OR (owner_id = auth.uid()) OR public.is_provider_owner(provider_id));

DROP POLICY IF EXISTS "Group members read unlocked conversations" ON public.conversations;
CREATE POLICY "Group members read conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (group_id IS NOT NULL AND public.is_group_member(group_id));