-- Independent musician profiles and private, manually reviewed portfolio media.
-- This migration does not change vendor or payment records.
CREATE TABLE public.musician_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 100),
  biography text NOT NULL DEFAULT '' CHECK (char_length(biography) <= 2000),
  instruments text[] NOT NULL CHECK (cardinality(instruments) BETWEEN 1 AND 10),
  genres text[] NOT NULL DEFAULT '{}' CHECK (cardinality(genres) <= 15),
  experience text NOT NULL DEFAULT '' CHECK (char_length(experience) <= 1000),
  city text NOT NULL CHECK (char_length(btrim(city)) BETWEEN 1 AND 100),
  country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  accepting_enquiries boolean NOT NULL DEFAULT true,
  online boolean NOT NULL DEFAULT false,
  review_status text NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.musician_contacts (
  musician_id uuid PRIMARY KEY REFERENCES public.musician_profiles(id) ON DELETE CASCADE,
  email text CHECK (char_length(email) <= 320),
  phone text CHECK (char_length(phone) <= 50)
);

CREATE TABLE public.musician_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  musician_id uuid NOT NULL REFERENCES public.musician_profiles(id) ON DELETE CASCADE,
  object_path text NOT NULL UNIQUE,
  media_type text NOT NULL CHECK (media_type IN ('PHOTO','VIDEO','AUDIO')),
  review_status text NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.musician_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  musician_id uuid NOT NULL REFERENCES public.musician_profiles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
  event_date date,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','DECLINED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.musician_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musician_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musician_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musician_enquiries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.musician_profiles, public.musician_contacts, public.musician_media,
  public.musician_enquiries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.musician_profiles, public.musician_media TO anon, authenticated;
GRANT INSERT ON public.musician_profiles, public.musician_media TO authenticated;
GRANT UPDATE (display_name, biography, instruments, genres, experience, city, country,
  accepting_enquiries, online) ON public.musician_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.musician_contacts TO authenticated;
GRANT SELECT ON public.musician_enquiries TO authenticated;
GRANT ALL ON public.musician_profiles, public.musician_contacts, public.musician_media,
  public.musician_enquiries TO service_role;

CREATE POLICY musician_profiles_read_public ON public.musician_profiles FOR SELECT TO anon
USING (review_status = 'APPROVED' AND safety.ugc_visible(user_id));
CREATE POLICY musician_profiles_read ON public.musician_profiles FOR SELECT TO authenticated
USING (
  (review_status = 'APPROVED' AND safety.ugc_visible(user_id))
  OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY musician_profiles_insert ON public.musician_profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND review_status = 'PENDING' AND safety.identity_access_allowed(auth.uid()));
CREATE POLICY musician_profiles_update ON public.musician_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND safety.identity_access_allowed(auth.uid()))
WITH CHECK (user_id = auth.uid() AND safety.identity_access_allowed(auth.uid()));

CREATE FUNCTION public.musician_profile_recheck() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF (NEW.display_name, NEW.biography, NEW.instruments, NEW.genres, NEW.experience, NEW.city, NEW.country)
     IS DISTINCT FROM
     (OLD.display_name, OLD.biography, OLD.instruments, OLD.genres, OLD.experience, OLD.city, OLD.country) THEN
    NEW.review_status := 'PENDING';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.musician_profile_recheck() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER musician_profile_recheck BEFORE UPDATE ON public.musician_profiles
FOR EACH ROW EXECUTE FUNCTION public.musician_profile_recheck();

CREATE POLICY musician_contacts_owner ON public.musician_contacts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.musician_profiles p WHERE p.id = musician_id
  AND p.user_id = auth.uid()) AND safety.identity_access_allowed(auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.musician_profiles p WHERE p.id = musician_id
  AND p.user_id = auth.uid()) AND safety.identity_access_allowed(auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('musician-portfolio', 'musician-portfolio', false, 52428800,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime',
        'audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm']);

CREATE POLICY musician_media_read_public ON public.musician_media FOR SELECT TO anon
USING (musician_media.review_status = 'APPROVED' AND EXISTS (
  SELECT 1 FROM public.musician_profiles p WHERE p.id = musician_id
    AND p.review_status = 'APPROVED' AND safety.ugc_visible(p.user_id)
));
CREATE POLICY musician_media_read ON public.musician_media FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.musician_profiles p WHERE p.id = musician_id AND
  ((musician_media.review_status = 'APPROVED' AND p.review_status = 'APPROVED' AND safety.ugc_visible(p.user_id))
   OR (auth.uid() IS NOT NULL AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
));
CREATE POLICY musician_media_submit ON public.musician_media FOR INSERT TO authenticated
WITH CHECK (
  review_status = 'PENDING'
  AND (storage.foldername(object_path))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.musician_profiles p WHERE p.id = musician_id AND p.user_id = auth.uid())
  AND safety.identity_access_allowed(auth.uid())
);
CREATE POLICY musician_portfolio_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'musician-portfolio' AND (storage.foldername(name))[1] = auth.uid()::text
  AND safety.identity_access_allowed(auth.uid())
  AND EXISTS (SELECT 1 FROM public.musician_profiles p WHERE p.user_id = auth.uid()));
