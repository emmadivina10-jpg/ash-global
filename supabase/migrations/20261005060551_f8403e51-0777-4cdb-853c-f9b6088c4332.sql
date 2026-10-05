CREATE TABLE public.shareholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'Shareholder',
  ownership_pct numeric(7,4) NOT NULL CHECK (ownership_pct >= 0 AND ownership_pct <= 100),
  investment_committed numeric(14,2),
  investment_received numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  payment_status text NOT NULL DEFAULT 'NOT_RECEIVED',
  allocation_status text NOT NULL DEFAULT 'ALLOCATED',
  agreement_status text NOT NULL DEFAULT 'PENDING',
  allocation_date date,
  transaction_reference text,
  is_founder boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.shareholders TO service_role;
ALTER TABLE public.shareholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server only" ON public.shareholders FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.shareholder_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shareholder_id uuid REFERENCES public.shareholders(id) ON DELETE RESTRICT,
  kind text NOT NULL,
  detail text,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.shareholder_events TO service_role;
ALTER TABLE public.shareholder_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server only" ON public.shareholder_events FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.shareholder_events_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Shareholder history is append-only'; END; $$;
CREATE TRIGGER shareholder_events_no_change BEFORE UPDATE OR DELETE ON public.shareholder_events
FOR EACH ROW EXECUTE FUNCTION public.shareholder_events_append_only();

CREATE OR REPLACE FUNCTION public.shareholders_cap_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT coalesce(sum(ownership_pct),0) FROM public.shareholders WHERE id <> NEW.id) + NEW.ownership_pct > 100 THEN
    RAISE EXCEPTION 'Total issued ownership cannot exceed 100%%';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END; $$;
CREATE TRIGGER shareholders_cap BEFORE INSERT OR UPDATE ON public.shareholders
FOR EACH ROW EXECUTE FUNCTION public.shareholders_cap_guard();

INSERT INTO public.shareholders (id, user_id, display_name, role, ownership_pct, investment_committed, investment_received, currency, payment_status, allocation_status, agreement_status, is_founder)
VALUES
 ('00000000-0000-4000-a000-000000000001', NULL, 'Emmanuel Tanga Divine', 'Founder & CEO', 99, NULL, 0, 'CAD', 'NOT_APPLICABLE', 'ALLOCATED', 'NOT_APPLICABLE', true),
 ('00000000-0000-4000-a000-000000000002', 'c8451843-2afd-4ba2-9316-3faa6ac42a9d', 'Fabrice', 'Shareholder', 1, 5000, 0, 'CAD', 'NOT_RECEIVED', 'ALLOCATED_PENDING_PAYMENT', 'PENDING', false);

INSERT INTO public.shareholder_events (shareholder_id, kind, detail, actor) VALUES
 ('00000000-0000-4000-a000-000000000001', 'CAP_TABLE_CREATED', 'Initial cap table: 99% Founder & CEO', 'SYSTEM (CEO instruction)'),
 ('00000000-0000-4000-a000-000000000002', 'CAP_TABLE_CREATED', 'Initial cap table: 1%; CAD 5,000 committed, nothing received', 'SYSTEM (CEO instruction)');