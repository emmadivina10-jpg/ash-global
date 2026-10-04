ALTER TABLE public.staff_accounts
  ADD COLUMN IF NOT EXISTS employee_name text,
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS extra_departments text[] NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS staff_accounts_employee_id_key ON public.staff_accounts(employee_id) WHERE employee_id IS NOT NULL;
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS staff_id uuid;
CREATE INDEX IF NOT EXISTS support_ticket_messages_staff_idx ON public.support_ticket_messages(staff_id, created_at);
ALTER TABLE public.staff_targets
  ADD COLUMN IF NOT EXISTS kpi_label text,
  ADD COLUMN IF NOT EXISTS kpi_target integer;