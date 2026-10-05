CREATE TABLE public.expansion_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.expansion_opportunities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  market_size TEXT,
  demand TEXT,
  competition_level TEXT NOT NULL DEFAULT 'UNKNOWN',
  competition_detail TEXT,
  entry_barriers TEXT,
  regulations TEXT,
  customer_segments TEXT,
  pricing_insights TEXT,
  sources TEXT,
  findings TEXT,
  recommendation TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by_staff_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.expansion_research TO service_role;
ALTER TABLE public.expansion_research ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff console only" ON public.expansion_research FOR ALL USING (false) WITH CHECK (false);