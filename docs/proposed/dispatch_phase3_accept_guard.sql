-- PROPOSED (NOT APPLIED): ASH Logistics phase 3 — accept-time rider check and safe live location.
-- Additive only. Touches only dispatch_* functions. No payment, wallet, Stripe, MTN, Orange Money,
-- TchokoPay, referral or financial objects are referenced.

-- 1. A rider can accept only while approved, active and available (re-checked at the moment of accepting).
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

-- 2. Rider shares position only while on an accepted delivery (foreground browser GPS).
CREATE OR REPLACE FUNCTION public.dispatch_rider_update_location(_lat double precision, _lng double precision)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _lat IS NULL OR _lng IS NULL OR _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dispatch_jobs WHERE rider_user_id = auth.uid()
      AND status IN ('ACCEPTED','PICKUP_CONFIRMED','IN_TRANSIT')) THEN RAISE EXCEPTION 'NOT_ON_DELIVERY'; END IF;
  UPDATE public.dispatch_riders SET latitude = _lat, longitude = _lng, updated_at = now() WHERE user_id = auth.uid();
END $$;

-- 3. Customer, shop or staff of one active delivery read the rider's first name, vehicle and last position.
CREATE OR REPLACE FUNCTION public.dispatch_job_rider_location(_job uuid)
RETURNS TABLE(rider_name text, vehicle text, plate text, latitude double precision, longitude double precision, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT split_part(coalesce(r.full_name,''), ' ', 1), r.vehicle_type, r.vehicle_plate, r.latitude, r.longitude, r.updated_at
  FROM public.dispatch_jobs j JOIN public.dispatch_riders r ON r.user_id = j.rider_user_id
  WHERE j.id = _job AND j.status IN ('ACCEPTED','PICKUP_CONFIRMED','IN_TRANSIT')
    AND (j.customer_id = auth.uid() OR j.vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
$$;

REVOKE ALL ON FUNCTION public.dispatch_rider_update_location(double precision, double precision),
  public.dispatch_job_rider_location(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_rider_update_location(double precision, double precision),
  public.dispatch_job_rider_location(uuid) TO authenticated;
