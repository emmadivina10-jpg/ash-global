CREATE OR REPLACE FUNCTION public.review_fx_instructor_application(
  _application_id uuid,
  _status text,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _application public.fx_instructor_applications%ROWTYPE;
  _now timestamptz := now();
BEGIN
  IF _status NOT IN ('UNDER_REVIEW','APPROVED','ADDITIONAL_INFORMATION_REQUIRED','REJECTED') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT * INTO _application
  FROM public.fx_instructor_applications
  WHERE id = _application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPLICATION_NOT_FOUND';
  END IF;

  IF _status = 'APPROVED' THEN
    INSERT INTO public.fx_instructor_profiles (
      user_id, application_id, about, experience_summary, specialties, approved_at, is_active
    ) VALUES (
      _application.user_id,
      _application.id,
      _application.profile_summary,
      _application.trading_experience,
      _application.expertise,
      _now,
      true
    )
    ON CONFLICT (application_id) DO UPDATE SET
      about = EXCLUDED.about,
      experience_summary = EXCLUDED.experience_summary,
      specialties = EXCLUDED.specialties,
      approved_at = EXCLUDED.approved_at,
      is_active = true;
  ELSIF _application.status = 'APPROVED' THEN
    UPDATE public.fx_instructor_profiles
    SET is_active = false
    WHERE application_id = _application.id;
  END IF;

  UPDATE public.fx_instructor_applications
  SET status = _status,
      admin_note = NULLIF(trim(COALESCE(_note, '')), ''),
      reviewed_at = _now
  WHERE id = _application.id;
END;
$$;
REVOKE ALL ON FUNCTION public.review_fx_instructor_application(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_fx_instructor_application(uuid, text, text) TO service_role;