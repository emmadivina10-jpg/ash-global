-- PROPOSED (NOT APPLIED): ASH Logistics phase 2 — rider onboarding, verification, vehicles,
-- vendor invitations, membership, availability, zones and stricter assignment.
-- Additive only. Touches only dispatch_* tables/functions plus one private storage bucket.
-- Reads (never writes) public.provider_profiles to confirm a caller is a shop owner.
-- No payment, wallet, Stripe, MTN, Orange Money, TchokoPay or financial objects are referenced.

-- 1. Rider profile, verification and vehicle columns (dispatch_riders is empty in production).
ALTER TABLE public.dispatch_riders
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'UNSUBMITTED'
    CHECK (verification_status IN ('UNSUBMITTED','PENDING','VERIFIED','REJECTED','SUSPENDED')),
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS vehicle_plate text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_color text,
  ADD COLUMN IF NOT EXISTS service_zones text[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(service_zones) <= 10);
-- New riders start inactive and OFFLINE until staff verify them.
ALTER TABLE public.dispatch_riders ALTER COLUMN is_active SET DEFAULT false;
ALTER TABLE public.dispatch_riders ALTER COLUMN availability_status SET DEFAULT 'OFFLINE';

-- 2. Identity documents: separate table so shops never see them. Only file paths, never images.
CREATE TABLE IF NOT EXISTS public.dispatch_rider_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_user_id uuid NOT NULL REFERENCES public.dispatch_riders(user_id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('NATIONAL_ID','PASSPORT','DRIVER_LICENCE','VEHICLE_REGISTRATION','SELFIE')),
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rider_user_id, doc_type)
);
ALTER TABLE public.dispatch_rider_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dispatch_rider_documents FROM anon, authenticated;
GRANT SELECT ON public.dispatch_rider_documents TO authenticated;
CREATE POLICY dispatch_rider_documents_read ON public.dispatch_rider_documents FOR SELECT TO authenticated
  USING (rider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 3. Shop invitations: only a SHA-256 hash of the one-time code is stored. No member can read this table.
CREATE TABLE IF NOT EXISTS public.dispatch_rider_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  code_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_by uuid,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dispatch_rider_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dispatch_rider_invites FROM anon, authenticated;

-- 4. Shops can also see riders who accepted their invitation (not only riders they own).
DROP POLICY IF EXISTS dispatch_riders_read ON public.dispatch_riders;
CREATE POLICY dispatch_riders_read ON public.dispatch_riders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.dispatch_vendor_riders v WHERE v.rider_user_id = dispatch_riders.user_id
      AND v.vendor_id = auth.uid() AND v.status IN ('ACCEPTED','SUSPENDED')));

