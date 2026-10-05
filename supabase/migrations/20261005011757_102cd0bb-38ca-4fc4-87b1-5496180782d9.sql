CREATE SEQUENCE IF NOT EXISTS public.ops_case_seq;
CREATE TABLE public.ops_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number int NOT NULL DEFAULT nextval('public.ops_case_seq') UNIQUE,
  title text NOT NULL,
  customer_name text,
  customer_user_id uuid,
  status text NOT NULL DEFAULT 'OPEN',
  priority text NOT NULL DEFAULT 'NORMAL',
  departments text[] NOT NULL DEFAULT '{}',
  staff_ids uuid[] NOT NULL DEFAULT '{}',
  ticket_ids uuid[] NOT NULL DEFAULT '{}',
  report_ids uuid[] NOT NULL DEFAULT '{}',
  resolution text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ops_cases TO service_role;
GRANT USAGE ON SEQUENCE public.ops_case_seq TO service_role;
ALTER TABLE public.ops_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff console only" ON public.ops_cases FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.ops_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.ops_cases(id) ON DELETE CASCADE,
  kind text NOT NULL,
  body text NOT NULL,
  staff_id uuid,
  staff_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ops_case_events TO service_role;
ALTER TABLE public.ops_case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff console only" ON public.ops_case_events FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.ops_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_category text,
  steps jsonb NOT NULL DEFAULT '[]',
  active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ops_workflows TO service_role;
ALTER TABLE public.ops_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff console only" ON public.ops_workflows FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.ops_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.ops_workflows(id) ON DELETE CASCADE,
  workflow_name text NOT NULL,
  ticket_id uuid,
  case_id uuid REFERENCES public.ops_cases(id) ON DELETE SET NULL,
  step_index int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  current_department text,
  assigned_staff_id uuid,
  due_at timestamptz,
  history jsonb NOT NULL DEFAULT '[]',
  started_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ops_workflow_runs TO service_role;
ALTER TABLE public.ops_workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff console only" ON public.ops_workflow_runs FOR ALL USING (false) WITH CHECK (false);