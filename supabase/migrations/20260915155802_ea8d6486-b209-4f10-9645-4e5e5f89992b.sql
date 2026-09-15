CREATE POLICY "Group members read conversations" ON public.conversations FOR SELECT TO authenticated
  USING (group_id IS NOT NULL AND public.is_group_member(group_id));
CREATE POLICY "Group members update conversations" ON public.conversations FOR UPDATE TO authenticated
  USING (group_id IS NOT NULL AND public.is_group_member(group_id))
  WITH CHECK (group_id IS NOT NULL AND public.is_group_member(group_id));