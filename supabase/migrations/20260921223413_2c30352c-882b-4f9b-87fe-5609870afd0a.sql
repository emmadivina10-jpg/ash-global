CREATE OR REPLACE FUNCTION public.review_campus_instructor_application(_application_id uuid, _status text, _note text DEFAULT NULL::text, _reviewer text DEFAULT 'ASH Trust'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  app public.campus_instructor_applications%ROWTYPE;
  approved_instructor_id uuid;
  item jsonb;
BEGIN
  IF _status NOT IN ('UNDER_REVIEW','ADDITIONAL_INFORMATION_REQUIRED','APPROVED','REJECTED') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT * INTO app
  FROM public.campus_instructor_applications
  WHERE id = _application_id
  FOR UPDATE;

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
      instructor_types, exams, skills, language_levels, timezone, provider_id
    ) VALUES (
      app.user_id, app.display_name, app.headline, app.bio, app.methodology, app.subjects, app.levels,
      app.languages, app.teaching_modes, app.country, app.city, app.areas_served, app.years_experience,
      app.hourly_from, app.currency, app.instructor_types, app.exams, app.skills, app.language_levels,
      app.timezone, (SELECT id FROM public.provider_profiles WHERE user_id = app.user_id LIMIT 1)
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
    RETURNING id INTO approved_instructor_id;

    DELETE FROM public.campus_instructor_qualifications AS qualification
    WHERE qualification.instructor_id = approved_instructor_id;
    FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(app.qualifications, '[]'::jsonb)) LOOP
      INSERT INTO public.campus_instructor_qualifications (instructor_id, kind, title, institution, completed_year)
      VALUES (
        approved_instructor_id,
        COALESCE(item->>'kind', 'DEGREE'),
        COALESCE(item->>'title', ''),
        COALESCE(item->>'institution', ''),
        NULLIF(item->>'year', '')::int
      );
    END LOOP;

    DELETE FROM public.campus_instructor_availability AS availability
    WHERE availability.instructor_id = approved_instructor_id;
    FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(app.availability, '[]'::jsonb)) LOOP
      INSERT INTO public.campus_instructor_availability (instructor_id, day_of_week, part_of_day)
      VALUES (
        approved_instructor_id,
        COALESCE((item->>'day')::int, 0),
        COALESCE(item->>'part', 'MORNING')
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSIF _status = 'REJECTED' THEN
    UPDATE public.campus_instructor_profiles
    SET is_active = false, updated_at = now()
    WHERE user_id = app.user_id;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.review_campus_instructor_application(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_campus_instructor_application(uuid, text, text, text) TO service_role;