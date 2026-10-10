ALTER POLICY "Update own history preferences" ON public.booking_history_preferences USING (user_id = auth.uid() AND state = 'ARCHIVED');
ALTER POLICY "Restore own history preferences" ON public.booking_history_preferences USING (user_id = auth.uid() AND state = 'ARCHIVED');
CREATE OR REPLACE FUNCTION public.guard_booking_history_preference() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = NEW.booking_id AND b.status::text IN ('COMPLETED','SETTLED','CANCELLED','DECLINED','NO_SHOW','REFUNDED','PAYMENT_FAILED','PAYMENT_EXPIRED')) THEN
  RAISE EXCEPTION 'Only finished or failed bookings can be removed from history';
 END IF;
 IF TG_OP = 'UPDATE' AND (OLD.user_id <> NEW.user_id OR OLD.booking_id <> NEW.booking_id OR OLD.state = 'DELETED') THEN
  RAISE EXCEPTION 'History ownership and permanent removal cannot be changed';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER guard_booking_history_preference BEFORE INSERT OR UPDATE ON public.booking_history_preferences FOR EACH ROW EXECUTE FUNCTION public.guard_booking_history_preference();