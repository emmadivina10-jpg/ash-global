CREATE TABLE public.support_ticket_reads (
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, staff_id)
);
GRANT ALL ON public.support_ticket_reads TO service_role;
ALTER TABLE public.support_ticket_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff console only" ON public.support_ticket_reads FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);