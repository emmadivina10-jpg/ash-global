-- ============================================================
-- 1. SECURITY AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO','WARN','CRITICAL')),
  subject text,
  actor_user_id uuid,
  route text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read security events" ON public.security_events;
CREATE POLICY "admins read security events" ON public.security_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS security_events_created_idx ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_kind_idx ON public.security_events (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_subject_idx ON public.security_events (subject, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_security_event(
  _kind text,
  _severity text DEFAULT 'WARN',
  _subject text DEFAULT NULL,
  _route text DEFAULT NULL,
  _detail jsonb DEFAULT '{}'::jsonb,
  _actor uuid DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.security_events (kind, severity, subject, actor_user_id, route, detail)
  VALUES (
    _kind,
    CASE WHEN _severity IN ('INFO','WARN','CRITICAL') THEN _severity ELSE 'WARN' END,
    left(coalesce(_subject, ''), 128),
    coalesce(_actor, auth.uid()),
    left(coalesce(_route, ''), 128),
    coalesce(_detail, '{}'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.log_security_event(text, text, text, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, text, text, jsonb, uuid) TO service_role;

-- ============================================================
-- 2. RATE LIMITING / THROTTLING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  bucket text NOT NULL,
  subject text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, subject, window_start)
);

GRANT ALL ON public.rate_limit_hits TO service_role;
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only service_role (which bypasses RLS) may touch this.

CREATE INDEX IF NOT EXISTS rate_limit_hits_window_idx ON public.rate_limit_hits (window_start);

CREATE OR REPLACE FUNCTION public.rate_limit_check(
  _bucket text,
  _subject text,
  _limit integer,
  _window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  win_seconds integer := greatest(1, least(3600, coalesce(_window_seconds, 60)));
  cap integer := greatest(1, coalesce(_limit, 30));
  win timestamptz;
  current_hits integer;
BEGIN
  IF coalesce(trim(_subject), '') = '' THEN
    RETURN jsonb_build_object('allowed', true, 'hits', 0, 'limit', cap, 'retry_after', 0);
  END IF;

  win := to_timestamp(floor(extract(epoch FROM now()) / win_seconds) * win_seconds);

  INSERT INTO public.rate_limit_hits (bucket, subject, window_start, hits, updated_at)
  VALUES (left(_bucket, 64), left(_subject, 128), win, 1, now())
  ON CONFLICT (bucket, subject, window_start)
  DO UPDATE SET hits = public.rate_limit_hits.hits + 1, updated_at = now()
  RETURNING hits INTO current_hits;

  -- Opportunistic cleanup so the counter table never grows without bound.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '2 hours';
  END IF;

  RETURN jsonb_build_object(
    'allowed', current_hits <= cap,
    'hits', current_hits,
    'limit', cap,
    'retry_after', CASE WHEN current_hits <= cap THEN 0
                        ELSE ceil(extract(epoch FROM (win + make_interval(secs => win_seconds)) - now()))::int END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_check(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_check(text, text, integer, integer) TO service_role;

-- ============================================================
-- 3. BOOKING / AVAILABILITY AUTHORIZATION FAILURE LOGGING
-- ============================================================
CREATE OR REPLACE FUNCTION public.decide_booking(_booking_id uuid, _accept boolean, _reason text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  uid uuid := auth.uid();
  b public.bookings%ROWTYPE;
  pname text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF NOT public.is_provider_owner(b.provider_id) THEN
    PERFORM public.log_security_event('BOOKING_AUTHZ_DENIED', 'WARN', uid::text, 'decide_booking',
      jsonb_build_object('booking_id', _booking_id, 'provider_id', b.provider_id), uid);
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;
  IF b.status::text <> 'PENDING' THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_PENDING'); END IF;

  SELECT business_name INTO pname FROM public.provider_profiles WHERE id = b.provider_id;
  PERFORM set_config('app.booking_rpc', 'on', true);

  IF _accept THEN
    UPDATE public.bookings SET status = 'ACCEPTED', accepted_at = now(), pay_by = now() + interval '24 hours'
     WHERE id = b.id;
    PERFORM public.notify_user(b.client_id, 'BOOKING', 'Your booking request has been accepted',
      pname || ' accepted "' || b.service_title || '". Please complete payment within 24 hours.',
      jsonb_build_object('booking_id', b.id, 'status', 'ACCEPTED', 'payment_required', true));
  ELSE
    UPDATE public.bookings SET status = 'DECLINED', decline_reason = nullif(trim(coalesce(_reason,'')),'')
     WHERE id = b.id;
    PERFORM public.notify_user(b.client_id, 'BOOKING', 'Booking request declined',
      pname || ' could not take "' || b.service_title || '".' ||
      coalesce(' Reason: ' || nullif(trim(coalesce(_reason,'')),''), '') || ' No payment was collected.',
      jsonb_build_object('booking_id', b.id, 'status', 'DECLINED'));
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.begin_booking_payment(_booking_id uuid, _reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); b public.bookings%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF b.client_id <> uid THEN
    PERFORM public.log_security_event('BOOKING_AUTHZ_DENIED', 'WARN', uid::text, 'begin_booking_payment',
      jsonb_build_object('booking_id', _booking_id, 'owner_id', b.client_id), uid);
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;
  IF b.status::text NOT IN ('ACCEPTED','PAYMENT_PROCESSING','PAYMENT_FAILED') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PAYMENT_NOT_AVAILABLE');
  END IF;
  IF b.pay_by IS NOT NULL AND b.pay_by < now() THEN
    PERFORM set_config('app.booking_rpc', 'on', true);
    UPDATE public.bookings SET status = 'PAYMENT_EXPIRED' WHERE id = b.id;
    RETURN jsonb_build_object('ok', false, 'error', 'PAYMENT_WINDOW_EXPIRED');
  END IF;
  PERFORM set_config('app.booking_rpc', 'on', true);
  UPDATE public.bookings SET status = 'PAYMENT_PROCESSING', payment_reference = _reference WHERE id = b.id;
  RETURN jsonb_build_object('ok', true, 'amount', b.price);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid, _reason text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); b public.bookings%ROWTYPE; puid uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF b.client_id <> uid THEN
    PERFORM public.log_security_event('BOOKING_AUTHZ_DENIED', 'WARN', uid::text, 'cancel_booking',
      jsonb_build_object('booking_id', _booking_id, 'owner_id', b.client_id), uid);
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;
  IF b.status::text NOT IN ('PENDING','ACCEPTED','PAYMENT_FAILED','PAYMENT_EXPIRED') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_CANCELLABLE');
  END IF;
  PERFORM set_config('app.booking_rpc', 'on', true);
  UPDATE public.bookings SET status = 'CANCELLED', decline_reason = nullif(trim(coalesce(_reason,'')),'') WHERE id = b.id;
  SELECT user_id INTO puid FROM public.provider_profiles WHERE id = b.provider_id;
  PERFORM public.notify_user(puid, 'BOOKING', 'Booking cancelled',
    'A client cancelled "' || b.service_title || '".', jsonb_build_object('booking_id', b.id, 'status', 'CANCELLED'));
  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_booking_progress(_booking_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); b public.bookings%ROWTYPE; puid uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  IF _status NOT IN ('IN_PROGRESS','COMPLETED','NO_SHOW') THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_STATUS'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF NOT public.is_provider_owner(b.provider_id) THEN
    PERFORM public.log_security_event('BOOKING_AUTHZ_DENIED', 'WARN', uid::text, 'set_booking_progress',
      jsonb_build_object('booking_id', _booking_id, 'provider_id', b.provider_id, 'attempted_status', _status), uid);
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;
  PERFORM set_config('app.booking_rpc', 'on', true);
  UPDATE public.bookings SET status = _status::public.booking_status,
      completed_at = CASE WHEN _status = 'COMPLETED' THEN now() ELSE completed_at END
   WHERE id = b.id;
  SELECT user_id INTO puid FROM public.provider_profiles WHERE id = b.provider_id;
  IF _status = 'COMPLETED' THEN
    PERFORM public.notify_user(b.client_id, 'BOOKING', 'Service completed',
      'How did "' || b.service_title || '" go? Leave a review.',
      jsonb_build_object('booking_id', b.id, 'status', 'COMPLETED', 'review_available', true));
    PERFORM public.notify_user(puid, 'BOOKING', 'Booking completed',
      'Your earning for "' || b.service_title || '" has been credited to your wallet.',
      jsonb_build_object('booking_id', b.id, 'status', 'COMPLETED'));
  ELSIF _status = 'IN_PROGRESS' THEN
    PERFORM public.notify_user(b.client_id, 'BOOKING', 'Service started',
      '"' || b.service_title || '" is now in progress.', jsonb_build_object('booking_id', b.id, 'status', 'IN_PROGRESS'));
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_review(_booking_id uuid, _rating integer, _comment text DEFAULT NULL::text, _photo_path text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); b public.bookings%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_RATING'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF b.client_id <> uid THEN
    PERFORM public.log_security_event('BOOKING_AUTHZ_DENIED', 'WARN', uid::text, 'submit_review',
      jsonb_build_object('booking_id', _booking_id, 'owner_id', b.client_id), uid);
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;
  IF b.status::text NOT IN ('COMPLETED','SETTLED') THEN RETURN jsonb_build_object('ok', false, 'error', 'BOOKING_NOT_COMPLETED'); END IF;
  IF EXISTS (SELECT 1 FROM public.reviews WHERE booking_id = b.id) THEN RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_REVIEWED'); END IF;

  INSERT INTO public.reviews (booking_id, provider_id, client_id, rating, comment, photo_path)
  VALUES (b.id, b.provider_id, uid, _rating, nullif(trim(coalesce(_comment,'')),''), _photo_path);

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ============================================================
-- 4. AUTOMATED SECURITY SELF-CHECK
-- ============================================================
CREATE OR REPLACE FUNCTION public.security_selfcheck()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  findings jsonb := '[]'::jsonb;
  rec RECORD;
  critical_count int := 0;
  warn_count int := 0;
BEGIN
  -- (a) SECURITY DEFINER functions callable without signing in.
  FOR rec IN
    SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    findings := findings || jsonb_build_object(
      'code', 'ANON_SECURITY_DEFINER_EXECUTABLE', 'severity', 'CRITICAL',
      'object', rec.name || '(' || rec.args || ')',
      'detail', 'Privileged routine can be called without signing in.');
    critical_count := critical_count + 1;
  END LOOP;

  -- (b) Public tables with row level security switched off.
  FOR rec IN
    SELECT c.relname AS name
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  LOOP
    findings := findings || jsonb_build_object(
      'code', 'RLS_DISABLED', 'severity', 'CRITICAL', 'object', rec.name,
      'detail', 'Table has no row level security, so the API exposes every row.');
    critical_count := critical_count + 1;
  END LOOP;

  -- (c) Tables with RLS on but no policies AND still granted to end-user roles.
  FOR rec IN
    SELECT c.relname AS name
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
       AND NOT EXISTS (SELECT 1 FROM pg_policy pol WHERE pol.polrelid = c.oid)
       AND (has_table_privilege('anon', c.oid, 'SELECT')
            OR has_table_privilege('authenticated', c.oid, 'SELECT'))
  LOOP
    findings := findings || jsonb_build_object(
      'code', 'RLS_NO_POLICY', 'severity', 'WARN', 'object', rec.name,
      'detail', 'Table is reachable by app roles but defines no access rules.');
    warn_count := warn_count + 1;
  END LOOP;

  -- (d) Anything anonymous visitors can write to.
  FOR rec IN
    SELECT c.relname AS name
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
       AND (has_table_privilege('anon', c.oid, 'INSERT')
            OR has_table_privilege('anon', c.oid, 'UPDATE')
            OR has_table_privilege('anon', c.oid, 'DELETE'))
  LOOP
    findings := findings || jsonb_build_object(
      'code', 'ANON_WRITABLE_TABLE', 'severity', 'CRITICAL', 'object', rec.name,
      'detail', 'Anonymous visitors are granted write access.');
    critical_count := critical_count + 1;
  END LOOP;

  INSERT INTO public.security_events (kind, severity, subject, route, detail)
  VALUES ('SELFCHECK',
          CASE WHEN critical_count > 0 THEN 'CRITICAL' WHEN warn_count > 0 THEN 'WARN' ELSE 'INFO' END,
          'system', 'security_selfcheck',
          jsonb_build_object('critical', critical_count, 'warn', warn_count, 'findings', findings));

  RETURN jsonb_build_object(
    'ok', critical_count = 0,
    'critical', critical_count,
    'warn', warn_count,
    'findings', findings,
    'checked_at', now());
END;
$$;
REVOKE ALL ON FUNCTION public.security_selfcheck() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_selfcheck() TO service_role;

-- ============================================================
-- 5. ADMIN SUSPICIOUS-ACTIVITY SUMMARY
-- ============================================================
CREATE OR REPLACE FUNCTION public.security_overview(_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
  since timestamptz;
  result jsonb;
BEGIN
  IF jwt_role <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  since := now() - make_interval(hours => greatest(1, least(720, coalesce(_hours, 24))));

  SELECT jsonb_build_object(
    'since', since,
    'total', (SELECT count(*) FROM public.security_events WHERE created_at >= since),
    'critical', (SELECT count(*) FROM public.security_events WHERE created_at >= since AND severity = 'CRITICAL'),
    'warn', (SELECT count(*) FROM public.security_events WHERE created_at >= since AND severity = 'WARN'),
    'by_kind', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'count')::int DESC) FROM (
        SELECT jsonb_build_object('kind', kind, 'count', count(*)) AS x
          FROM public.security_events WHERE created_at >= since GROUP BY kind) s), '[]'::jsonb),
    'top_subjects', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'count')::int DESC) FROM (
        SELECT jsonb_build_object('subject', subject, 'count', count(*),
                                  'kinds', array_agg(DISTINCT kind)) AS x
          FROM public.security_events
         WHERE created_at >= since AND coalesce(subject,'') <> '' AND kind <> 'SELFCHECK'
         GROUP BY subject HAVING count(*) >= 3
         ORDER BY count(*) DESC LIMIT 20) s), '[]'::jsonb),
    'last_selfcheck', (SELECT to_jsonb(e) FROM (
        SELECT severity, detail, created_at FROM public.security_events
         WHERE kind = 'SELFCHECK' ORDER BY created_at DESC LIMIT 1) e)
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.security_overview(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.security_overview(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.security_overview(integer) TO service_role;