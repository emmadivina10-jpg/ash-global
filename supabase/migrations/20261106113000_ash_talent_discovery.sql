-- Discovery-only musician rates, favorites, and mutually confirmed completed-gig reviews.
-- No vendor marketplace, wallet, or payment tables are modified.
ALTER TABLE public.musician_profiles
  ADD COLUMN hourly_rate_minor bigint,
  ADD COLUMN rate_currency text,
  ADD CONSTRAINT musician_rate_pair CHECK (
    (hourly_rate_minor IS NULL AND rate_currency IS NULL)
    OR (hourly_rate_minor > 0 AND hourly_rate_minor <= 1000000000 AND rate_currency IN ('CAD', 'XAF'))
  );
GRANT UPDATE (hourly_rate_minor, rate_currency) ON public.musician_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.musician_profile_recheck() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF (NEW.display_name, NEW.biography, NEW.instruments, NEW.genres, NEW.experience,
      NEW.city, NEW.country, NEW.hourly_rate_minor, NEW.rate_currency)
     IS DISTINCT FROM
     (OLD.display_name, OLD.biography, OLD.instruments, OLD.genres, OLD.experience,
      OLD.city, OLD.country, OLD.hourly_rate_minor, OLD.rate_currency) THEN
    NEW.review_status := 'PENDING';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.musician_enquiries
  ADD COLUMN completed_by_customer boolean NOT NULL DEFAULT false,
  ADD COLUMN completed_by_musician boolean NOT NULL DEFAULT false;
ALTER TABLE public.musician_enquiries
  DROP CONSTRAINT musician_enquiries_status_check,
  ADD CONSTRAINT musician_enquiries_status_check
    CHECK (status IN ('PENDING','ACCEPTED','DECLINED','COMPLETED'));

CREATE TABLE public.musician_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  musician_id uuid NOT NULL REFERENCES public.musician_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, musician_id)
);
ALTER TABLE public.musician_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.musician_favorites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.musician_favorites TO authenticated;
CREATE POLICY musician_favorites_read_own ON public.musician_favorites FOR SELECT TO authenticated
USING (user_id = auth.uid() AND safety.identity_access_allowed(auth.uid()));
CREATE POLICY musician_favorites_insert_own ON public.musician_favorites FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND safety.identity_access_allowed(auth.uid())
  AND EXISTS (SELECT 1 FROM public.musician_profiles p WHERE p.id = musician_id
    AND p.review_status = 'APPROVED' AND safety.ugc_visible(p.user_id))
);
CREATE POLICY musician_favorites_delete_own ON public.musician_favorites FOR DELETE TO authenticated
USING (user_id = auth.uid() AND safety.identity_access_allowed(auth.uid()));

CREATE TABLE public.musician_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL UNIQUE REFERENCES public.musician_enquiries(id) ON DELETE CASCADE,
  musician_id uuid NOT NULL REFERENCES public.musician_profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text NOT NULL DEFAULT '' CHECK (char_length(review) <= 1200),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.musician_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.musician_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.musician_reviews TO anon, authenticated;
CREATE POLICY musician_reviews_read_public ON public.musician_reviews FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.musician_profiles p WHERE p.id = musician_id
  AND p.review_status = 'APPROVED' AND safety.ugc_visible(p.user_id)));

CREATE FUNCTION public.get_musician_stats(_musician_ids uuid[])
RETURNS TABLE(musician_id uuid, rating_average numeric, review_count bigint, booking_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT p.id,
    coalesce(round(avg(r.rating)::numeric, 1), 0),
    count(DISTINCT r.id),
    count(DISTINCT e.id) FILTER (WHERE e.status IN ('ACCEPTED', 'COMPLETED'))
  FROM public.musician_profiles p
  LEFT JOIN public.musician_reviews r ON r.musician_id = p.id
  LEFT JOIN public.musician_enquiries e ON e.musician_id = p.id
  WHERE p.id = ANY(_musician_ids) AND p.review_status = 'APPROVED'
    AND safety.ugc_visible(p.user_id)
  GROUP BY p.id
$$;

CREATE FUNCTION public.confirm_musician_gig_completed(_enquiry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE is_musician boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT safety.identity_access_allowed(auth.uid()) THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT p.user_id = auth.uid() INTO is_musician
  FROM public.musician_enquiries e JOIN public.musician_profiles p ON p.id = e.musician_id
  WHERE e.id = _enquiry_id AND e.status = 'ACCEPTED' FOR UPDATE OF e;
  IF NOT FOUND THEN RAISE EXCEPTION 'Accepted gig unavailable'; END IF;
  IF is_musician THEN
    UPDATE public.musician_enquiries SET completed_by_musician = true,
      status = CASE WHEN completed_by_customer THEN 'COMPLETED' ELSE status END,
      updated_at = now() WHERE id = _enquiry_id;
  ELSE
    UPDATE public.musician_enquiries SET completed_by_customer = true,
      status = CASE WHEN completed_by_musician THEN 'COMPLETED' ELSE status END,
      updated_at = now() WHERE id = _enquiry_id AND customer_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Accepted gig unavailable'; END IF;
  END IF;
END;
$$;

CREATE FUNCTION public.create_musician_review(_enquiry_id uuid, _rating integer, _review text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE result_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT safety.identity_access_allowed(auth.uid())
     OR _rating NOT BETWEEN 1 AND 5 OR char_length(coalesce(_review, '')) > 1200 THEN
    RAISE EXCEPTION 'Invalid review';
  END IF;
  INSERT INTO public.musician_reviews (enquiry_id, musician_id, reviewer_id, rating, review)
  SELECT e.id, e.musician_id, auth.uid(), _rating, coalesce(_review, '')
  FROM public.musician_enquiries e JOIN public.musician_profiles p ON p.id = e.musician_id
  WHERE e.id = _enquiry_id AND e.customer_id = auth.uid() AND e.status = 'COMPLETED'
    AND p.review_status = 'APPROVED' AND safety.ugc_visible(p.user_id)
  RETURNING id INTO result_id;
  IF result_id IS NULL THEN RAISE EXCEPTION 'Completed gig unavailable or already reviewed'; END IF;
  RETURN result_id;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_musician_gig_completed(uuid),
  public.create_musician_review(uuid, integer, text),
  public.get_musician_stats(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_musician_gig_completed(uuid),
  public.create_musician_review(uuid, integer, text),
  public.get_musician_stats(uuid[]) TO anon, authenticated;
