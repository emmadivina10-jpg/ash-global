ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS trip_status text NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS trip_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz;

-- Only the latest point per booking is kept; no movement history.
CREATE TABLE public.booking_live_locations (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_m double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_live_locations TO authenticated;
GRANT ALL ON public.booking_live_locations TO service_role;
ALTER TABLE public.booking_live_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer or provider of an active trip can read location"
ON public.booking_live_locations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  LEFT JOIN public.provider_profiles p ON p.id = b.provider_id
  WHERE b.id = booking_id
    AND b.status IN ('CONFIRMED','IN_PROGRESS')
    AND b.trip_status IN ('ON_THE_WAY','ARRIVED')
    AND (b.client_id = auth.uid() OR p.user_id = auth.uid())
));

CREATE OR REPLACE FUNCTION public.update_trip_status(_booking_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; owner uuid;
BEGIN
  IF _status NOT IN ('ON_THE_WAY','ARRIVED') THEN RETURN jsonb_build_object('ok',false,'error','INVALID_STATUS'); END IF;
  SELECT * INTO b FROM bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND'); END IF;
  SELECT user_id INTO owner FROM provider_profiles WHERE id = b.provider_id;
  IF owner IS DISTINCT FROM auth.uid() THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND'); END IF;
  IF b.status NOT IN ('CONFIRMED','IN_PROGRESS') OR b.paid_at IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','BOOKING_NOT_ACTIVE'); END IF;
  IF _status = 'ON_THE_WAY' AND b.trip_status NOT IN ('NOT_STARTED','ON_THE_WAY') THEN
    RETURN jsonb_build_object('ok',false,'error','INVALID_TRANSITION'); END IF;
  IF _status = 'ARRIVED' AND b.trip_status NOT IN ('ON_THE_WAY','ARRIVED') THEN
    RETURN jsonb_build_object('ok',false,'error','INVALID_TRANSITION'); END IF;
  IF b.trip_status = _status THEN RETURN jsonb_build_object('ok',true,'status',_status); END IF;

  UPDATE bookings SET trip_status = _status,
    trip_started_at = CASE WHEN _status='ON_THE_WAY' THEN now() ELSE trip_started_at END,
    arrived_at = CASE WHEN _status='ARRIVED' THEN now() ELSE arrived_at END
  WHERE id = _booking_id;

  INSERT INTO notifications (user_id, category, title, body, data, actor_id)
  VALUES (b.client_id, 'booking',
    CASE WHEN _status='ON_THE_WAY' THEN 'Your provider is on the way.' ELSE 'Your provider has arrived.' END,
    CASE WHEN _status='ON_THE_WAY' THEN 'Open Track Provider to follow them.' ELSE 'Please provide your verification code to the provider to complete the service.' END,
    jsonb_build_object('booking_id', b.id, 'trip_status', _status), auth.uid());
  RETURN jsonb_build_object('ok',true,'status',_status);
END $$;
REVOKE ALL ON FUNCTION public.update_trip_status(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_trip_status(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.share_booking_location(_booking_id uuid, _lat double precision, _lng double precision, _accuracy double precision)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; owner uuid;
BEGIN
  IF _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_POSITION'); END IF;
  SELECT id, provider_id, status, trip_status INTO b FROM bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND'); END IF;
  SELECT user_id INTO owner FROM provider_profiles WHERE id = b.provider_id;
  IF owner IS DISTINCT FROM auth.uid() THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND'); END IF;
  IF b.status NOT IN ('CONFIRMED','IN_PROGRESS') OR b.trip_status <> 'ON_THE_WAY' THEN
    RETURN jsonb_build_object('ok',false,'error','TRACKING_NOT_ACTIVE'); END IF;
  INSERT INTO booking_live_locations (booking_id, lat, lng, accuracy_m, updated_at)
  VALUES (_booking_id, _lat, _lng, _accuracy, now())
  ON CONFLICT (booking_id) DO UPDATE SET lat=EXCLUDED.lat, lng=EXCLUDED.lng, accuracy_m=EXCLUDED.accuracy_m, updated_at=now();
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.share_booking_location(uuid,double precision,double precision,double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_booking_location(uuid,double precision,double precision,double precision) TO authenticated;

-- Stop tracking and wipe the last point when a booking leaves the active state.
CREATE OR REPLACE FUNCTION public.end_booking_tracking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('CONFIRMED','IN_PROGRESS') AND OLD.status IN ('CONFIRMED','IN_PROGRESS') THEN
    NEW.trip_status := 'ENDED';
    DELETE FROM booking_live_locations WHERE booking_id = NEW.id;
    IF NEW.status = 'COMPLETED' THEN
      INSERT INTO notifications (user_id, category, title, body, data)
      VALUES (NEW.client_id, 'booking', 'Your booking has been completed.', NEW.service_title, jsonb_build_object('booking_id', NEW.id));
    END IF;
  END IF;
  -- Leaving "arrived" for "on the way" again also stops sharing.
  IF NEW.trip_status = 'ARRIVED' AND OLD.trip_status <> 'ARRIVED' THEN
    DELETE FROM booking_live_locations WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_end_tracking BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.end_booking_tracking();