-- An approved path must not be overwritten or deleted and recreated with unreviewed bytes.
CREATE POLICY musician_portfolio_immutable_update ON storage.objects AS RESTRICTIVE
FOR UPDATE TO authenticated USING (bucket_id <> 'musician-portfolio')
WITH CHECK (bucket_id <> 'musician-portfolio');
CREATE POLICY musician_portfolio_immutable_delete ON storage.objects AS RESTRICTIVE
FOR DELETE TO authenticated USING (bucket_id <> 'musician-portfolio' OR NOT EXISTS (
  SELECT 1 FROM public.musician_media m WHERE m.object_path = storage.objects.name
));
CREATE POLICY musician_portfolio_delete_unsubmitted ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'musician-portfolio' AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT EXISTS (SELECT 1 FROM public.musician_media m WHERE m.object_path = storage.objects.name));
CREATE POLICY musician_portfolio_read_public ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'musician-portfolio' AND EXISTS (
  SELECT 1 FROM public.musician_media m JOIN public.musician_profiles p ON p.id = m.musician_id
  WHERE m.object_path = name AND m.review_status = 'APPROVED'
    AND p.review_status = 'APPROVED' AND safety.ugc_visible(p.user_id)
));
CREATE POLICY musician_portfolio_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'musician-portfolio' AND (
  (auth.uid() IS NOT NULL AND ((storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')))
  OR EXISTS (
    SELECT 1 FROM public.musician_media m JOIN public.musician_profiles p ON p.id = m.musician_id
    WHERE m.object_path = name AND m.review_status = 'APPROVED'
      AND p.review_status = 'APPROVED' AND safety.ugc_visible(p.user_id)
  )
));

CREATE POLICY musician_enquiries_read ON public.musician_enquiries FOR SELECT TO authenticated
USING (safety.identity_access_allowed(auth.uid()) AND (
  customer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.musician_profiles p WHERE p.id = musician_id AND p.user_id = auth.uid()
  )
));

CREATE FUNCTION public.submit_musician_enquiry(_musician_id uuid, _message text, _event_date date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE result_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT safety.identity_access_allowed(auth.uid()) THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.musician_profiles p WHERE p.id = _musician_id
    AND p.user_id <> auth.uid() AND p.review_status = 'APPROVED'
    AND p.accepting_enquiries AND safety.ugc_visible(p.user_id)) THEN
    RAISE EXCEPTION 'Musician unavailable';
  END IF;
  INSERT INTO public.musician_enquiries (musician_id, customer_id, message, event_date)
  VALUES (_musician_id, auth.uid(), _message, _event_date) RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;

CREATE FUNCTION public.respond_musician_enquiry(_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT safety.identity_access_allowed(auth.uid())
     OR _status NOT IN ('ACCEPTED', 'DECLINED') THEN
    RAISE EXCEPTION 'Invalid response';
  END IF;
  UPDATE public.musician_enquiries e SET status = _status, updated_at = now()
  WHERE e.id = _id AND e.status = 'PENDING' AND EXISTS (
    SELECT 1 FROM public.musician_profiles p WHERE p.id = e.musician_id AND p.user_id = auth.uid()
  );
  IF NOT FOUND THEN RAISE EXCEPTION 'Enquiry unavailable'; END IF;
END;
$$;

CREATE FUNCTION public.review_musician_content(_kind text, _id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin')
     OR NOT safety.identity_access_allowed(auth.uid()) OR _status NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Review not permitted';
  END IF;
  IF _kind = 'PROFILE' THEN
    UPDATE public.musician_profiles SET review_status = _status WHERE id = _id AND review_status = 'PENDING';
  ELSIF _kind = 'MEDIA' THEN
    UPDATE public.musician_media m SET review_status = _status WHERE m.id = _id AND m.review_status = 'PENDING'
      AND EXISTS (SELECT 1 FROM storage.objects o
        WHERE o.bucket_id = 'musician-portfolio' AND o.name = m.object_path);
  ELSE
    RAISE EXCEPTION 'Invalid review type';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission unavailable'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_musician_enquiry(uuid, text, date),
  public.respond_musician_enquiry(uuid, text), public.review_musician_content(text, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_musician_enquiry(uuid, text, date),
  public.respond_musician_enquiry(uuid, text), public.review_musician_content(text, uuid, text)
  TO authenticated;
