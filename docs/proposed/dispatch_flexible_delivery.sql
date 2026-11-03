-- ASH Logistics: flexible delivery methods (customer-chosen ASH rider, external rider, shop preferences).
-- Reuses dispatch_jobs / assignments / handover codes. No payment, wallet or commission objects touched.

-- 1. New delivery types
ALTER TABLE public.dispatch_jobs DROP CONSTRAINT IF EXISTS dispatch_jobs_fulfillment_mode_check;
ALTER TABLE public.dispatch_jobs ADD CONSTRAINT dispatch_jobs_fulfillment_mode_check
  CHECK (fulfillment_mode = ANY (ARRAY['ASH_DISPATCH','VENDOR_DISPATCH','SELF_PICKUP','CHOSEN_RIDER','EXTERNAL_RIDER']));
ALTER TABLE public.dispatch_jobs ADD COLUMN IF NOT EXISTS offer_expires_at timestamptz;

-- 2. Shop delivery preferences (default: ASH Dispatch + self pickup only)
CREATE TABLE IF NOT EXISTS public.dispatch_vendor_prefs (
  vendor_id uuid PRIMARY KEY,
  allow_ash_dispatch boolean NOT NULL DEFAULT true,
  allow_chosen_rider boolean NOT NULL DEFAULT false,
  allow_external_rider boolean NOT NULL DEFAULT false,
  allow_vendor_riders boolean NOT NULL DEFAULT false,
  allow_self_pickup boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dispatch_vendor_prefs TO authenticated;
GRANT ALL ON public.dispatch_vendor_prefs TO service_role;
ALTER TABLE public.dispatch_vendor_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY dispatch_vendor_prefs_read ON public.dispatch_vendor_prefs FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.dispatch_mode_allowed(_vendor uuid, _mode text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _mode
    WHEN 'ASH_DISPATCH' THEN coalesce(p.allow_ash_dispatch, true)
    WHEN 'CHOSEN_RIDER' THEN coalesce(p.allow_chosen_rider, false)
    WHEN 'EXTERNAL_RIDER' THEN coalesce(p.allow_external_rider, false)
    WHEN 'VENDOR_DISPATCH' THEN coalesce(p.allow_vendor_riders, false)
    WHEN 'SELF_PICKUP' THEN coalesce(p.allow_self_pickup, true)
    ELSE false END
  FROM (SELECT 1) x LEFT JOIN public.dispatch_vendor_prefs p ON p.vendor_id = _vendor
$$;

CREATE OR REPLACE FUNCTION public.dispatch_vendor_set_prefs(_ash boolean, _chosen boolean, _external boolean, _own boolean, _pickup boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provider_profiles WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'NOT_A_VENDOR'; END IF;
  IF NOT (_ash OR _chosen OR _external OR _own OR _pickup) THEN RAISE EXCEPTION 'NO_METHOD'; END IF;
  INSERT INTO public.dispatch_vendor_prefs AS p (vendor_id, allow_ash_dispatch, allow_chosen_rider, allow_external_rider, allow_vendor_riders, allow_self_pickup)
  VALUES (auth.uid(), _ash, _chosen, _external, _own, _pickup)
  ON CONFLICT (vendor_id) DO UPDATE SET allow_ash_dispatch = _ash, allow_chosen_rider = _chosen,
    allow_external_rider = _external, allow_vendor_riders = _own, allow_self_pickup = _pickup, updated_at = now();
END $$;

-- 3. Request: enforce shop preferences; new modes
CREATE OR REPLACE FUNCTION public.dispatch_request_job(_vendor uuid, _mode text, _pickup text, _dropoff text, _notes text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  IF me = _vendor THEN RAISE EXCEPTION 'CANNOT_ORDER_FROM_SELF'; END IF;
  IF _mode NOT IN ('ASH_DISPATCH','VENDOR_DISPATCH','SELF_PICKUP','CHOSEN_RIDER','EXTERNAL_RIDER') THEN RAISE EXCEPTION 'BAD_MODE'; END IF;
  IF NOT public.dispatch_mode_allowed(_vendor, _mode) THEN RAISE EXCEPTION 'METHOD_NOT_ALLOWED'; END IF;
  IF length(coalesce(_pickup,'')) < 3 OR (_mode <> 'SELF_PICKUP' AND length(coalesce(_dropoff,'')) < 3) THEN RAISE EXCEPTION 'ADDRESS_REQUIRED'; END IF;
  INSERT INTO public.dispatch_jobs(vendor_id, customer_id, fulfillment_mode, service_type, pickup_address, dropoff_address, notes, fee_amount)
  VALUES (_vendor, me, _mode, CASE WHEN _mode = 'SELF_PICKUP' THEN 'SELF_PICKUP' ELSE 'DELIVERY' END,
          _pickup, coalesce(nullif(_dropoff,''), _pickup), left(_notes, 500), 0)
  RETURNING dispatch_jobs.id INTO id;
  PERFORM public.dispatch_log(id, 'REQUESTED', 'CUSTOMER', NULL);
  RETURN id;
END $$;

-- 4. Offer timing: an offer (ASSIGNED) lasts 15 minutes; never counts as assigned until accepted
CREATE OR REPLACE FUNCTION public.dispatch_offer_window()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'ASSIGNED' AND OLD.status IS DISTINCT FROM 'ASSIGNED' THEN
    NEW.offer_expires_at := now() + interval '15 minutes';
  ELSIF NEW.status <> 'ASSIGNED' THEN
    NEW.offer_expires_at := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_dispatch_offer_window ON public.dispatch_jobs;
CREATE TRIGGER trg_dispatch_offer_window BEFORE UPDATE OF status ON public.dispatch_jobs
FOR EACH ROW EXECUTE FUNCTION public.dispatch_offer_window();

-- Rider response: same accept-time guard, plus refuses expired offers
CREATE OR REPLACE FUNCTION public.dispatch_rider_respond(_job uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.rider_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.status <> 'ASSIGNED' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF _accept AND j.offer_expires_at IS NOT NULL AND j.offer_expires_at < now() THEN RAISE EXCEPTION 'OFFER_EXPIRED'; END IF;
  IF _accept THEN
    PERFORM 1 FROM public.dispatch_riders r WHERE r.user_id = auth.uid()
      AND r.is_active AND r.verification_status = 'VERIFIED' AND r.availability_status = 'AVAILABLE' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'RIDER_UNAVAILABLE'; END IF;
    UPDATE public.dispatch_job_assignments SET status = 'ACCEPTED', accepted_at = now() WHERE delivery_id = _job AND rider_user_id = auth.uid() AND status = 'OPEN';
    UPDATE public.dispatch_jobs SET status = 'ACCEPTED' WHERE id = _job;
    PERFORM public.dispatch_log(_job, 'ACCEPTED', 'RIDER', NULL);
  ELSE
    UPDATE public.dispatch_job_assignments SET status = 'REJECTED', rejected_at = now() WHERE delivery_id = _job AND rider_user_id = auth.uid() AND status = 'OPEN';
    UPDATE public.dispatch_jobs SET status = 'REJECTED', rider_user_id = NULL WHERE id = _job;
    PERFORM public.dispatch_log(_job, 'REJECTED', 'RIDER', NULL);
  END IF;
END $$;

-- Release an expired offer so another rider (or ASH Dispatch) can be used
CREATE OR REPLACE FUNCTION public.dispatch_release_expired(_job uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR (auth.uid() IS DISTINCT FROM j.customer_id AND auth.uid() IS DISTINCT FROM j.vendor_id AND NOT public.has_role(auth.uid(),'admin'))
    THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.status <> 'ASSIGNED' OR j.offer_expires_at IS NULL OR j.offer_expires_at >= now() THEN RETURN false; END IF;
  UPDATE public.dispatch_job_assignments SET status = 'REJECTED', rejected_at = now() WHERE delivery_id = _job AND status = 'OPEN';
  UPDATE public.dispatch_jobs SET status = 'REJECTED', rider_user_id = NULL WHERE id = _job;
  PERFORM public.dispatch_log(_job, 'REJECTED', 'SYSTEM', 'offer expired');
  RETURN true;
END $$;

-- 5. Safe rider directory: no licence, phone, plate, documents or location
CREATE OR REPLACE FUNCTION public.dispatch_rider_directory(_city text DEFAULT NULL)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, vehicle_type text, city text, service_zones text[], availability_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.user_id,
    split_part(coalesce(nullif(trim(r.full_name),''),'ASH rider'),' ',1) ||
      CASE WHEN position(' ' in trim(coalesce(r.full_name,''))) > 0
        THEN ' ' || left(split_part(trim(r.full_name),' ',2),1) || '.' ELSE '' END,
    (SELECT pp.avatar_url FROM public.profiles pp WHERE pp.user_id = r.user_id LIMIT 1),
    r.vehicle_type, r.city, coalesce(r.service_zones, '{}'), r.availability_status
  FROM public.dispatch_riders r
  WHERE auth.uid() IS NOT NULL AND r.is_active AND r.verification_status = 'VERIFIED' AND r.availability_status = 'AVAILABLE'
    AND r.user_id <> auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.dispatch_job_assignments a WHERE a.rider_user_id = r.user_id AND a.status IN ('ACCEPTED','IN_PROGRESS'))
    AND (_city IS NULL OR r.city ILIKE _city OR _city = ANY (coalesce(r.service_zones,'{}')))
  ORDER BY r.updated_at DESC LIMIT 50
$$;

-- Customer offers a chosen-rider delivery to a specific eligible rider
CREATE OR REPLACE FUNCTION public.dispatch_offer_chosen_rider(_job uuid, _rider uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.fulfillment_mode <> 'CHOSEN_RIDER' THEN RAISE EXCEPTION 'BAD_MODE'; END IF;
  IF NOT public.dispatch_mode_allowed(j.vendor_id, 'CHOSEN_RIDER') THEN RAISE EXCEPTION 'METHOD_NOT_ALLOWED'; END IF;
  IF j.status NOT IN ('REQUESTED','INVITED','REJECTED') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF j.approved_fee_amount IS DISTINCT FROM j.fee_amount OR j.quote_approved_at IS NULL THEN RAISE EXCEPTION 'QUOTE_NOT_APPROVED'; END IF;
  IF _rider = auth.uid() OR _rider = j.vendor_id THEN RAISE EXCEPTION 'RIDER_UNAVAILABLE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dispatch_riders r WHERE r.user_id = _rider AND r.is_active
      AND r.verification_status = 'VERIFIED' AND r.availability_status = 'AVAILABLE') THEN RAISE EXCEPTION 'RIDER_UNAVAILABLE'; END IF;
  UPDATE public.dispatch_job_assignments SET status = 'CANCELLED' WHERE delivery_id = _job AND status IN ('OPEN','ACCEPTED','IN_PROGRESS');
  INSERT INTO public.dispatch_job_assignments(delivery_id, rider_user_id, vendor_id, status, assigned_by)
  VALUES (_job, _rider, j.vendor_id, 'OPEN', auth.uid())
  ON CONFLICT (delivery_id, rider_user_id) DO UPDATE SET status = 'OPEN', assigned_by = auth.uid(), accepted_at = NULL, rejected_at = NULL;
  UPDATE public.dispatch_jobs SET rider_user_id = _rider, status = 'ASSIGNED' WHERE id = _job;
  PERFORM public.dispatch_log(_job, 'ASSIGNED', 'CUSTOMER', 'chosen rider offered');
END $$;

-- Customer switches a not-yet-accepted delivery between chosen rider and ASH Dispatch
CREATE OR REPLACE FUNCTION public.dispatch_switch_mode(_job uuid, _mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF _mode NOT IN ('ASH_DISPATCH','CHOSEN_RIDER') OR j.fulfillment_mode NOT IN ('ASH_DISPATCH','CHOSEN_RIDER') THEN RAISE EXCEPTION 'BAD_MODE'; END IF;
  IF j.status NOT IN ('REQUESTED','REJECTED') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF NOT public.dispatch_mode_allowed(j.vendor_id, _mode) THEN RAISE EXCEPTION 'METHOD_NOT_ALLOWED'; END IF;
  UPDATE public.dispatch_jobs SET fulfillment_mode = _mode WHERE id = _job;
  PERFORM public.dispatch_log(_job, j.status, 'CUSTOMER', 'method ' || _mode);
END $$;

-- 6. Externally managed riders (no ASH account, no live map)
CREATE TABLE IF NOT EXISTS public.dispatch_external_riders (
  delivery_id uuid PRIMARY KEY REFERENCES public.dispatch_jobs(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 100),
  phone text NOT NULL CHECK (length(phone) BETWEEN 6 AND 25),
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('FOOT','BICYCLE','MOTORCYCLE','CAR','VAN')),
  vehicle_plate text CHECK (vehicle_plate IS NULL OR length(vehicle_plate) <= 20),
  note text CHECK (note IS NULL OR length(note) <= 300),
  provided_by uuid NOT NULL,
  picked_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dispatch_external_riders TO authenticated;
GRANT ALL ON public.dispatch_external_riders TO service_role;
ALTER TABLE public.dispatch_external_riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY dispatch_external_riders_read ON public.dispatch_external_riders FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.dispatch_jobs j WHERE j.id = delivery_id
    AND (j.customer_id = auth.uid() OR j.vendor_id = auth.uid())));

CREATE OR REPLACE FUNCTION public.dispatch_set_external_rider(_job uuid, _name text, _phone text, _vehicle text, _plate text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR (j.customer_id IS DISTINCT FROM auth.uid() AND j.vendor_id IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.fulfillment_mode <> 'EXTERNAL_RIDER' THEN RAISE EXCEPTION 'BAD_MODE'; END IF;
  IF j.status <> 'REQUESTED' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF length(trim(coalesce(_name,''))) < 2 OR length(regexp_replace(coalesce(_phone,''),'\D','','g')) < 6 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  INSERT INTO public.dispatch_external_riders(delivery_id, full_name, phone, vehicle_type, vehicle_plate, note, provided_by)
  VALUES (_job, trim(_name), trim(_phone), _vehicle, nullif(trim(coalesce(_plate,'')),''), nullif(left(trim(coalesce(_note,'')),300),''), auth.uid())
  ON CONFLICT (delivery_id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, vehicle_type = EXCLUDED.vehicle_type,
    vehicle_plate = EXCLUDED.vehicle_plate, note = EXCLUDED.note, provided_by = EXCLUDED.provided_by
  WHERE public.dispatch_external_riders.picked_up_at IS NULL;
  PERFORM public.dispatch_log(_job, 'REQUESTED', CASE WHEN j.customer_id = auth.uid() THEN 'CUSTOMER' ELSE 'VENDOR' END, 'external rider set');
END $$;

-- Shop hands the order to the external rider after checking the customer's one-time collection code
CREATE OR REPLACE FUNCTION public.dispatch_external_pickup(_job uuid, _code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE; v public.dispatch_pickup_verifications%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.vendor_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.fulfillment_mode <> 'EXTERNAL_RIDER' OR j.status <> 'REQUESTED' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dispatch_external_riders WHERE delivery_id = _job) THEN RAISE EXCEPTION 'RIDER_DETAILS_MISSING'; END IF;
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
  UPDATE public.dispatch_external_riders SET picked_up_at = now() WHERE delivery_id = _job;
  UPDATE public.dispatch_jobs SET status = 'IN_TRANSIT' WHERE id = _job;
  PERFORM public.dispatch_log(_job, 'PICKUP_CONFIRMED', 'VENDOR', 'handed to external rider');
  PERFORM public.dispatch_log(_job, 'IN_TRANSIT', 'VENDOR', NULL);
  RETURN 'OK';
END $$;

-- Customer confirms receipt of an externally managed delivery
CREATE OR REPLACE FUNCTION public.dispatch_external_delivered(_job uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j public.dispatch_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.dispatch_jobs WHERE id = _job FOR UPDATE;
  IF NOT FOUND OR j.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF j.fulfillment_mode <> 'EXTERNAL_RIDER' OR j.status <> 'IN_TRANSIT' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  UPDATE public.dispatch_jobs SET status = 'DELIVERED' WHERE id = _job;
  PERFORM public.dispatch_log(_job, 'DELIVERED', 'CUSTOMER', 'received from external rider');
END $$;

REVOKE ALL ON FUNCTION public.dispatch_mode_allowed(uuid,text), public.dispatch_vendor_set_prefs(boolean,boolean,boolean,boolean,boolean),
  public.dispatch_release_expired(uuid), public.dispatch_rider_directory(text), public.dispatch_offer_chosen_rider(uuid,uuid),
  public.dispatch_switch_mode(uuid,text), public.dispatch_set_external_rider(uuid,text,text,text,text,text),
  public.dispatch_external_pickup(uuid,text), public.dispatch_external_delivered(uuid), public.dispatch_offer_window() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_mode_allowed(uuid,text), public.dispatch_vendor_set_prefs(boolean,boolean,boolean,boolean,boolean),
  public.dispatch_release_expired(uuid), public.dispatch_rider_directory(text), public.dispatch_offer_chosen_rider(uuid,uuid),
  public.dispatch_switch_mode(uuid,text), public.dispatch_set_external_rider(uuid,text,text,text,text,text),
  public.dispatch_external_pickup(uuid,text), public.dispatch_external_delivered(uuid) TO authenticated;
