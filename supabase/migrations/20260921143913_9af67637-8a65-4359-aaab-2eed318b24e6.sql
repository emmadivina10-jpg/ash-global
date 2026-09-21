
CREATE TABLE public.campus_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name_en text NOT NULL,
  name_fr text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, name_en)
);
GRANT SELECT ON public.campus_subjects TO authenticated;
GRANT SELECT ON public.campus_subjects TO anon;
GRANT ALL ON public.campus_subjects TO service_role;
ALTER TABLE public.campus_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active subjects" ON public.campus_subjects FOR SELECT USING (is_active);

CREATE TABLE public.campus_instructor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  legal_full_name text NOT NULL,
  display_name text NOT NULL,
  country text NOT NULL,
  city text,
  date_of_birth date,
  headline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  methodology text NOT NULL DEFAULT '',
  teaching_experience text NOT NULL DEFAULT '',
  subjects text[] NOT NULL DEFAULT '{}',
  levels text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  teaching_modes text[] NOT NULL DEFAULT '{}',
  areas_served text NOT NULL DEFAULT '',
  years_experience int NOT NULL DEFAULT 0,
  hourly_from numeric(12,2),
  currency text NOT NULL DEFAULT 'XAF',
  qualifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  availability jsonb NOT NULL DEFAULT '[]'::jsonb,
  identity_document_path text,
  qualification_document_path text,
  status text NOT NULL DEFAULT 'DRAFT',
  admin_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campus_application_status_check CHECK (status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','ADDITIONAL_INFORMATION_REQUIRED','APPROVED','REJECTED'))
);
GRANT SELECT, INSERT, UPDATE ON public.campus_instructor_applications TO authenticated;
GRANT ALL ON public.campus_instructor_applications TO service_role;
ALTER TABLE public.campus_instructor_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants read own application" ON public.campus_instructor_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Applicants create own application" ON public.campus_instructor_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status IN ('DRAFT','SUBMITTED'));
CREATE POLICY "Applicants edit own open application" ON public.campus_instructor_applications FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status IN ('DRAFT','SUBMITTED','ADDITIONAL_INFORMATION_REQUIRED')) WITH CHECK (auth.uid() = user_id);
CREATE INDEX campus_applications_status_idx ON public.campus_instructor_applications (status, submitted_at DESC);

CREATE OR REPLACE FUNCTION public.guard_campus_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.admin_note := OLD.admin_note;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.reviewed_by := OLD.reviewed_by;
  IF OLD.status IN ('DRAFT','ADDITIONAL_INFORMATION_REQUIRED') AND NEW.status = 'SUBMITTED' THEN
    NEW.submitted_at := now();
  ELSE
    NEW.status := OLD.status;
    NEW.submitted_at := OLD.submitted_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_campus_application_update
BEFORE UPDATE ON public.campus_instructor_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_campus_application();

