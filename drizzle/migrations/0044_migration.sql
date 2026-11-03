CREATE OR REPLACE FUNCTION public.notify_staff_rider_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.verification_status = 'PENDING' AND (TG_OP = 'INSERT' OR OLD.verification_status IS DISTINCT FROM 'PENDING') THEN
    INSERT INTO public.staff_notifications (department, type, title, body, link)
    VALUES
      ('TRUST', 'RIDER_VERIFICATION', 'New rider documents to review',
       coalesce(NEW.full_name, 'A rider') || ' submitted identification for ASH Logistics.', '/console/riders'),
      ('OPERATIONS', 'RIDER_VERIFICATION', 'New rider documents to review',
       coalesce(NEW.full_name, 'A rider') || ' submitted identification for ASH Logistics.', '/console/riders');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_staff_rider_submission() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_staff_rider_submission ON public.dispatch_riders;
CREATE TRIGGER trg_notify_staff_rider_submission AFTER INSERT OR UPDATE OF verification_status ON public.dispatch_riders
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_rider_submission();
-- Backfill an alert for riders already waiting
INSERT INTO public.staff_notifications (department, type, title, body, link)
SELECT d, 'RIDER_VERIFICATION', 'New rider documents to review',
  coalesce(r.full_name, 'A rider') || ' submitted identification for ASH Logistics.', '/console/riders'
FROM public.dispatch_riders r CROSS JOIN (VALUES ('TRUST'),('OPERATIONS')) v(d)
WHERE r.verification_status = 'PENDING';