-- ASH Dispatch access rules and actions (approved). Additive only; touches only dispatch_* tables.
REVOKE INSERT, UPDATE, DELETE ON public.dispatch_riders, public.dispatch_vendor_riders, public.dispatch_jobs,
  public.dispatch_job_assignments, public.dispatch_job_events FROM authenticated, anon;
REVOKE ALL ON public.dispatch_pickup_verifications FROM authenticated, anon;
REVOKE ALL ON public.dispatch_riders, public.dispatch_vendor_riders, public.dispatch_jobs,
  public.dispatch_job_assignments, public.dispatch_job_events FROM anon;

ALTER TABLE public.dispatch_jobs
  ADD COLUMN IF NOT EXISTS fulfillment_mode text NOT NULL DEFAULT 'ASH_DISPATCH'
    CHECK (fulfillment_mode IN ('ASH_DISPATCH','VENDOR_DISPATCH','SELF_PICKUP')),
  ADD COLUMN IF NOT EXISTS approved_fee_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS quote_approved_at timestamptz;
ALTER TABLE public.dispatch_pickup_verifications
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS dispatch_one_live_assignment
  ON public.dispatch_job_assignments(delivery_id) WHERE status IN ('OPEN','ACCEPTED','IN_PROGRESS');

CREATE POLICY dispatch_riders_read ON public.dispatch_riders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY dispatch_vendor_riders_read ON public.dispatch_vendor_riders FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR rider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY dispatch_jobs_read ON public.dispatch_jobs FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR vendor_id = auth.uid() OR rider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY dispatch_assignments_read ON public.dispatch_job_assignments FOR SELECT TO authenticated
  USING (rider_user_id = auth.uid() OR vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY dispatch_events_read ON public.dispatch_job_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dispatch_jobs j WHERE j.id = delivery_id
    AND (j.customer_id = auth.uid() OR j.vendor_id = auth.uid() OR j.rider_user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.dispatch_log(_job uuid, _status text, _actor text, _note text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.dispatch_job_events(delivery_id, status, actor_type, actor_user_id, note)
  VALUES (_job, _status, _actor, auth.uid(), _note);
$$;
REVOKE ALL ON FUNCTION public.dispatch_log(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_request_job(_vendor uuid, _mode text, _pickup text, _dropoff text, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  IF me = _vendor THEN RAISE EXCEPTION 'CANNOT_ORDER_FROM_SELF'; END IF;
  IF _mode NOT IN ('ASH_DISPATCH','VENDOR_DISPATCH','SELF_PICKUP') THEN RAISE EXCEPTION 'BAD_MODE'; END IF;
  IF length(coalesce(_pickup,'')) < 3 OR (_mode <> 'SELF_PICKUP' AND length(coalesce(_dropoff,'')) < 3) THEN RAISE EXCEPTION 'ADDRESS_REQUIRED'; END IF;
  INSERT INTO public.dispatch_jobs(vendor_id, customer_id, fulfillment_mode, service_type, pickup_address, dropoff_address, notes, fee_amount)
  VALUES (_vendor, me, _mode, CASE WHEN _mode = 'SELF_PICKUP' THEN 'SELF_PICKUP' ELSE 'DELIVERY' END,
          _pickup, coalesce(nullif(_dropoff,''), _pickup), left(_notes, 500), 0)
  RETURNING dispatch_jobs.id INTO id;
  PERFORM public.dispatch_log(id, 'REQUESTED', 'CUSTOMER', NULL);
  RETURN id;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_set_quote(_job uuid, _fee numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.vendor_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.status NOT IN ('REQUESTED','INVITED','REJECTED') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF _fee IS NULL OR _fee < 0 OR _fee > 1000000 THEN RAISE EXCEPTION 'BAD_FEE'; END IF;
  UPDATE public.dispatch_jobs SET fee_amount = _fee, approved_fee_amount = NULL, quote_approved_at = NULL WHERE id = _job;
  PERFORM public.dispatch_log(_job, j.status, 'VENDOR', 'quote ' || _fee::text);
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_approve_quote(_job uuid, _fee numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.status IN ('DELIVERED','CANCELLED') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF _fee IS DISTINCT FROM j.fee_amount THEN RAISE EXCEPTION 'QUOTE_CHANGED'; END IF;
  UPDATE public.dispatch_jobs SET approved_fee_amount = j.fee_amount, quote_approved_at = now() WHERE id = _job;
  PERFORM public.dispatch_log(_job, j.status, 'CUSTOMER', 'quote approved');
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_assign_rider(_job uuid, _rider uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE; admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR (j.vendor_id IS DISTINCT FROM auth.uid() AND NOT admin) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.fulfillment_mode = 'SELF_PICKUP' THEN RAISE EXCEPTION 'NO_RIDER_FOR_SELF_PICKUP'; END IF;
  IF j.status NOT IN ('REQUESTED','INVITED','REJECTED') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF j.approved_fee_amount IS DISTINCT FROM j.fee_amount OR j.quote_approved_at IS NULL THEN RAISE EXCEPTION 'QUOTE_NOT_APPROVED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dispatch_riders r WHERE r.user_id = _rider AND r.is_active AND r.availability_status <> 'OFFLINE') THEN
    RAISE EXCEPTION 'RIDER_UNAVAILABLE'; END IF;
  IF j.fulfillment_mode = 'VENDOR_DISPATCH' AND NOT EXISTS (SELECT 1 FROM public.dispatch_vendor_riders v
      WHERE v.vendor_id = j.vendor_id AND v.rider_user_id = _rider AND v.status = 'ACCEPTED') THEN
    RAISE EXCEPTION 'NOT_VENDOR_RIDER'; END IF;
  UPDATE public.dispatch_job_assignments SET status = 'CANCELLED' WHERE delivery_id = _job AND status IN ('OPEN','ACCEPTED','IN_PROGRESS');
  INSERT INTO public.dispatch_job_assignments(delivery_id, rider_user_id, vendor_id, status, assigned_by)
  VALUES (_job, _rider, j.vendor_id, 'OPEN', auth.uid())
  ON CONFLICT (delivery_id, rider_user_id) DO UPDATE SET status = 'OPEN', assigned_by = auth.uid(), accepted_at = NULL, rejected_at = NULL;
  UPDATE public.dispatch_jobs SET rider_user_id = _rider, status = 'ASSIGNED' WHERE id = _job;
  PERFORM public.dispatch_log(_job, 'ASSIGNED', CASE WHEN admin AND j.vendor_id IS DISTINCT FROM auth.uid() THEN 'ADMIN' ELSE 'VENDOR' END, NULL);
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_rider_respond(_job uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.rider_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.status <> 'ASSIGNED' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF _accept THEN
    UPDATE public.dispatch_job_assignments SET status = 'ACCEPTED', accepted_at = now() WHERE delivery_id = _job AND rider_user_id = auth.uid() AND status = 'OPEN';
    UPDATE public.dispatch_jobs SET status = 'ACCEPTED' WHERE id = _job;
    PERFORM public.dispatch_log(_job, 'ACCEPTED', 'RIDER', NULL);
  ELSE
    UPDATE public.dispatch_job_assignments SET status = 'REJECTED', rejected_at = now() WHERE delivery_id = _job AND rider_user_id = auth.uid() AND status = 'OPEN';
    UPDATE public.dispatch_jobs SET status = 'REJECTED', rider_user_id = NULL WHERE id = _job;
    PERFORM public.dispatch_log(_job, 'REJECTED', 'RIDER', NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_rider_progress(_job uuid, _next text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.rider_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF NOT ((j.status = 'ACCEPTED' AND _next = 'PICKUP_CONFIRMED') OR (j.status = 'PICKUP_CONFIRMED' AND _next = 'IN_TRANSIT')) THEN
    RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  UPDATE public.dispatch_jobs SET status = _next WHERE id = _job;
  IF _next = 'IN_TRANSIT' THEN
    UPDATE public.dispatch_job_assignments SET status = 'IN_PROGRESS' WHERE delivery_id = _job AND rider_user_id = auth.uid() AND status = 'ACCEPTED';
  END IF;
  PERFORM public.dispatch_log(_job, _next, 'RIDER', NULL);
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_issue_handover_code(_job uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE; code text;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.status IN ('DELIVERED','CANCELLED') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  code := lpad(((('x' || substr(encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0');
  INSERT INTO public.dispatch_pickup_verifications(delivery_id, code_hash, created_by, expires_at, attempts, used_at, is_verified)
  VALUES (_job, encode(sha256((_job::text || ':' || code)::bytea), 'hex'), auth.uid(), now() + interval '30 minutes', 0, NULL, false)
  ON CONFLICT (delivery_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at,
    attempts = 0, created_at = now()
  WHERE public.dispatch_pickup_verifications.used_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'CODE_ALREADY_USED'; END IF;
  RETURN code;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_complete_with_code(_job uuid, _code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE; v public.dispatch_pickup_verifications%ROWTYPE; actor text;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.fulfillment_mode = 'SELF_PICKUP' THEN
    IF j.vendor_id IS DISTINCT FROM auth.uid() OR j.status <> 'REQUESTED' THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
    actor := 'VENDOR';
  ELSE
    IF j.rider_user_id IS DISTINCT FROM auth.uid() OR j.status <> 'IN_TRANSIT' THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
    actor := 'RIDER';
  END IF;
  SELECT * INTO v FROM public.dispatch_pickup_verifications WHERE delivery_id = _job FOR UPDATE;
  IF NOT FOUND THEN RETURN 'NO_CODE'; END IF;
  IF v.used_at IS NOT NULL THEN RETURN 'USED'; END IF;
  IF v.attempts >= 5 THEN RETURN 'LOCKED'; END IF;
  IF v.expires_at < now() THEN RETURN 'EXPIRED'; END IF;
  IF v.code_hash <> encode(sha256((_job::text || ':' || coalesce(_code,''))::bytea), 'hex') THEN
    UPDATE public.dispatch_pickup_verifications SET attempts = attempts + 1 WHERE id = v.id;
    RETURN 'WRONG';
  END IF;
  UPDATE public.dispatch_pickup_verifications SET used_at = now(), is_verified = true, verified_at = now(), verified_by = auth.uid() WHERE id = v.id;
  UPDATE public.dispatch_jobs SET status = 'DELIVERED' WHERE id = _job;
  UPDATE public.dispatch_job_assignments SET status = 'COMPLETED' WHERE delivery_id = _job AND status = 'IN_PROGRESS';
  PERFORM public.dispatch_log(_job, 'DELIVERED', actor, NULL);
  RETURN 'OK';
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_cancel(_job uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE; actor text;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  actor := CASE WHEN j.customer_id = auth.uid() THEN 'CUSTOMER' WHEN j.vendor_id = auth.uid() THEN 'VENDOR'
                WHEN public.has_role(auth.uid(), 'admin') THEN 'ADMIN' END;
  IF actor IS NULL THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.status IN ('IN_TRANSIT','DELIVERED','CANCELLED') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  UPDATE public.dispatch_jobs SET status = 'CANCELLED' WHERE id = _job;
  UPDATE public.dispatch_job_assignments SET status = 'CANCELLED' WHERE delivery_id = _job AND status IN ('OPEN','ACCEPTED','IN_PROGRESS');
  PERFORM public.dispatch_log(_job, 'CANCELLED', actor, left(_reason, 300));
END $$;

REVOKE ALL ON FUNCTION public.dispatch_request_job(uuid, text, text, text, text), public.dispatch_set_quote(uuid, numeric),
  public.dispatch_approve_quote(uuid, numeric), public.dispatch_assign_rider(uuid, uuid), public.dispatch_rider_respond(uuid, boolean),
  public.dispatch_rider_progress(uuid, text), public.dispatch_issue_handover_code(uuid), public.dispatch_complete_with_code(uuid, text),
  public.dispatch_cancel(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_request_job(uuid, text, text, text, text), public.dispatch_set_quote(uuid, numeric),
  public.dispatch_approve_quote(uuid, numeric), public.dispatch_assign_rider(uuid, uuid), public.dispatch_rider_respond(uuid, boolean),
  public.dispatch_rider_progress(uuid, text), public.dispatch_issue_handover_code(uuid), public.dispatch_complete_with_code(uuid, text),
  public.dispatch_cancel(uuid, text) TO authenticated;