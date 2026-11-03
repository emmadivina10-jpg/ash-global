-- Rollback for dispatch_phase3_accept_guard.sql: restores the live accept action and removes the two location actions.
DROP FUNCTION IF EXISTS public.dispatch_job_rider_location(uuid);
DROP FUNCTION IF EXISTS public.dispatch_rider_update_location(double precision, double precision);
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
