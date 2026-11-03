-- ROLLBACK for dispatch_access_rules.sql. Returns the dispatch tables to today's locked state
-- (RLS on, no policies). Leaves the new columns in place (harmless, nullable/defaulted).
DROP FUNCTION IF EXISTS public.dispatch_request_job(uuid, text, text, text, text), public.dispatch_set_quote(uuid, numeric),
  public.dispatch_approve_quote(uuid, numeric), public.dispatch_assign_rider(uuid, uuid), public.dispatch_rider_respond(uuid, boolean),
  public.dispatch_rider_progress(uuid, text), public.dispatch_issue_handover_code(uuid), public.dispatch_complete_with_code(uuid, text),
  public.dispatch_cancel(uuid, text), public.dispatch_log(uuid, text, text, text);
DROP POLICY IF EXISTS dispatch_riders_read ON public.dispatch_riders;
DROP POLICY IF EXISTS dispatch_vendor_riders_read ON public.dispatch_vendor_riders;
DROP POLICY IF EXISTS dispatch_jobs_read ON public.dispatch_jobs;
DROP POLICY IF EXISTS dispatch_assignments_read ON public.dispatch_job_assignments;
DROP POLICY IF EXISTS dispatch_events_read ON public.dispatch_job_events;
DROP INDEX IF EXISTS public.dispatch_one_live_assignment;
-- Table grants are intentionally NOT restored: with no policies, RLS already blocks all member access.
