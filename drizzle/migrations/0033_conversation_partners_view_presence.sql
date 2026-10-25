-- Let signed-in members see the online presence of people they share a
-- conversation with (direct, listing, or provider chats), so the green dot and
-- "Online" label appear for anyone actively messaging them, not only friends.
CREATE POLICY "Conversation partners can view presence"
ON public.member_presence
FOR SELECT
TO authenticated
USING (
  safety.identity_access_allowed(auth.uid())
  AND (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE (c.owner_id = auth.uid() AND c.client_id = member_presence.user_id)
         OR (c.client_id = auth.uid() AND c.owner_id = member_presence.user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.provider_profiles pp ON pp.id = c.provider_id
      WHERE (c.client_id = auth.uid() AND pp.user_id = member_presence.user_id)
         OR (pp.user_id = auth.uid() AND c.client_id = member_presence.user_id)
    )
  )
);