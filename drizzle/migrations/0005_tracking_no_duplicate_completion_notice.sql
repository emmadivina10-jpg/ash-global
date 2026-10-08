CREATE OR REPLACE FUNCTION public.end_booking_tracking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('CONFIRMED','IN_PROGRESS') AND OLD.status IN ('CONFIRMED','IN_PROGRESS') THEN
    NEW.trip_status := 'ENDED';
    DELETE FROM booking_live_locations WHERE booking_id = NEW.id;
  END IF;
  IF NEW.trip_status = 'ARRIVED' AND OLD.trip_status <> 'ARRIVED' THEN
    DELETE FROM booking_live_locations WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;