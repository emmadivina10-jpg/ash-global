
-- 1. Catalogue expansion -------------------------------------------------
ALTER TABLE public.campus_subjects
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'SUBJECT',
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS parent_category text;

DO $$ BEGIN
  ALTER TABLE public.campus_subjects
    ADD CONSTRAINT campus_subjects_kind_check
    CHECK (kind IN ('SUBJECT','LANGUAGE','EXAM','SKILL','LEVEL'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.campus_subjects SET kind = 'LANGUAGE' WHERE category = 'LANGUAGES';

UPDATE public.campus_subjects SET kind = 'SKILL'
 WHERE category IN ('TECHNOLOGY','PROFESSIONAL','CREATIVE');

DELETE FROM public.campus_subjects a
 USING public.campus_subjects b
 WHERE a.kind = b.kind AND a.name_en = b.name_en AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS campus_subjects_kind_name_idx
  ON public.campus_subjects (kind, name_en);

-- admins manage the catalogue; everyone reads active entries
DROP POLICY IF EXISTS "Admins manage campus catalogue" ON public.campus_subjects;
CREATE POLICY "Admins manage campus catalogue" ON public.campus_subjects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campus_subjects TO authenticated;
GRANT ALL ON public.campus_subjects TO service_role;

INSERT INTO public.campus_subjects (category, kind, name_en, name_fr, sort_order, is_active)
VALUES
  ('LANGUAGES','LANGUAGE','English','Anglais',1,true),
  ('LANGUAGES','LANGUAGE','French','Français',2,true),
  ('LANGUAGES','LANGUAGE','German','Allemand',3,true),
  ('LANGUAGES','LANGUAGE','Spanish','Espagnol',4,true),
  ('LANGUAGES','LANGUAGE','Italian','Italien',5,true),
  ('LANGUAGES','LANGUAGE','Portuguese','Portugais',6,true),
  ('EXAM_PREPARATION','EXAM','TCF Canada','TCF Canada',1,true),
  ('EXAM_PREPARATION','EXAM','TEF Canada','TEF Canada',2,true),
  ('EXAM_PREPARATION','EXAM','IELTS','IELTS',3,true),
  ('EXAM_PREPARATION','EXAM','CELPIP','CELPIP',4,true),
  ('EXAM_PREPARATION','EXAM','DELF','DELF',5,true),
  ('EXAM_PREPARATION','EXAM','DALF','DALF',6,true),
  ('EXAM_PREPARATION','EXAM','Goethe-Zertifikat','Goethe-Zertifikat',7,true),
  ('TECHNOLOGY','SKILL','Programming','Programmation',1,true),
  ('TECHNOLOGY','SKILL','Web Development','Développement web',2,true),
  ('TECHNOLOGY','SKILL','Mobile Development','Développement mobile',3,true),
  ('TECHNOLOGY','SKILL','Cybersecurity','Cybersécurité',4,true),
  ('TECHNOLOGY','SKILL','Data Analytics','Analyse de données',5,true),
  ('TECHNOLOGY','SKILL','Cloud Computing','Informatique en nuage',6,true),
  ('PROFESSIONAL','SKILL','Project Management','Gestion de projet',1,true),
  ('PROFESSIONAL','SKILL','Marketing','Marketing',2,true),
  ('PROFESSIONAL','SKILL','Supply Chain','Chaîne logistique',3,true),
  ('PROFESSIONAL','SKILL','Finance','Finance',4,true),
  ('ENGINEERING','SUBJECT','Electrical Engineering','Génie électrique',1,true),
  ('ENGINEERING','SUBJECT','Electronics','Électronique',2,true),
  ('ENGINEERING','SUBJECT','Mechanical Engineering','Génie mécanique',3,true),
  ('ENGINEERING','SUBJECT','Civil Engineering','Génie civil',4,true),
  ('ENGINEERING','SUBJECT','Computer Engineering','Génie informatique',5,true)
ON CONFLICT (category, name_en) DO NOTHING;

-- 2. Instructor fields ---------------------------------------------------
ALTER TABLE public.campus_instructor_applications
  ADD COLUMN IF NOT EXISTS instructor_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exams text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language_levels jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone text;

ALTER TABLE public.campus_instructor_profiles
  ADD COLUMN IF NOT EXISTS instructor_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exams text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language_levels jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone text;

CREATE INDEX IF NOT EXISTS campus_instructor_profiles_exams_idx ON public.campus_instructor_profiles USING gin (exams);
CREATE INDEX IF NOT EXISTS campus_instructor_profiles_skills_idx ON public.campus_instructor_profiles USING gin (skills);
CREATE INDEX IF NOT EXISTS campus_instructor_profiles_country_idx ON public.campus_instructor_profiles (country);

-- 3. Carry new fields through approval -----------------------------------
CREATE OR REPLACE FUNCTION public.review_campus_instructor_application(_application_id uuid, _status text, _note text DEFAULT NULL::text, _reviewer text DEFAULT 'ASH Trust'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      instructor_types, exams, skills, language_levels, timezone,
      provider_id
    ) VALUES (
      app.user_id, app.display_name, app.headline, app.bio, app.methodology, app.subjects, app.levels,
      app.languages, app.teaching_modes, app.country, app.city, app.areas_served, app.years_experience,
      app.hourly_from, app.currency,
      app.instructor_types, app.exams, app.skills, app.language_levels, app.timezone,
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
      instructor_types = EXCLUDED.instructor_types,
      exams = EXCLUDED.exams,
      skills = EXCLUDED.skills,
      language_levels = EXCLUDED.language_levels,
      timezone = EXCLUDED.timezone,
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
$function$;

-- 4. Campus commission rate (server-side only) ---------------------------
CREATE OR REPLACE FUNCTION public.campus_commission_rate(_provider_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM public.campus_instructor_profiles p
    WHERE p.provider_id = _provider_id AND p.is_verified = true
  ) THEN 0.10 ELSE NULL END;
$function$;

REVOKE ALL ON FUNCTION public.campus_commission_rate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.campus_commission_rate(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.charge_platform_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD;
  fee numeric := 0;
  net numeric := 0;
  campus_rate numeric;
  fee_label text := '1%';
  old_s text := coalesce(OLD.status::text, '');
  new_s text := NEW.status::text;
BEGIN
  SELECT user_id INTO p FROM public.provider_profiles WHERE id = NEW.provider_id;
  IF p.user_id IS NULL THEN RETURN NEW; END IF;

  campus_rate := public.campus_commission_rate(NEW.provider_id);

  IF campus_rate IS NOT NULL THEN
    fee := round(NEW.price * campus_rate);
    fee_label := '10%';
  ELSE
    fee := coalesce(nullif(NEW.platform_fee, 0), round(NEW.price * 0.01));
  END IF;
  net := NEW.price - fee;

  IF new_s = 'COMPLETED' AND old_s IS DISTINCT FROM 'COMPLETED' THEN
    IF fee > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
      VALUES (p.user_id, 'PLATFORM_FEE', -fee, 'XAF', 'FEE-' || NEW.id::text,
              'Platform fee (' || fee_label || ') for ' || NEW.service_title, 'COMPLETED')
      ON CONFLICT (reference) DO NOTHING;
    END IF;

    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (p.user_id, 'BOOKING_EARNING', net, 'XAF', 'BKG-' || NEW.id::text,
            'Booking earning for ' || NEW.service_title, 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;

    UPDATE public.wallets
       SET available_balance = available_balance + net,
           total_earned = total_earned + net,
           updated_at = now()
     WHERE user_id = p.user_id;
  END IF;

  IF old_s = 'COMPLETED' AND new_s IN ('REFUNDED','DISPUTED','NO_SHOW','CANCELLED') THEN
    IF fee > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
      VALUES (p.user_id, 'PLATFORM_FEE_REVERSAL', fee, 'XAF', 'FEEREV-' || NEW.id::text,
              'Platform fee reversed for ' || NEW.service_title, 'COMPLETED')
      ON CONFLICT (reference) DO NOTHING;
    END IF;

    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (p.user_id, 'BOOKING_REVERSAL', -net, 'XAF', 'BKGREV-' || NEW.id::text,
            'Booking earning reversed for ' || NEW.service_title, 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;

    UPDATE public.wallets
       SET available_balance = greatest(available_balance - net, 0),
           total_earned = greatest(total_earned - net, 0),
           updated_at = now()
     WHERE user_id = p.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Off-platform protection flags ---------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_offplatform_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid,
  matched_rule text NOT NULL,
  excerpt text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.campus_offplatform_flags TO authenticated;
GRANT ALL ON public.campus_offplatform_flags TO service_role;

ALTER TABLE public.campus_offplatform_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read offplatform flags" ON public.campus_offplatform_flags;
CREATE POLICY "Admins read offplatform flags" ON public.campus_offplatform_flags
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS campus_offplatform_flags_user_idx ON public.campus_offplatform_flags (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.flag_offplatform_attempt(_conversation_id uuid, _rule text, _excerpt text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  total integer;
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;
  INSERT INTO public.campus_offplatform_flags (user_id, conversation_id, matched_rule, excerpt)
  VALUES (uid, _conversation_id, left(coalesce(_rule,'UNKNOWN'), 60), left(coalesce(_excerpt,''), 240));
  SELECT count(*) INTO total FROM public.campus_offplatform_flags
   WHERE user_id = uid AND created_at > now() - interval '30 days';
  RETURN total;
END;
$function$;

REVOKE ALL ON FUNCTION public.flag_offplatform_attempt(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flag_offplatform_attempt(uuid, text, text) TO authenticated, service_role;

CREATE TRIGGER campus_offplatform_flags_updated_at
  BEFORE UPDATE ON public.campus_offplatform_flags
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
