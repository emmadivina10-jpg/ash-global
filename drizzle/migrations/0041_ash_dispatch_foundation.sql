-- ASH Dispatch RLS and authorization rules
-- These policies are SQL-first and can be applied to a local Supabase/PostgreSQL test database.

CREATE OR REPLACE FUNCTION public.is_dispatch_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_accounts sa
    WHERE sa.user_id = _uid AND sa.is_active = true
      AND (
        sa.department IN ('OPERATIONS', 'SUPPORT', 'CYBERSECURITY', 'SUPER_ADMIN')
        OR 'OPERATIONS' = ANY (COALESCE(sa.extra_departments, ARRAY[]::text[]))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_dispatch_vendor_owner(_vendor_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendor_profiles vp
    WHERE vp.user_id = _vendor_id
      AND vp.owner_user_id = _uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_dispatch_rider_self(_uid uuid, _rider_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT _uid = _rider_user_id;
$$;

ALTER TABLE public.dispatch_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_vendor_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_pickup_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dispatch_riders_select_policy ON public.dispatch_riders;
CREATE POLICY dispatch_riders_select_policy ON public.dispatch_riders
FOR SELECT TO authenticated
USING (
  is_dispatch_admin(auth.uid())
  OR user_id = auth.uid()
  OR vendor_id = auth.uid()
);

DROP POLICY IF EXISTS dispatch_riders_insert_policy ON public.dispatch_riders;
CREATE POLICY dispatch_riders_insert_policy ON public.dispatch_riders
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR is_dispatch_admin(auth.uid())
);

DROP POLICY IF EXISTS dispatch_riders_update_policy ON public.dispatch_riders;
CREATE POLICY dispatch_riders_update_policy ON public.dispatch_riders
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR is_dispatch_admin(auth.uid())
)
WITH CHECK (
  user_id = auth.uid() OR is_dispatch_admin(auth.uid())
);

DROP POLICY IF EXISTS dispatch_vendor_riders_select_policy ON public.dispatch_vendor_riders;
CREATE POLICY dispatch_vendor_riders_select_policy ON public.dispatch_vendor_riders
FOR SELECT TO authenticated
USING (
  is_dispatch_admin(auth.uid())
  OR vendor_id = auth.uid()
  OR rider_user_id = auth.uid()
);

DROP POLICY IF EXISTS dispatch_vendor_riders_insert_policy ON public.dispatch_vendor_riders;
CREATE POLICY dispatch_vendor_riders_insert_policy ON public.dispatch_vendor_riders
FOR INSERT TO authenticated
WITH CHECK (
  vendor_id = auth.uid() OR is_dispatch_admin(auth.uid()) OR rider_user_id = auth.uid()
);

DROP POLICY IF EXISTS dispatch_jobs_select_policy ON public.dispatch_jobs;
CREATE POLICY dispatch_jobs_select_policy ON public.dispatch_jobs
FOR SELECT TO authenticated
USING (
  is_dispatch_admin(auth.uid())
  OR vendor_id = auth.uid()
  OR customer_id = auth.uid()
  OR rider_user_id = auth.uid()
);

DROP POLICY IF EXISTS dispatch_jobs_insert_policy ON public.dispatch_jobs;
CREATE POLICY dispatch_jobs_insert_policy ON public.dispatch_jobs
FOR INSERT TO authenticated
WITH CHECK (
  customer_id = auth.uid() OR is_dispatch_admin(auth.uid()) OR vendor_id = auth.uid()
);

DROP POLICY IF EXISTS dispatch_jobs_update_policy ON public.dispatch_jobs;
CREATE POLICY dispatch_jobs_update_policy ON public.dispatch_jobs
FOR UPDATE TO authenticated
USING (
  is_dispatch_admin(auth.uid())
  OR vendor_id = auth.uid()
  OR customer_id = auth.uid()
  OR rider_user_id = auth.uid()
)
WITH CHECK (
  is_dispatch_admin(auth.uid())
  OR vendor_id = auth.uid()
  OR customer_id = auth.uid()
  OR rider_user_id = auth.uid()
);

DROP POLICY IF EXISTS dispatch_job_assignments_select_policy ON public.dispatch_job_assignments;
CREATE POLICY dispatch_job_assignments_select_policy ON public.dispatch_job_assignments
FOR SELECT TO authenticated
USING (
  is_dispatch_admin(auth.uid())
  OR vendor_id = auth.uid()
  OR rider_user_id = auth.uid()
);

DROP POLICY IF EXISTS dispatch_job_assignments_insert_policy ON public.dispatch_job_assignments;
CREATE POLICY dispatch_job_assignments_insert_policy ON public.dispatch_job_assignments
FOR INSERT TO authenticated
WITH CHECK (
  is_dispatch_admin(auth.uid()) OR vendor_id = auth.uid() OR rider_user_id = auth.uid()
);

DROP POLICY IF EXISTS dispatch_job_events_select_policy ON public.dispatch_job_events;
CREATE POLICY dispatch_job_events_select_policy ON public.dispatch_job_events
FOR SELECT TO authenticated
USING (
  is_dispatch_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.dispatch_jobs dj
    WHERE dj.id = delivery_id AND (
      dj.vendor_id = auth.uid() OR dj.customer_id = auth.uid() OR dj.rider_user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS dispatch_pickup_verifications_select_policy ON public.dispatch_pickup_verifications;
CREATE POLICY dispatch_pickup_verifications_select_policy ON public.dispatch_pickup_verifications
FOR SELECT TO authenticated
USING (
  is_dispatch_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.dispatch_jobs dj
    WHERE dj.id = delivery_id AND (
      dj.vendor_id = auth.uid() OR dj.customer_id = auth.uid() OR dj.rider_user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS dispatch_pickup_verifications_insert_policy ON public.dispatch_pickup_verifications;
CREATE POLICY dispatch_pickup_verifications_insert_policy ON public.dispatch_pickup_verifications
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() OR is_dispatch_admin(auth.uid())
);
