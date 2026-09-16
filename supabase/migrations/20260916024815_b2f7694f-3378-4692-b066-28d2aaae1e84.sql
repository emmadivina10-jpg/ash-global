ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_party_present;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_party_present CHECK (
  provider_id IS NOT NULL
  OR (listing_id IS NOT NULL AND owner_id IS NOT NULL)
  OR group_id IS NOT NULL
  OR (owner_id IS NOT NULL AND client_id IS NOT NULL)
);

DROP POLICY IF EXISTS "Participants delete conversations" ON public.conversations;
CREATE POLICY "Participants delete conversations"
ON public.conversations FOR DELETE TO authenticated
USING (
  client_id = auth.uid()
  OR owner_id = auth.uid()
  OR public.is_provider_owner(provider_id)
  OR (group_id IS NOT NULL AND public.is_group_owner(group_id))
);