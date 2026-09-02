CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_status_chk CHECK (status IN ('OPEN','PENDING','RESOLVED')),
  CONSTRAINT support_tickets_priority_chk CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT'))
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_ticket_messages_sender_chk CHECK (sender IN ('CUSTOMER','ADMIN'))
);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx ON public.support_ticket_messages (ticket_id, created_at);

GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their own tickets" ON public.support_tickets;
CREATE POLICY "Members read their own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members read messages on their tickets" ON public.support_ticket_messages;
CREATE POLICY "Members read messages on their tickets"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_ticket_messages.ticket_id AND t.user_id = auth.uid()
  ));

DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();