-- ROLLBACK for dispatch_riders_phase2.sql. Restores the phase-1 live state.
-- Run only while dispatch_riders / invites / documents hold no data that must be kept.
DROP FUNCTION IF EXISTS public.dispatch_rider_register(text,text,text,text,text,text,text,text), public.dispatch_rider_add_document(text,text),
  public.dispatch_rider_submit_verification(), public.dispatch_rider_review(uuid,text,text), public.dispatch_rider_set_availability(text),
  public.dispatch_rider_set_zones(text[]), public.dispatch_vendor_create_invite(), public.dispatch_vendor_list_invites(),
  public.dispatch_vendor_revoke_invite(uuid), public.dispatch_rider_redeem_invite(text), public.dispatch_vendor_set_rider_status(uuid,text),
  public.dispatch_rider_leave_vendor(uuid);

-- Restore the phase-1 assignment rule (no verification requirement).
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

DROP POLICY IF EXISTS dispatch_riders_read ON public.dispatch_riders;
CREATE POLICY dispatch_riders_read ON public.dispatch_riders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS rider_documents_insert ON storage.objects;
DROP POLICY IF EXISTS rider_documents_read ON storage.objects;
-- The empty private bucket 'rider-documents' is left in place (harmless; no public access).

DROP TABLE IF EXISTS public.dispatch_rider_invites;
DROP TABLE IF EXISTS public.dispatch_rider_documents;

ALTER TABLE public.dispatch_riders ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.dispatch_riders ALTER COLUMN availability_status SET DEFAULT 'AVAILABLE';
ALTER TABLE public.dispatch_riders DROP COLUMN IF EXISTS full_name, DROP COLUMN IF EXISTS verification_status,
  DROP COLUMN IF EXISTS verification_note, DROP COLUMN IF EXISTS verified_by, DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS vehicle_plate, DROP COLUMN IF EXISTS vehicle_model, DROP COLUMN IF EXISTS vehicle_color,
  DROP COLUMN IF EXISTS service_zones;
