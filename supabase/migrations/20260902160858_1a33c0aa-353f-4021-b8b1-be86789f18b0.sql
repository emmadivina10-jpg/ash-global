CREATE TABLE public.staff_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  username text NOT NULL UNIQUE,
  email text,
  phone text,
  password_hash text NOT NULL,
  department text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_department_valid CHECK (department IN (
    'SUPER_ADMIN','SUPPORT','GROWTH','SALES','MARKETPLACE_OPS','ADVERTISING',
    'PARTNERSHIPS','CONTENT','MERCHANT','EXPANSION','REVENUE','TRUST'
  ))
);
GRANT ALL ON public.staff_accounts TO service_role;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lead_type text NOT NULL DEFAULT 'BUSINESS',
  category text,
  city text,
  country text NOT NULL DEFAULT 'CM',
  phone text,
  whatsapp text,
  email text,
  source text,
  notes text,
  department text NOT NULL DEFAULT 'GROWTH',
  stage text NOT NULL DEFAULT 'NEW',
  value integer NOT NULL DEFAULT 0,
  assigned_to uuid REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  next_follow_up date,
  last_contacted_at timestamptz,
  converted_user_id uuid,
  converted_provider_id uuid,
  created_by uuid REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_stage_valid CHECK (stage IN (
    'NEW','CONTACTED','INTERESTED','PROPOSAL','REGISTERED','VERIFIED','PAID','LOST'
  )),
  CONSTRAINT leads_type_valid CHECK (lead_type IN (
    'BUSINESS','PROVIDER','CREATOR','MERCHANT','PARTNER','ADVERTISER','USER'
  ))
);
CREATE INDEX leads_department_stage_idx ON public.leads (department, stage);
CREATE INDEX leads_assigned_idx ON public.leads (assigned_to);
CREATE INDEX leads_city_idx ON public.leads (city);
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  staff_name text NOT NULL DEFAULT 'Super admin',
  kind text NOT NULL DEFAULT 'NOTE',
  body text,
  stage_from text,
  stage_to text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_activities_lead_idx ON public.lead_activities (lead_id, created_at DESC);
CREATE INDEX lead_activities_staff_idx ON public.lead_activities (staff_id, created_at DESC);
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  period text NOT NULL DEFAULT 'DAILY',
  contacts_target integer NOT NULL DEFAULT 0,
  recruits_target integer NOT NULL DEFAULT 0,
  deals_target integer NOT NULL DEFAULT 0,
  revenue_target integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, period),
  CONSTRAINT staff_targets_period_valid CHECK (period IN ('DAILY','MONTHLY'))
);
GRANT ALL ON public.staff_targets TO service_role;
ALTER TABLE public.staff_targets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  target_user_id uuid,
  ticket_id uuid,
  lead_id uuid,
  recipient text NOT NULL,
  subject text,
  body text NOT NULL,
  template_key text,
  staff_id uuid REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  staff_name text NOT NULL DEFAULT 'Super admin',
  delivered boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_channel_valid CHECK (channel IN ('EMAIL','WHATSAPP','SMS','CALL'))
);
CREATE INDEX outreach_log_created_idx ON public.outreach_log (created_at DESC);
GRANT ALL ON public.outreach_log TO service_role;
ALTER TABLE public.outreach_log ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER staff_accounts_touch BEFORE UPDATE ON public.staff_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER leads_touch BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER staff_targets_touch BEFORE UPDATE ON public.staff_targets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();