CREATE TABLE public.campus_instructor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  provider_id uuid REFERENCES public.provider_profiles(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  headline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  methodology text NOT NULL DEFAULT '',
  subjects text[] NOT NULL DEFAULT '{}',
  levels text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  teaching_modes text[] NOT NULL DEFAULT '{}',
  country text,
  city text,
  areas_served text NOT NULL DEFAULT '',
  years_experience int NOT NULL DEFAULT 0,
  hourly_from numeric(12,2),
  currency text NOT NULL DEFAULT 'XAF',
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT true,
  approved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.campus_instructor_profiles TO authenticated;
GRANT ALL ON public.campus_instructor_profiles TO service_role;
ALTER TABLE public.campus_instructor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in members read active instructors" ON public.campus_instructor_profiles FOR SELECT TO authenticated USING (is_active OR auth.uid() = user_id);
CREATE POLICY "Instructors edit own page" ON public.campus_instructor_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX campus_instructor_active_idx ON public.campus_instructor_profiles (is_active, years_experience DESC);

CREATE OR REPLACE FUNCTION public.guard_campus_instructor_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.is_verified := OLD.is_verified;
  NEW.approved_at := OLD.approved_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_campus_instructor_profile_update
BEFORE UPDATE ON public.campus_instructor_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_campus_instructor_profile();

CREATE TABLE public.campus_instructor_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.campus_instructor_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'DEGREE',
  title text NOT NULL,
  institution text NOT NULL DEFAULT '',
  completed_year int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campus_instructor_qualifications TO authenticated;
GRANT ALL ON public.campus_instructor_qualifications TO service_role;
ALTER TABLE public.campus_instructor_qualifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read qualifications of visible instructors" ON public.campus_instructor_qualifications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.campus_instructor_profiles p WHERE p.id = instructor_id AND (p.is_active OR p.user_id = auth.uid())));
CREATE INDEX campus_qualifications_instructor_idx ON public.campus_instructor_qualifications (instructor_id);

CREATE TABLE public.campus_instructor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.campus_instructor_profiles(id) ON DELETE CASCADE,
  day_of_week int NOT NULL,
  part_of_day text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instructor_id, day_of_week, part_of_day),
  CONSTRAINT campus_availability_day_check CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT campus_availability_part_check CHECK (part_of_day IN ('MORNING','AFTERNOON','EVENING'))
);
GRANT SELECT, INSERT, DELETE ON public.campus_instructor_availability TO authenticated;
GRANT ALL ON public.campus_instructor_availability TO service_role;
ALTER TABLE public.campus_instructor_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read availability of visible instructors" ON public.campus_instructor_availability FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.campus_instructor_profiles p WHERE p.id = instructor_id AND (p.is_active OR p.user_id = auth.uid())));
CREATE POLICY "Instructors add own availability" ON public.campus_instructor_availability FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.campus_instructor_profiles p WHERE p.id = instructor_id AND p.user_id = auth.uid()));
CREATE POLICY "Instructors remove own availability" ON public.campus_instructor_availability FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.campus_instructor_profiles p WHERE p.id = instructor_id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.review_campus_instructor_application(_application_id uuid, _status text, _note text DEFAULT NULL, _reviewer text DEFAULT 'ASH Trust')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app public.campus_instructor_applications%ROWTYPE;
  instructor_id uuid;
  item jsonb;
