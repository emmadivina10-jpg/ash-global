CREATE TABLE public.booking_party_locations (
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  party text NOT NULL CHECK (party IN ('CUSTOMER','PROVIDER')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_m double precision,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, party)
);
GRANT SELECT ON public.booking_party_locations TO authenticated;
GRANT ALL ON public.booking_party_locations TO service_role;
ALTER TABLE public.booking_party_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties of an active booking can read positions" ON public.booking_party_locations
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.bookings b LEFT JOIN public.provider_profiles p ON p.id = b.provider_id
  WHERE b.id = booking_party_locations.booking_id
    AND b.status IN ('CONFIRMED','IN_PROGRESS')
    AND (b.client_id = auth.uid() OR p.user_id = auth.uid())));

CREATE OR REPLACE FUNCTION public.share_booking_party_location(_booking_id uuid, _lat double precision, _lng double precision, _accuracy double precision)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; owner uuid; who text;
BEGIN
  IF _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_POSITION'); END IF;
  SELECT id, client_id, provider_id, status INTO b FROM bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_FOUND'); END IF;
  SELECT user_id INTO owner FROM provider_profiles WHERE id = b.provider_id;
  IF b.client_id = auth.uid() THEN who := 'CUSTOMER';
  ELSIF owner = auth.uid() THEN who := 'PROVIDER';
  ELSE RETURN jsonb_build_object('ok',false,'error','NOT_FOUND'); END IF;
  IF b.status NOT IN ('CONFIRMED','IN_PROGRESS') THEN RETURN jsonb_build_object('ok',false,'error','TRACKING_NOT_ACTIVE'); END IF;
  INSERT INTO booking_party_locations (booking_id, party, lat, lng, accuracy_m, updated_at)
  VALUES (_booking_id, who, _lat, _lng, _accuracy, now())
  ON CONFLICT (booking_id, party) DO UPDATE SET lat=EXCLUDED.lat, lng=EXCLUDED.lng, accuracy_m=EXCLUDED.accuracy_m, updated_at=now();
  RETURN jsonb_build_object('ok',true,'party',who);
END $$;
REVOKE ALL ON FUNCTION public.share_booking_party_location(uuid,double precision,double precision,double precision) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.share_booking_party_location(uuid,double precision,double precision,double precision) TO authenticated;

-- Positions are removed when the booking ends.
CREATE OR REPLACE FUNCTION public.clear_party_locations() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('CONFIRMED','IN_PROGRESS') THEN DELETE FROM booking_party_locations WHERE booking_id = NEW.id; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER clear_party_locations_on_end AFTER UPDATE OF status ON public.bookings
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.clear_party_locations();