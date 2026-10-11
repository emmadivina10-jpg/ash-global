ALTER TABLE public.access_fingerprints ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS lat double precision, ADD COLUMN IF NOT EXISTS lng double precision;

CREATE TABLE public.security_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL CHECK (period IN ('DAILY','WEEKLY')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  summary text NOT NULL,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by text NOT NULL,
  sent_to_ceo_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_reports TO service_role;
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all security_reports" ON public.security_reports FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE TABLE public.security_transaction_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('WITHDRAWAL','PAYMENT','BOOKING')),
  ref text NOT NULL,
  reason text NOT NULL,
  ops_case_id uuid,
  created_by text NOT NULL,
  released_at timestamptz,
  released_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_transaction_holds TO service_role;
ALTER TABLE public.security_transaction_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all security_transaction_holds" ON public.security_transaction_holds FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);