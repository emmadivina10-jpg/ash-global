CREATE TABLE public.expansion_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  market text NOT NULL,
  category text,
  potential_partners text,
  estimated_size text,
  research_notes text,
  competition text,
  risks text,
  required_resources text,
  launch_requirements text,
  assigned_departments text[] NOT NULL DEFAULT '{}',
  priority text NOT NULL DEFAULT 'NORMAL',
  target_launch_date date,
  stage text NOT NULL DEFAULT 'NEW',
  created_by_staff_id uuid,
  created_by_name text,
  submitted_to_ceo_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.expansion_opportunities TO service_role;
ALTER TABLE public.expansion_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff console only" ON public.expansion_opportunities FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.expansion_opportunity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.expansion_opportunities(id) ON DELETE CASCADE,
  kind text NOT NULL,
  body text,
  actor_name text,
  actor_staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.expansion_opportunity_events TO service_role;
ALTER TABLE public.expansion_opportunity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff console only" ON public.expansion_opportunity_events FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE INDEX ON public.expansion_opportunity_events(opportunity_id, created_at);

ALTER TABLE public.department_tasks ADD COLUMN IF NOT EXISTS expansion_opportunity_id uuid REFERENCES public.expansion_opportunities(id) ON DELETE SET NULL;

CREATE TRIGGER expansion_opportunities_touch BEFORE UPDATE ON public.expansion_opportunities
FOR EACH ROW EXECUTE FUNCTION public.campus_touch_updated_at();

UPDATE public.staff_accounts SET employee_id = 'ASH-EXP-011', position = 'Expansion Officer'
WHERE id = 'e5eaf053-b453-426a-ae09-c39b0083ad41';