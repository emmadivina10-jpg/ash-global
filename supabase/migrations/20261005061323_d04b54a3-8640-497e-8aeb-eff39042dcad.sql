CREATE TABLE public.company_valuation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  valuation NUMERIC NOT NULL CHECK (valuation > 0),
  currency TEXT NOT NULL DEFAULT 'CAD',
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by TEXT
);
GRANT SELECT ON public.company_valuation TO authenticated;
GRANT ALL ON public.company_valuation TO service_role;
ALTER TABLE public.company_valuation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view valuation" ON public.company_valuation FOR SELECT TO authenticated USING (true);
INSERT INTO public.company_valuation (valuation, currency, approved_by) VALUES (500000, 'CAD', 'CEO Emmanuel Tanga Divine');