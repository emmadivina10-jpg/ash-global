CREATE TABLE public.department_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  title text NOT NULL,
  detail text,
  due_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  status text NOT NULL DEFAULT 'OPEN',
  priority text NOT NULL DEFAULT 'NORMAL',
  source text NOT NULL DEFAULT 'ADMIN',
  created_by text,
  completed_by text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT department_tasks_unique_daily UNIQUE (department, due_date, title)
);

GRANT ALL ON public.department_tasks TO service_role;
ALTER TABLE public.department_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Console only via service role" ON public.department_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX department_tasks_dept_due_idx ON public.department_tasks (department, due_date DESC);

CREATE TRIGGER department_tasks_touch
BEFORE UPDATE ON public.department_tasks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.staff_channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'GENERAL',
  author_name text NOT NULL,
  author_department text NOT NULL,
  author_staff_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.staff_channel_messages TO service_role;
ALTER TABLE public.staff_channel_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Console only via service role" ON public.staff_channel_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX staff_channel_messages_channel_idx ON public.staff_channel_messages (channel, created_at DESC);