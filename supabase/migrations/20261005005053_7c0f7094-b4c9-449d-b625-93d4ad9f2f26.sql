CREATE POLICY "Staff console only" ON public.employee_terms_acceptance FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Staff console only" ON public.staff_notifications FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Staff console only" ON public.ticket_internal_notes FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Staff console only" ON public.staff_direct_messages FOR ALL TO authenticated USING (false) WITH CHECK (false);