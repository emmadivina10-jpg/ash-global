CREATE TABLE public.provider_balance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'TCHOKOPAY',
  available_balance numeric(14,2),
  currency text NOT NULL DEFAULT 'XAF',
  ok boolean NOT NULL,
  error text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.provider_balance_snapshots TO service_role;
ALTER TABLE public.provider_balance_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all" ON public.provider_balance_snapshots FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL,
  triggered_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'RUNNING',
  provider_balance numeric(14,2),
  wallet_liabilities numeric(14,2),
  discrepancy_count integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT ALL ON public.reconciliation_runs TO service_role;
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all" ON public.reconciliation_runs FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.reconciliation_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE,
  kind text NOT NULL,
  reference text,
  user_id uuid,
  expected numeric(14,2),
  actual numeric(14,2),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reconciliation_discrepancies TO service_role;
ALTER TABLE public.reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all" ON public.reconciliation_discrepancies FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE INDEX ON public.reconciliation_discrepancies(run_id);