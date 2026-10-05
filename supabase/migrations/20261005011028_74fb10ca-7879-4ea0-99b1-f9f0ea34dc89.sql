ALTER TABLE public.staff_accounts
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'OFFLINE',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS identity_confirmed_at timestamptz;

ALTER TABLE public.department_tasks
  ADD COLUMN IF NOT EXISTS assigned_staff_id uuid REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_customer text,
  ADD COLUMN IF NOT EXISTS related_ticket_id uuid,
  ADD COLUMN IF NOT EXISTS progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'NONE';

CREATE TABLE public.staff_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.department_tasks(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  staff_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_task_comments TO service_role;
ALTER TABLE public.staff_task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff console only" ON public.staff_task_comments FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.staff_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  department text NOT NULL,
  report_date date NOT NULL DEFAULT current_date,
  accomplished text,
  problems text,
  unfinished text,
  help_needed text,
  management_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, report_date)
);
GRANT ALL ON public.staff_daily_reports TO service_role;
ALTER TABLE public.staff_daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff console only" ON public.staff_daily_reports FOR ALL USING (false) WITH CHECK (false);