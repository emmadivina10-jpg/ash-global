-- Admin read access for payment event auditing
GRANT SELECT ON public.payment_events TO authenticated;
DROP POLICY IF EXISTS "Admins can read payment events" ON public.payment_events;
CREATE POLICY "Admins can read payment events"
  ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Explicit admin-only role management (previously service-role only, no policy path)
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));