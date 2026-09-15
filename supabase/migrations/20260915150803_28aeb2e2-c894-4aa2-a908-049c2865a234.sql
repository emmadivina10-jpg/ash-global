-- ARTICLES ---------------------------------------------------------------
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  excerpt text,
  body text NOT NULL,
  cover_path text,
  tags text[] NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT 'GENERAL',
  is_published boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT SELECT ON public.articles TO anon;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_read_published" ON public.articles FOR SELECT USING (is_published OR author_id = auth.uid());
CREATE POLICY "articles_insert_own" ON public.articles FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "articles_update_own" ON public.articles FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "articles_delete_own" ON public.articles FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_articles_created ON public.articles (created_at DESC);
CREATE TRIGGER trg_articles_touch BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.article_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.article_likes TO authenticated;
GRANT ALL ON public.article_likes TO service_role;
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "article_likes_read" ON public.article_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "article_likes_insert_own" ON public.article_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "article_likes_delete_own" ON public.article_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_article_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.articles SET like_count = like_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.articles SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_article_like_count() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_article_like_count AFTER INSERT OR DELETE ON public.article_likes FOR EACH ROW EXECUTE FUNCTION public.sync_article_like_count();

-- JOBS --------------------------------------------------------------------
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'GENERAL',
  employment_type text NOT NULL DEFAULT 'FULL_TIME',
  location_type text NOT NULL DEFAULT 'ONSITE',
  city text,
  country text NOT NULL DEFAULT 'CM',
  salary_min integer,
  salary_max integer,
  currency text NOT NULL DEFAULT 'XAF',
  apply_deadline date,
  contact_email text,
  is_open boolean NOT NULL DEFAULT true,
  applications_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_read" ON public.jobs FOR SELECT USING (is_open OR poster_id = auth.uid());
CREATE POLICY "jobs_insert_own" ON public.jobs FOR INSERT TO authenticated WITH CHECK (poster_id = auth.uid());
CREATE POLICY "jobs_update_own" ON public.jobs FOR UPDATE TO authenticated USING (poster_id = auth.uid()) WITH CHECK (poster_id = auth.uid());
CREATE POLICY "jobs_delete_own" ON public.jobs FOR DELETE TO authenticated USING (poster_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_jobs_created ON public.jobs (created_at DESC);
CREATE TRIGGER trg_jobs_touch BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter text NOT NULL,
  contact_phone text,
  status text NOT NULL DEFAULT 'SUBMITTED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_id)
);
GRANT SELECT, INSERT, UPDATE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_job(_job_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.jobs WHERE id = _job_id AND poster_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.owns_job(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_job(uuid) TO authenticated, service_role;

CREATE POLICY "job_applications_read" ON public.job_applications FOR SELECT TO authenticated
  USING (applicant_id = auth.uid() OR public.owns_job(job_id));
CREATE POLICY "job_applications_insert_own" ON public.job_applications FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "job_applications_update_poster" ON public.job_applications FOR UPDATE TO authenticated
  USING (public.owns_job(job_id)) WITH CHECK (public.owns_job(job_id));
CREATE TRIGGER trg_job_applications_touch BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.sync_job_application_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.jobs SET applications_count = applications_count + 1 WHERE id = NEW.job_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_job_application_count() FROM anon, authenticated, PUBLIC;
CREATE TRIGGER trg_job_application_count AFTER INSERT ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.sync_job_application_count();

-- MENTORS -----------------------------------------------------------------
CREATE TABLE public.mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  headline text NOT NULL,
  bio text,
  skills text[] NOT NULL DEFAULT '{}',
  availability text NOT NULL DEFAULT 'FLEXIBLE',
  is_free boolean NOT NULL DEFAULT true,
  session_price integer NOT NULL DEFAULT 0,
  city text,
  country text NOT NULL DEFAULT 'CM',
  is_published boolean NOT NULL DEFAULT true,
  sessions_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentors TO authenticated;
GRANT SELECT ON public.mentors TO anon;
GRANT ALL ON public.mentors TO service_role;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentors_read" ON public.mentors FOR SELECT USING (is_published OR user_id = auth.uid());
CREATE POLICY "mentors_insert_own" ON public.mentors FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "mentors_update_own" ON public.mentors FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "mentors_delete_own" ON public.mentors FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_mentors_touch BEFORE UPDATE ON public.mentors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.mentor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mentor_requests TO authenticated;
GRANT ALL ON public.mentor_requests TO service_role;
ALTER TABLE public.mentor_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_mentor(_mentor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.mentors WHERE id = _mentor_id AND user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.owns_mentor(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_mentor(uuid) TO authenticated, service_role;

CREATE POLICY "mentor_requests_read" ON public.mentor_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.owns_mentor(mentor_id));
CREATE POLICY "mentor_requests_insert_own" ON public.mentor_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "mentor_requests_update_mentor" ON public.mentor_requests FOR UPDATE TO authenticated
  USING (public.owns_mentor(mentor_id)) WITH CHECK (public.owns_mentor(mentor_id));
CREATE TRIGGER trg_mentor_requests_touch BEFORE UPDATE ON public.mentor_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();