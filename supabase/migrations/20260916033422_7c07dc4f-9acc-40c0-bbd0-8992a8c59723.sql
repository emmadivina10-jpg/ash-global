CREATE OR REPLACE FUNCTION public.record_media_moderation(
  _user_id uuid,
  _content_type text,
  _original_name text,
  _media_type text,
  _media_hash text,
  _verdict text,
  _confidence numeric,
  _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  case_id uuid;
  prior_status text;
BEGIN
  IF _verdict NOT IN ('EXPLICIT', 'UNCERTAIN') THEN
    RAISE EXCEPTION 'INVALID_MODERATION_VERDICT';
  END IF;

  INSERT INTO public.moderation_cases (
    user_id, content_type, original_name, media_type, media_hash,
    verdict, confidence, reason
  ) VALUES (
    _user_id, left(_content_type, 80), left(_original_name, 240), left(_media_type, 120),
    _media_hash, _verdict, _confidence, left(_reason, 500)
  )
  ON CONFLICT (user_id, media_hash) WHERE status = 'PENDING_REVIEW'
  DO UPDATE SET
    verdict = EXCLUDED.verdict,
    confidence = EXCLUDED.confidence,
    reason = EXCLUDED.reason,
    updated_at = now()
  RETURNING id INTO case_id;

  IF _verdict = 'EXPLICIT' THEN
    SELECT account_status INTO prior_status
    FROM public.profiles WHERE user_id = _user_id FOR UPDATE;

    UPDATE public.profiles
       SET moderation_previous_status = COALESCE(moderation_previous_status, prior_status),
           moderation_banned_at = COALESCE(moderation_banned_at, now()),
           moderation_ban_reason = left(_reason, 500),
           account_status = 'SUSPENDED',
           updated_at = now()
     WHERE user_id = _user_id;

    INSERT INTO public.admin_audit_log (
      actor, action, target_user_id, target_reference, previous_state, new_state, reason, metadata
    ) VALUES (
      'AUTOMATED_SAFETY', 'MEDIA_REMOVED_ACCOUNT_REVIEW', _user_id, case_id::text,
      jsonb_build_object('account_status', prior_status),
      jsonb_build_object('account_status', 'SUSPENDED', 'moderation_banned_at', now()),
      left(_reason, 500),
      jsonb_build_object('content_type', _content_type, 'media_hash', _media_hash, 'confidence', _confidence)
    );
  END IF;

  RETURN case_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_media_moderation(uuid,text,text,text,text,text,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_media_moderation(uuid,text,text,text,text,text,numeric,text) TO service_role;

CREATE OR REPLACE FUNCTION public.review_media_moderation(
  _case_id uuid,
  _decision text,
  _reviewed_by text,
  _note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
  old_status text;
  restore_status text;
BEGIN
  IF _decision NOT IN ('UPHELD', 'CLEARED') THEN
    RAISE EXCEPTION 'INVALID_REVIEW_DECISION';
  END IF;

  SELECT user_id INTO target_user
  FROM public.moderation_cases WHERE id = _case_id FOR UPDATE;
  IF target_user IS NULL THEN RAISE EXCEPTION 'CASE_NOT_FOUND'; END IF;

  SELECT account_status, COALESCE(moderation_previous_status, 'ACTIVE')
    INTO old_status, restore_status
  FROM public.profiles WHERE user_id = target_user FOR UPDATE;

  UPDATE public.moderation_cases
     SET status = _decision,
         reviewed_by = left(_reviewed_by, 160),
         review_note = NULLIF(left(COALESCE(_note, ''), 1000), ''),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _case_id;

  IF _decision = 'CLEARED' THEN
    UPDATE public.profiles
       SET account_status = CASE WHEN restore_status IN ('ACTIVE','PENDING') THEN restore_status ELSE 'PENDING' END,
           moderation_banned_at = NULL,
           moderation_ban_reason = NULL,
           moderation_previous_status = NULL,
           updated_at = now()
     WHERE user_id = target_user;
  END IF;

  INSERT INTO public.admin_audit_log (
    actor, action, target_user_id, target_reference, previous_state, new_state, reason
  ) VALUES (
    left(_reviewed_by, 160), 'MEDIA_MODERATION_' || _decision, target_user, _case_id::text,
    jsonb_build_object('account_status', old_status),
    jsonb_build_object('account_status', CASE WHEN _decision = 'CLEARED' THEN restore_status ELSE old_status END),
    NULLIF(left(COALESCE(_note, ''), 1000), '')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.review_media_moderation(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_media_moderation(uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.release_housekeeping()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rate_count integer := 0;
  event_count integer := 0;
  view_count integer := 0;
  story_count integer := 0;
BEGIN
  DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day';
  GET DIAGNOSTICS rate_count = ROW_COUNT;
  DELETE FROM public.security_events WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS event_count = ROW_COUNT;
  DELETE FROM public.story_views
   WHERE story_id IN (SELECT id FROM public.stories WHERE expires_at < now() - interval '7 days');
  GET DIAGNOSTICS view_count = ROW_COUNT;
  DELETE FROM public.stories WHERE expires_at < now() - interval '7 days';
  GET DIAGNOSTICS story_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'rate_limit_rows', rate_count,
    'old_security_events', event_count,
    'expired_story_views', view_count,
    'expired_stories', story_count
  );
END;
$$;
REVOKE ALL ON FUNCTION public.release_housekeeping() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_housekeeping() TO service_role;