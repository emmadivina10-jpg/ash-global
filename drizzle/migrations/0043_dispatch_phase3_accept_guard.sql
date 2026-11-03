-- PROPOSED (NOT APPLIED): ASH Logistics phase 3 — accept-time rider check and private live location.
-- Additive only. Touches only dispatch_* objects. No payment, wallet, Stripe, MTN, Orange Money,
-- TchokoPay, referral or financial objects are referenced.

-- 1. A rider can accept only while approved, active and available. The rider row is locked
--    together with the delivery row, so availability cannot change between check and accept.
CREATE OR REPLACE FUNCTION public.dispatch_rider_respond(_job uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.rider_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.status <> 'ASSIGNED' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF _accept THEN
    PERFORM 1 FROM public.dispatch_riders r WHERE r.user_id = auth.uid()
      AND r.is_active AND r.verification_status = 'VERIFIED' AND r.availability_status = 'AVAILABLE' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'RIDER_UNAVAILABLE'; END IF;
    UPDATE public.dispatch_job_assignments SET status = 'ACCEPTED', accepted_at = now() WHERE delivery_id = _job AND rider_user_id = auth.uid() AND status = 'OPEN';
    UPDATE public.dispatch_jobs SET status = 'ACCEPTED' WHERE id = _job;
    PERFORM public.dispatch_log(_job, 'ACCEPTED', 'RIDER', NULL);
  ELSE
    UPDATE public.dispatch_job_assignments SET status = 'REJECTED', rejected_at = now() WHERE delivery_id = _job AND rider_user_id = auth.uid() AND status = 'OPEN';
    UPDATE public.dispatch_jobs SET status = 'REJECTED', rider_user_id = NULL WHERE id = _job;
    PERFORM public.dispatch_log(_job, 'REJECTED', 'RIDER', NULL);
  END IF;
END $$;

-- 2. Private per-delivery position. No direct reads or writes for app users (RLS on, no policies).
CREATE TABLE public.dispatch_job_live_locations (
  delivery_id uuid PRIMARY KEY REFERENCES public.dispatch_jobs(id) ON DELETE CASCADE,
  rider_user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy_m double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.dispatch_job_live_locations TO service_role;
REVOKE ALL ON public.dispatch_job_live_locations FROM PUBLIC, anon, authenticated;
ALTER TABLE public.dispatch_job_live_locations ENABLE ROW LEVEL SECURITY;

-- 3. Assigned rider shares position for one active delivery (foreground browser GPS).
CREATE OR REPLACE FUNCTION public.dispatch_rider_update_location(_job uuid, _lat double precision, _lng double precision, _accuracy double precision DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _lat IS NULL OR _lng IS NULL OR _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180
     OR (_accuracy IS NOT NULL AND _accuracy < 0) THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  PERFORM 1 FROM public.dispatch_jobs WHERE id = _job AND rider_user_id = auth.uid()
    AND status IN ('ACCEPTED','PICKUP_CONFIRMED','IN_TRANSIT') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ON_DELIVERY'; END IF;
  INSERT INTO public.dispatch_job_live_locations(delivery_id, rider_user_id, latitude, longitude, accuracy_m, updated_at)
  VALUES (_job, auth.uid(), _lat, _lng, _accuracy, now())
  ON CONFLICT (delivery_id) DO UPDATE SET rider_user_id = EXCLUDED.rider_user_id, latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude, accuracy_m = EXCLUDED.accuracy_m, updated_at = now();
END $$;

-- 4. Rider explicitly stops sharing.
CREATE OR REPLACE FUNCTION public.dispatch_rider_stop_location(_job uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.dispatch_job_live_locations WHERE delivery_id = _job AND rider_user_id = auth.uid();
$$;

-- 5. Customer, assigned rider, the delivery's shop, or ASH operations staff read one active delivery's position.
CREATE OR REPLACE FUNCTION public.dispatch_job_rider_location(_job uuid)
RETURNS TABLE(rider_name text, vehicle text, plate text, latitude double precision, longitude double precision, accuracy_m double precision, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT split_part(coalesce(r.full_name,''), ' ', 1), r.vehicle_type, r.vehicle_plate, l.latitude, l.longitude, l.accuracy_m, l.updated_at
  FROM public.dispatch_jobs j
  JOIN public.dispatch_job_live_locations l ON l.delivery_id = j.id AND l.rider_user_id = j.rider_user_id
  JOIN public.dispatch_riders r ON r.user_id = j.rider_user_id
  WHERE j.id = _job AND j.status IN ('ACCEPTED','PICKUP_CONFIRMED','IN_TRANSIT')
    AND (j.customer_id = auth.uid() OR j.vendor_id = auth.uid() OR j.rider_user_id = auth.uid()
         OR public.has_role(auth.uid(), 'admin'))
$$;

-- 6. Erase the position as soon as a delivery ends, is cancelled, rejected or loses its rider.
CREATE OR REPLACE FUNCTION public.dispatch_clear_live_location()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('ACCEPTED','PICKUP_CONFIRMED','IN_TRANSIT')
     OR NEW.rider_user_id IS DISTINCT FROM OLD.rider_user_id THEN
    DELETE FROM public.dispatch_job_live_locations WHERE delivery_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER dispatch_jobs_clear_live_location
  AFTER UPDATE OF status, rider_user_id ON public.dispatch_jobs
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_clear_live_location();

REVOKE ALL ON FUNCTION public.dispatch_rider_update_location(uuid, double precision, double precision, double precision),
  public.dispatch_rider_stop_location(uuid), public.dispatch_job_rider_location(uuid),
  public.dispatch_clear_live_location() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatch_clear_live_location() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_rider_update_location(uuid, double precision, double precision, double precision),
  public.dispatch_rider_stop_location(uuid), public.dispatch_job_rider_location(uuid) TO authenticated;