-- 5. Private bucket for identity files: riders upload into their own folder; only staff and the rider read.
INSERT INTO storage.buckets (id, name, public) VALUES ('rider-documents', 'rider-documents', false)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY rider_documents_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rider-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY rider_documents_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rider-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- 6. Actions.
CREATE OR REPLACE FUNCTION public.dispatch_rider_register(_full_name text, _phone text, _city text, _vehicle_type text,
  _plate text DEFAULT NULL, _model text DEFAULT NULL, _color text DEFAULT NULL, _licence text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.dispatch_riders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF length(trim(coalesce(_full_name,''))) < 2 OR length(trim(coalesce(_phone,''))) < 6 OR length(trim(coalesce(_city,''))) < 2 THEN
    RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF _vehicle_type NOT IN ('MOTORCYCLE','CAR','BICYCLE','WALKING') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF _vehicle_type IN ('MOTORCYCLE','CAR') AND length(trim(coalesce(_plate,''))) < 3 THEN RAISE EXCEPTION 'PLATE_REQUIRED'; END IF;
  SELECT * INTO r FROM public.dispatch_riders WHERE user_id = auth.uid() FOR UPDATE;
  IF FOUND AND r.verification_status = 'SUSPENDED' THEN RAISE EXCEPTION 'SUSPENDED'; END IF;
  INSERT INTO public.dispatch_riders(user_id, full_name, phone, city, vehicle_type, vehicle_plate, vehicle_model, vehicle_color, licence_number)
  VALUES (auth.uid(), trim(_full_name), trim(_phone), trim(_city), _vehicle_type, upper(trim(_plate)), _model, _color, _licence)
  ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, city = EXCLUDED.city,
    vehicle_type = EXCLUDED.vehicle_type, vehicle_plate = EXCLUDED.vehicle_plate, vehicle_model = EXCLUDED.vehicle_model,
    vehicle_color = EXCLUDED.vehicle_color, licence_number = EXCLUDED.licence_number, updated_at = now(),
    -- Changing details after review sends the rider back for re-verification and takes them offline.
    verification_status = CASE WHEN dispatch_riders.verification_status IN ('VERIFIED','REJECTED') THEN 'PENDING' ELSE dispatch_riders.verification_status END,
    is_active = false, availability_status = 'OFFLINE';
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_rider_add_document(_doc_type text, _path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.dispatch_riders WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'NOT_REGISTERED'; END IF;
  IF split_part(coalesce(_path,''), '/', 1) <> auth.uid()::text OR _path LIKE '%..%' THEN RAISE EXCEPTION 'INVALID_PATH'; END IF;
  INSERT INTO public.dispatch_rider_documents(rider_user_id, doc_type, storage_path) VALUES (auth.uid(), _doc_type, _path)
  ON CONFLICT (rider_user_id, doc_type) DO UPDATE SET storage_path = EXCLUDED.storage_path, created_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_rider_submit_verification()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.dispatch_riders%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.dispatch_riders WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_REGISTERED'; END IF;
  IF r.verification_status NOT IN ('UNSUBMITTED','REJECTED') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dispatch_rider_documents WHERE rider_user_id = auth.uid() AND doc_type IN ('NATIONAL_ID','PASSPORT'))
     OR NOT EXISTS (SELECT 1 FROM public.dispatch_rider_documents WHERE rider_user_id = auth.uid() AND doc_type = 'SELFIE') THEN
    RAISE EXCEPTION 'DOCUMENTS_MISSING'; END IF;
  IF r.vehicle_type IN ('MOTORCYCLE','CAR') AND NOT EXISTS (SELECT 1 FROM public.dispatch_rider_documents
      WHERE rider_user_id = auth.uid() AND doc_type = 'DRIVER_LICENCE') THEN RAISE EXCEPTION 'DOCUMENTS_MISSING'; END IF;
  UPDATE public.dispatch_riders SET verification_status = 'PENDING', verification_note = NULL, updated_at = now() WHERE user_id = auth.uid();
END $$;

-- Staff (admin) only. Approve, reject, suspend or reinstate a rider.
CREATE OR REPLACE FUNCTION public.dispatch_rider_review(_rider uuid, _decision text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.dispatch_riders%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF _rider = auth.uid() THEN RAISE EXCEPTION 'SELF_REVIEW'; END IF;
  SELECT * INTO r FROM public.dispatch_riders WHERE user_id = _rider FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_REGISTERED'; END IF;
  IF _decision = 'VERIFIED' AND r.verification_status <> 'PENDING' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF _decision = 'REJECTED' AND r.verification_status <> 'PENDING' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF _decision IN ('REJECTED','SUSPENDED') AND length(trim(coalesce(_note,''))) < 3 THEN RAISE EXCEPTION 'NOTE_REQUIRED'; END IF;
  IF _decision = 'SUSPENDED' AND EXISTS (SELECT 1 FROM public.dispatch_job_assignments
      WHERE rider_user_id = _rider AND status IN ('ACCEPTED','IN_PROGRESS')) THEN RAISE EXCEPTION 'RIDER_ON_DELIVERY'; END IF;
  IF _decision = 'REINSTATE' THEN
    IF r.verification_status <> 'SUSPENDED' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
    _decision := 'VERIFIED';
  ELSIF _decision NOT IN ('VERIFIED','REJECTED','SUSPENDED') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  UPDATE public.dispatch_riders SET verification_status = _decision, verification_note = _note,
    verified_by = auth.uid(), verified_at = now(), is_active = (_decision = 'VERIFIED'),
    availability_status = 'OFFLINE', updated_at = now() WHERE user_id = _rider;
  -- A suspended rider loses any not-yet-accepted offers.
  IF _decision = 'SUSPENDED' THEN
    UPDATE public.dispatch_job_assignments SET status = 'CANCELLED' WHERE rider_user_id = _rider AND status = 'OPEN';
    UPDATE public.dispatch_jobs SET status = 'REQUESTED', rider_user_id = NULL WHERE rider_user_id = _rider AND status = 'ASSIGNED';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_rider_set_availability(_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.dispatch_riders%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.dispatch_riders WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_REGISTERED'; END IF;
  IF _status NOT IN ('AVAILABLE','BUSY','OFFLINE') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF _status <> 'OFFLINE' AND (r.verification_status <> 'VERIFIED' OR NOT r.is_active) THEN RAISE EXCEPTION 'NOT_VERIFIED'; END IF;
  IF _status = 'OFFLINE' AND EXISTS (SELECT 1 FROM public.dispatch_job_assignments
      WHERE rider_user_id = auth.uid() AND status IN ('ACCEPTED','IN_PROGRESS')) THEN RAISE EXCEPTION 'RIDER_ON_DELIVERY'; END IF;
  UPDATE public.dispatch_riders SET availability_status = _status, updated_at = now() WHERE user_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_rider_set_zones(_zones text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE clean text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.dispatch_riders WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'NOT_REGISTERED'; END IF;
  SELECT coalesce(array_agg(DISTINCT z), '{}') INTO clean FROM (SELECT lower(trim(x)) z FROM unnest(coalesce(_zones,'{}')) x) s
    WHERE length(z) BETWEEN 2 AND 60;
  IF cardinality(clean) > 10 THEN RAISE EXCEPTION 'TOO_MANY_ZONES'; END IF;
  UPDATE public.dispatch_riders SET service_zones = clean, updated_at = now() WHERE user_id = auth.uid();
END $$;

-- Shop owner creates a one-time invite code (valid 72h). The plain code is returned once and never stored.
CREATE OR REPLACE FUNCTION public.dispatch_vendor_create_invite()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE code text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.provider_profiles WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'NOT_A_VENDOR'; END IF;
  IF (SELECT count(*) FROM public.dispatch_rider_invites WHERE vendor_id = auth.uid() AND used_at IS NULL
      AND revoked_at IS NULL AND expires_at > now()) >= 20 THEN RAISE EXCEPTION 'TOO_MANY_OPEN_INVITES'; END IF;
  code := upper(substr(encode(sha256((gen_random_uuid()::text || gen_random_uuid()::text)::bytea), 'hex'), 1, 12));
  INSERT INTO public.dispatch_rider_invites(vendor_id, code_hash, expires_at)
  VALUES (auth.uid(), encode(sha256(('invite:' || code)::bytea), 'hex'), now() + interval '72 hours');
  RETURN code;
END $$;

-- Shop owner lists own invites (no hashes returned).
CREATE OR REPLACE FUNCTION public.dispatch_vendor_list_invites()
RETURNS TABLE(id uuid, expires_at timestamptz, used_by uuid, used_at timestamptz, revoked_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.expires_at, i.used_by, i.used_at, i.revoked_at, i.created_at FROM public.dispatch_rider_invites i
  WHERE i.vendor_id = auth.uid() ORDER BY i.created_at DESC LIMIT 100
$$;

CREATE OR REPLACE FUNCTION public.dispatch_vendor_revoke_invite(_invite uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.dispatch_rider_invites SET revoked_at = now()
  WHERE id = _invite AND vendor_id = auth.uid() AND used_at IS NULL AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
END $$;

-- Registered rider redeems a code; it is single-use and expires. Membership becomes ACCEPTED.
CREATE OR REPLACE FUNCTION public.dispatch_rider_redeem_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i public.dispatch_rider_invites%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.dispatch_riders WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'NOT_REGISTERED'; END IF;
  SELECT * INTO i FROM public.dispatch_rider_invites
    WHERE code_hash = encode(sha256(('invite:' || upper(trim(coalesce(_code,''))))::bytea), 'hex') FOR UPDATE;
  -- One generic error for unknown, used, revoked or expired codes (no hints for guessing).
  IF NOT FOUND OR i.used_at IS NOT NULL OR i.revoked_at IS NOT NULL OR i.expires_at <= now() THEN RAISE EXCEPTION 'INVITE_INVALID'; END IF;
  IF i.vendor_id = auth.uid() THEN RAISE EXCEPTION 'INVITE_INVALID'; END IF;
  IF EXISTS (SELECT 1 FROM public.dispatch_vendor_riders WHERE vendor_id = i.vendor_id AND rider_user_id = auth.uid() AND status = 'SUSPENDED') THEN
    RAISE EXCEPTION 'SUSPENDED_BY_VENDOR'; END IF;
  UPDATE public.dispatch_rider_invites SET used_by = auth.uid(), used_at = now() WHERE id = i.id;
  INSERT INTO public.dispatch_vendor_riders(vendor_id, rider_user_id, status, invited_by, accepted_at)
  VALUES (i.vendor_id, auth.uid(), 'ACCEPTED', i.vendor_id, now())
  ON CONFLICT (vendor_id, rider_user_id) DO UPDATE SET status = 'ACCEPTED', accepted_at = now(), updated_at = now();
  RETURN i.vendor_id;
END $$;

-- Shop owner suspends or reinstates one of its riders. Cannot touch other shops' riders.
CREATE OR REPLACE FUNCTION public.dispatch_vendor_set_rider_status(_rider uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur text;
BEGIN
  IF _status NOT IN ('ACCEPTED','SUSPENDED') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  SELECT status INTO cur FROM public.dispatch_vendor_riders WHERE vendor_id = auth.uid() AND rider_user_id = _rider FOR UPDATE;
  IF NOT FOUND OR cur NOT IN ('ACCEPTED','SUSPENDED') THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  UPDATE public.dispatch_vendor_riders SET status = _status, updated_at = now() WHERE vendor_id = auth.uid() AND rider_user_id = _rider;
  IF _status = 'SUSPENDED' THEN
    UPDATE public.dispatch_job_assignments SET status = 'CANCELLED'
      WHERE rider_user_id = _rider AND vendor_id = auth.uid() AND status = 'OPEN';
    UPDATE public.dispatch_jobs SET status = 'REQUESTED', rider_user_id = NULL
      WHERE rider_user_id = _rider AND vendor_id = auth.uid() AND status = 'ASSIGNED' AND fulfillment_mode = 'VENDOR_DISPATCH';
  END IF;
END $$;

-- Rider leaves a shop. Not allowed mid-delivery for that shop.
CREATE OR REPLACE FUNCTION public.dispatch_rider_leave_vendor(_vendor uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.dispatch_job_assignments WHERE rider_user_id = auth.uid() AND vendor_id = _vendor
      AND status IN ('ACCEPTED','IN_PROGRESS')) THEN RAISE EXCEPTION 'RIDER_ON_DELIVERY'; END IF;
  UPDATE public.dispatch_vendor_riders SET status = 'REJECTED', updated_at = now()
    WHERE vendor_id = _vendor AND rider_user_id = auth.uid() AND status = 'ACCEPTED';
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
END $$;

-- 7. Stricter assignment: same as the live rule, plus the rider must be staff-verified.
CREATE OR REPLACE FUNCTION public.dispatch_assign_rider(_job uuid, _rider uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE; admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR (j.vendor_id IS DISTINCT FROM auth.uid() AND NOT admin) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.fulfillment_mode = 'SELF_PICKUP' THEN RAISE EXCEPTION 'NO_RIDER_FOR_SELF_PICKUP'; END IF;
  IF j.status NOT IN ('REQUESTED','INVITED','REJECTED') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF j.approved_fee_amount IS DISTINCT FROM j.fee_amount OR j.quote_approved_at IS NULL THEN RAISE EXCEPTION 'QUOTE_NOT_APPROVED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dispatch_riders r WHERE r.user_id = _rider AND r.is_active
      AND r.verification_status = 'VERIFIED' AND r.availability_status = 'AVAILABLE') THEN
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

-- 8. Permissions: signed-in members only.
REVOKE ALL ON FUNCTION public.dispatch_rider_register(text,text,text,text,text,text,text,text), public.dispatch_rider_add_document(text,text),
  public.dispatch_rider_submit_verification(), public.dispatch_rider_review(uuid,text,text), public.dispatch_rider_set_availability(text),
  public.dispatch_rider_set_zones(text[]), public.dispatch_vendor_create_invite(), public.dispatch_vendor_list_invites(),
  public.dispatch_vendor_revoke_invite(uuid), public.dispatch_rider_redeem_invite(text), public.dispatch_vendor_set_rider_status(uuid,text),
  public.dispatch_rider_leave_vendor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_rider_register(text,text,text,text,text,text,text,text), public.dispatch_rider_add_document(text,text),
  public.dispatch_rider_submit_verification(), public.dispatch_rider_review(uuid,text,text), public.dispatch_rider_set_availability(text),
  public.dispatch_rider_set_zones(text[]), public.dispatch_vendor_create_invite(), public.dispatch_vendor_list_invites(),
  public.dispatch_vendor_revoke_invite(uuid), public.dispatch_rider_redeem_invite(text), public.dispatch_vendor_set_rider_status(uuid,text),
  public.dispatch_rider_leave_vendor(uuid) TO authenticated;
