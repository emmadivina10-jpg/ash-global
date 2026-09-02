-- ============ ASH PROPERTY ============

CREATE TABLE public.property_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label_en text NOT NULL,
  label_fr text NOT NULL,
  kind text NOT NULL DEFAULT 'RENT',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.property_categories TO anon, authenticated;
GRANT ALL ON public.property_categories TO service_role;
ALTER TABLE public.property_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable" ON public.property_categories FOR SELECT USING (true);
CREATE POLICY "admins manage categories" ON public.property_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.property_categories (code, label_en, label_fr, kind, sort_order) VALUES
  ('STUDENT_HOUSING', 'Student housing', 'Logement étudiant', 'RENT', 1),
  ('ROOM', 'Room', 'Chambre', 'RENT', 2),
  ('APARTMENT', 'Apartment', 'Appartement', 'RENT', 3),
  ('HOUSE', 'House', 'Maison', 'RENT', 4),
  ('SHARED', 'Shared accommodation', 'Colocation', 'RENT', 5),
  ('SHORT_TERM', 'Short-term rental', 'Location courte durée', 'RENT', 6),
  ('COMMERCIAL', 'Commercial property', 'Local commercial', 'RENT', 7),
  ('FOR_SALE', 'Property for sale', 'Bien à vendre', 'SALE', 8),
  ('LAND', 'Land', 'Terrain', 'SALE', 9);

CREATE TABLE public.property_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_kind text NOT NULL DEFAULT 'LANDLORD',
  listing_kind text NOT NULL DEFAULT 'RENT',
  category text NOT NULL DEFAULT 'ROOM',
  title text NOT NULL,
  description text,
  country text NOT NULL DEFAULT 'CM',
  region text,
  city text NOT NULL,
  neighborhood text,
  postal_code text,
  university text,
  distance_km numeric,
  approx_lat numeric,
  approx_lng numeric,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XAF',
  price_period text NOT NULL DEFAULT 'YEAR',
  bedrooms integer NOT NULL DEFAULT 0,
  bathrooms integer NOT NULL DEFAULT 0,
  size_value numeric,
  size_unit text,
  land_use text,
  amenities text[] NOT NULL DEFAULT '{}',
  is_furnished boolean NOT NULL DEFAULT false,
  available_from date,
  status text NOT NULL DEFAULT 'ACTIVE',
  verification_status text NOT NULL DEFAULT 'BASIC',
  contact_phone text,
  contact_whatsapp text,
  view_count integer NOT NULL DEFAULT 0,
  inquiry_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_kind_chk CHECK (listing_kind IN ('RENT','SALE')),
  CONSTRAINT property_status_chk CHECK (status IN ('DRAFT','PENDING_REVIEW','ACTIVE','PAUSED','RENTED','SOLD','EXPIRED','REJECTED','ARCHIVED')),
  CONSTRAINT property_verif_chk CHECK (verification_status IN ('BASIC','IDENTITY_VERIFIED','AGENT_VERIFIED','INFO_VERIFIED','DOCUMENTS_REVIEWED'))
);
GRANT SELECT ON public.property_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_listings TO authenticated;
GRANT ALL ON public.property_listings TO service_role;
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;

CREATE INDEX property_listings_discovery_idx ON public.property_listings (status, listing_kind, category, city);
CREATE INDEX property_listings_owner_idx ON public.property_listings (owner_id);
CREATE INDEX property_listings_created_idx ON public.property_listings (created_at DESC);

CREATE POLICY "public reads active listings" ON public.property_listings FOR SELECT
  USING (status = 'ACTIVE' AND expires_at > now());
CREATE POLICY "owners read own listings" ON public.property_listings FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "admins read all listings" ON public.property_listings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owners create listings" ON public.property_listings FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owners update listings" ON public.property_listings FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owners delete listings" ON public.property_listings FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER property_listings_touch BEFORE UPDATE ON public.property_listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER property_categories_touch BEFORE UPDATE ON public.property_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.property_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_images TO authenticated;
GRANT ALL ON public.property_images TO service_role;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX property_images_listing_idx ON public.property_images (listing_id, sort_order);