BEGIN
  IF _status NOT IN ('UNDER_REVIEW','ADDITIONAL_INFORMATION_REQUIRED','APPROVED','REJECTED') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;
  SELECT * INTO app FROM public.campus_instructor_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPLICATION_NOT_FOUND';
  END IF;

  UPDATE public.campus_instructor_applications
  SET status = _status,
      admin_note = COALESCE(_note, admin_note),
      reviewed_at = now(),
      reviewed_by = _reviewer,
      updated_at = now()
  WHERE id = _application_id;

  IF _status = 'APPROVED' THEN
    INSERT INTO public.campus_instructor_profiles (
      user_id, display_name, headline, bio, methodology, subjects, levels, languages,
      teaching_modes, country, city, areas_served, years_experience, hourly_from, currency,
      provider_id
    ) VALUES (
      app.user_id, app.display_name, app.headline, app.bio, app.methodology, app.subjects, app.levels,
      app.languages, app.teaching_modes, app.country, app.city, app.areas_served, app.years_experience,
      app.hourly_from, app.currency,
      (SELECT id FROM public.provider_profiles WHERE user_id = app.user_id LIMIT 1)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      headline = EXCLUDED.headline,
      bio = EXCLUDED.bio,
      methodology = EXCLUDED.methodology,
      subjects = EXCLUDED.subjects,
      levels = EXCLUDED.levels,
      languages = EXCLUDED.languages,
      teaching_modes = EXCLUDED.teaching_modes,
      country = EXCLUDED.country,
      city = EXCLUDED.city,
      areas_served = EXCLUDED.areas_served,
      years_experience = EXCLUDED.years_experience,
      hourly_from = EXCLUDED.hourly_from,
      currency = EXCLUDED.currency,
      is_active = true,
      is_verified = true,
      updated_at = now()
    RETURNING id INTO instructor_id;

    DELETE FROM public.campus_instructor_qualifications WHERE campus_instructor_qualifications.instructor_id = instructor_id;
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(app.qualifications, '[]'::jsonb)) LOOP
      INSERT INTO public.campus_instructor_qualifications (instructor_id, kind, title, institution, completed_year)
      VALUES (
        instructor_id,
        COALESCE(item->>'kind', 'DEGREE'),
        COALESCE(item->>'title', ''),
        COALESCE(item->>'institution', ''),
        NULLIF(item->>'year', '')::int
      );
    END LOOP;

    DELETE FROM public.campus_instructor_availability WHERE campus_instructor_availability.instructor_id = instructor_id;
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(app.availability, '[]'::jsonb)) LOOP
      INSERT INTO public.campus_instructor_availability (instructor_id, day_of_week, part_of_day)
      VALUES (instructor_id, COALESCE((item->>'day')::int, 0), COALESCE(item->>'part', 'MORNING'))
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSIF _status = 'REJECTED' THEN
    UPDATE public.campus_instructor_profiles SET is_active = false, updated_at = now() WHERE user_id = app.user_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_campus_instructor_application(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_campus_instructor_application(uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.campus_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER campus_subjects_updated_at BEFORE UPDATE ON public.campus_subjects FOR EACH ROW EXECUTE FUNCTION public.campus_touch_updated_at();
CREATE TRIGGER campus_qualifications_updated_at BEFORE UPDATE ON public.campus_instructor_qualifications FOR EACH ROW EXECUTE FUNCTION public.campus_touch_updated_at();

INSERT INTO public.campus_subjects (category, name_en, name_fr, sort_order) VALUES
('ACADEMIC','Mathematics','Mathématiques',1),
('ACADEMIC','Physics','Physique',2),
('ACADEMIC','Chemistry','Chimie',3),
('ACADEMIC','Biology','Biologie',4),
('ACADEMIC','English','Anglais',5),
('ACADEMIC','French','Français',6),
('ACADEMIC','Geography','Géographie',7),
('ACADEMIC','History','Histoire',8),
('ACADEMIC','Economics','Économie',9),
('ACADEMIC','Accounting','Comptabilité',10),
('ACADEMIC','Business','Gestion',11),
('TECHNOLOGY','Programming','Programmation',1),
('TECHNOLOGY','Web Development','Développement web',2),
('TECHNOLOGY','Mobile Development','Développement mobile',3),
('TECHNOLOGY','Cybersecurity','Cybersécurité',4),
('TECHNOLOGY','Data Analytics','Analyse de données',5),
('TECHNOLOGY','Artificial Intelligence','Intelligence artificielle',6),
('ENGINEERING','Electrical Engineering','Génie électrique',1),
('ENGINEERING','Electronics','Électronique',2),
('ENGINEERING','Mechanical Engineering','Génie mécanique',3),
('ENGINEERING','Civil Engineering','Génie civil',4),
('ENGINEERING','Computer Engineering','Génie informatique',5),
('PROFESSIONAL','Supply Chain','Chaîne logistique',1),
('PROFESSIONAL','Project Management','Gestion de projet',2),
('PROFESSIONAL','Finance','Finance',3),
('PROFESSIONAL','Marketing','Marketing',4),
('PROFESSIONAL','Entrepreneurship','Entrepreneuriat',5),
('LANGUAGES','English','Anglais',1),
('LANGUAGES','French','Français',2),
('LANGUAGES','Spanish','Espagnol',3),
('CREATIVE','Music','Musique',1),
('CREATIVE','Graphic Design','Design graphique',2),
('CREATIVE','Photography','Photographie',3),
('CREATIVE','Public Speaking','Prise de parole',4);
