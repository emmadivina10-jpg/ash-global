CREATE TABLE public.fx_instructor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  legal_full_name text NOT NULL CHECK (char_length(trim(legal_full_name)) BETWEEN 2 AND 160),
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 100),
  country text NOT NULL CHECK (country IN ('CM','NG')),
  date_of_birth date NOT NULL,
  profile_summary text NOT NULL CHECK (char_length(trim(profile_summary)) BETWEEN 20 AND 1200),
  trading_experience text NOT NULL CHECK (char_length(trim(trading_experience)) BETWEEN 20 AND 2000),
  years_experience integer NOT NULL CHECK (years_experience BETWEEN 0 AND 80),
  expertise text[] NOT NULL DEFAULT '{}',
  trading_background text NOT NULL CHECK (char_length(trim(trading_background)) BETWEEN 20 AND 3000),
  government_id_type text NOT NULL CHECK (government_id_type IN ('NATIONAL_ID','PASSPORT','DRIVERS_LICENSE')),
  government_id_path text NOT NULL,
  selfie_path text NOT NULL,
  declarations_accepted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','ADDITIONAL_INFORMATION_REQUIRED','REJECTED')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  kyc_provider text,
  kyc_reference text,
  kyc_status text NOT NULL DEFAULT 'NOT_CONNECTED' CHECK (kyc_status IN ('NOT_CONNECTED','PENDING','VERIFIED','FAILED','REQUIRES_REVIEW')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.fx_instructor_applications TO authenticated;
GRANT ALL ON public.fx_instructor_applications TO service_role;
ALTER TABLE public.fx_instructor_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants read own FX application" ON public.fx_instructor_applications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Applicants submit own FX application" ON public.fx_instructor_applications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'SUBMITTED' AND kyc_status = 'NOT_CONNECTED' AND declarations_accepted);
CREATE INDEX fx_instructor_applications_status_idx ON public.fx_instructor_applications(status, submitted_at DESC);
CREATE TRIGGER touch_fx_instructor_applications_updated_at BEFORE UPDATE ON public.fx_instructor_applications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.fx_instructor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  application_id uuid NOT NULL UNIQUE REFERENCES public.fx_instructor_applications(id) ON DELETE RESTRICT,
  about text NOT NULL DEFAULT '',
  experience_summary text NOT NULL DEFAULT '',
  specialties text[] NOT NULL DEFAULT '{}',
  follower_count integer NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
  approved_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fx_instructor_profiles TO authenticated;
GRANT ALL ON public.fx_instructor_profiles TO service_role;
ALTER TABLE public.fx_instructor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read active FX instructors" ON public.fx_instructor_profiles FOR SELECT TO authenticated USING (is_active OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX fx_instructor_profiles_active_idx ON public.fx_instructor_profiles(is_active, approved_at DESC);
CREATE TRIGGER touch_fx_instructor_profiles_updated_at BEFORE UPDATE ON public.fx_instructor_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.fx_instructor_follows (
  instructor_id uuid NOT NULL REFERENCES public.fx_instructor_profiles(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (instructor_id, follower_id)
);
GRANT SELECT, INSERT, DELETE ON public.fx_instructor_follows TO authenticated;
GRANT ALL ON public.fx_instructor_follows TO service_role;
ALTER TABLE public.fx_instructor_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read FX instructor follows" ON public.fx_instructor_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members follow FX instructors" ON public.fx_instructor_follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY "Members unfollow FX instructors" ON public.fx_instructor_follows FOR DELETE TO authenticated USING (follower_id = auth.uid());
CREATE INDEX fx_instructor_follows_follower_idx ON public.fx_instructor_follows(follower_id, created_at DESC);

CREATE TABLE public.market_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_post_id uuid NOT NULL UNIQUE REFERENCES public.social_posts(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.fx_instructor_profiles(id) ON DELETE RESTRICT,
  author_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('FX_ANALYSIS','MARKET_UPDATE','ARTICLE','EDUCATIONAL_POST','MARKET_COMMENTARY','IMAGE','CHART','SPOTLIGHT')),
  market_category text NOT NULL DEFAULT 'FX' CHECK (market_category IN ('FX','STOCKS','CRYPTO','INDICES','COMMODITIES')),
  instrument text,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 180),
  educational_label text NOT NULL DEFAULT 'Market Observation',
  spotlight_post_id uuid UNIQUE REFERENCES public.spotlight_posts(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_posts TO authenticated;
GRANT ALL ON public.market_posts TO service_role;
ALTER TABLE public.market_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read published Market posts" ON public.market_posts FOR SELECT TO authenticated USING (is_published OR author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved instructors publish Market posts" ON public.market_posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.fx_instructor_profiles fp WHERE fp.id = instructor_id AND fp.user_id = auth.uid() AND fp.is_active) AND EXISTS (SELECT 1 FROM public.social_posts sp WHERE sp.id = social_post_id AND sp.author_id = auth.uid()));
CREATE POLICY "Instructors update own Market posts" ON public.market_posts FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.fx_instructor_profiles fp WHERE fp.id = instructor_id AND fp.user_id = auth.uid() AND fp.is_active));
CREATE POLICY "Instructors delete own Market posts" ON public.market_posts FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX market_posts_published_idx ON public.market_posts(is_published, published_at DESC);
CREATE INDEX market_posts_instructor_idx ON public.market_posts(instructor_id, published_at DESC);
CREATE TRIGGER touch_market_posts_updated_at BEFORE UPDATE ON public.market_posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.market_post_saves (
  market_post_id uuid NOT NULL REFERENCES public.market_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (market_post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.market_post_saves TO authenticated;
GRANT ALL ON public.market_post_saves TO service_role;
ALTER TABLE public.market_post_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own Market saves" ON public.market_post_saves FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members save Market posts" ON public.market_post_saves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members remove own Market saves" ON public.market_post_saves FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX market_post_saves_user_idx ON public.market_post_saves(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_fx_instructor_follower_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.fx_instructor_profiles
  SET follower_count = (SELECT count(*) FROM public.fx_instructor_follows WHERE instructor_id = COALESCE(NEW.instructor_id, OLD.instructor_id))
  WHERE id = COALESCE(NEW.instructor_id, OLD.instructor_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.sync_fx_instructor_follower_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_fx_instructor_follower_count() TO service_role;
CREATE TRIGGER sync_fx_instructor_follower_count_trigger AFTER INSERT OR DELETE ON public.fx_instructor_follows FOR EACH ROW EXECUTE FUNCTION public.sync_fx_instructor_follower_count();

CREATE POLICY "FX applicants upload own verification files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'market-verification' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "FX applicants read own verification files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'market-verification' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "FX applicants replace own verification files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'market-verification' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'market-verification' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "FX applicants remove own verification files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'market-verification' AND (storage.foldername(name))[1] = auth.uid()::text);