CREATE OR REPLACE FUNCTION public.owns_property(_listing_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.property_listings p WHERE p.id = _listing_id AND p.owner_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.owns_property(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_property(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.property_is_public(_listing_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.property_listings p WHERE p.id = _listing_id AND p.status = 'ACTIVE' AND p.expires_at > now());
$$;
REVOKE ALL ON FUNCTION public.property_is_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.property_is_public(uuid) TO anon, authenticated, service_role;

CREATE POLICY "public reads images of active listings" ON public.property_images FOR SELECT
  USING (public.property_is_public(listing_id));
CREATE POLICY "owners read own images" ON public.property_images FOR SELECT TO authenticated
  USING (public.owns_property(listing_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owners write images" ON public.property_images FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(listing_id));
CREATE POLICY "owners update images" ON public.property_images FOR UPDATE TO authenticated
  USING (public.owns_property(listing_id)) WITH CHECK (public.owns_property(listing_id));
CREATE POLICY "owners delete images" ON public.property_images FOR DELETE TO authenticated
  USING (public.owns_property(listing_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.property_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
GRANT SELECT, INSERT, DELETE ON public.property_saves TO authenticated;
GRANT ALL ON public.property_saves TO service_role;
ALTER TABLE public.property_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage own saves" ON public.property_saves FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owners count saves" ON public.property_saves FOR SELECT TO authenticated
  USING (public.owns_property(listing_id));

CREATE TABLE public.property_viewing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'PENDING',
  response_note text,
  proposed_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT viewing_status_chk CHECK (status IN ('PENDING','ACCEPTED','DECLINED','RESCHEDULED','CANCELLED','COMPLETED'))
);
GRANT SELECT, INSERT, UPDATE ON public.property_viewing_requests TO authenticated;
GRANT ALL ON public.property_viewing_requests TO service_role;
ALTER TABLE public.property_viewing_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX property_viewings_owner_idx ON public.property_viewing_requests (owner_id, status);
CREATE INDEX property_viewings_requester_idx ON public.property_viewing_requests (requester_id);
CREATE POLICY "participants read viewings" ON public.property_viewing_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "participants update viewings" ON public.property_viewing_requests FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR owner_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR owner_id = auth.uid());
CREATE TRIGGER property_viewings_touch BEFORE UPDATE ON public.property_viewing_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.property_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  check_kind text NOT NULL,
  outcome text NOT NULL DEFAULT 'PENDING',
  reviewer text NOT NULL DEFAULT 'ASH',
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.property_verifications TO authenticated;
GRANT ALL ON public.property_verifications TO service_role;
ALTER TABLE public.property_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage verifications" ON public.property_verifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ RPCs ============

CREATE OR REPLACE FUNCTION public.record_property_view(_listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.property_listings
     SET view_count = view_count + 1
   WHERE id = _listing_id AND status = 'ACTIVE';
END;
$$;
REVOKE ALL ON FUNCTION public.record_property_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_property_view(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_property_viewing(_listing_id uuid, _requested_at timestamptz, _message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _listing public.property_listings;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); END IF;
  SELECT * INTO _listing FROM public.property_listings WHERE id = _listing_id;
  IF _listing.id IS NULL OR _listing.status <> 'ACTIVE' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'LISTING_UNAVAILABLE');
  END IF;
  IF _listing.owner_id = _uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OWN_LISTING');
  END IF;
  IF _requested_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PAST_DATE');
  END IF;
  IF (SELECT count(*) FROM public.property_viewing_requests
        WHERE requester_id = _uid AND created_at > now() - interval '1 hour') >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RATE_LIMITED');
  END IF;

  INSERT INTO public.property_viewing_requests (listing_id, requester_id, owner_id, requested_at, message)
  VALUES (_listing_id, _uid, _listing.owner_id, _requested_at, nullif(btrim(coalesce(_message,'')), ''))
  RETURNING id INTO _id;

  UPDATE public.property_listings SET inquiry_count = inquiry_count + 1 WHERE id = _listing_id;

  PERFORM public.notify_user(
    _listing.owner_id, 'PROPERTY', 'New viewing request',
    'Someone asked to view "' || _listing.title || '".',
    jsonb_build_object('listing_id', _listing_id, 'viewing_id', _id)
  );

  RETURN jsonb_build_object('ok', true, 'id', _id);
END;
$$;
REVOKE ALL ON FUNCTION public.request_property_viewing(uuid, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_property_viewing(uuid, timestamptz, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.respond_property_viewing(_viewing_id uuid, _status text, _note text, _proposed_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.property_viewing_requests;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); END IF;
  SELECT * INTO _row FROM public.property_viewing_requests WHERE id = _viewing_id;
  IF _row.id IS NULL OR _row.owner_id <> _uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_ALLOWED');
  END IF;
  IF _status NOT IN ('ACCEPTED','DECLINED','RESCHEDULED','COMPLETED') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'BAD_STATUS');
  END IF;

  UPDATE public.property_viewing_requests
     SET status = _status,
         response_note = nullif(btrim(coalesce(_note,'')), ''),
         proposed_at = _proposed_at,
         responded_at = now()
   WHERE id = _viewing_id;

  PERFORM public.notify_user(
    _row.requester_id, 'PROPERTY', 'Viewing request ' || lower(_status),
    'The owner responded to your viewing request.',
    jsonb_build_object('listing_id', _row.listing_id, 'viewing_id', _viewing_id, 'status', _status)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.respond_property_viewing(uuid, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_property_viewing(uuid, text, text, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.expire_property_listings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  UPDATE public.property_listings SET status = 'EXPIRED'
   WHERE status = 'ACTIVE' AND expires_at <= now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_property_listings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_property_listings() TO service_role;