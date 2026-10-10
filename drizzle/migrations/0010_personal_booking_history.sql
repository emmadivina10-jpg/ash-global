CREATE TABLE public.booking_history_preferences (
 user_id uuid NOT NULL,
 booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'ARCHIVED' CHECK (state IN ('ARCHIVED', 'DELETED')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, booking_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_history_preferences TO authenticated;
GRANT ALL ON public.booking_history_preferences TO service_role;
ALTER TABLE public.booking_history_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own history preferences" ON public.booking_history_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Create own booking history preferences" ON public.booking_history_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.client_id = auth.uid() OR public.is_provider_owner(b.provider_id))));
CREATE POLICY "Update own history preferences" ON public.booking_history_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Restore own history preferences" ON public.booking_history_preferences FOR DELETE TO authenticated USING (user_id = auth.uid());
COMMENT ON TABLE public.booking_history_preferences IS 'Personal list visibility only. Booking, payment, receipt and counterparty records are retained.';