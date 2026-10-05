-- Employee terms acceptance (versioned)
CREATE TABLE public.employee_terms_acceptance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (staff_id, terms_version)
);
GRANT ALL ON public.employee_terms_acceptance TO service_role;
ALTER TABLE public.employee_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Staff notification center
CREATE TABLE public.staff_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  department TEXT,
  type TEXT NOT NULL DEFAULT 'GENERAL',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_notifications TO service_role;
ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX staff_notifications_staff_idx ON public.staff_notifications (staff_id, read_at);
CREATE INDEX staff_notifications_dept_idx ON public.staff_notifications (department, read_at);

-- Ticket assignment / escalation fields on the existing support tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_department TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS escalation_note TEXT,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE;

-- Internal employee notes on tickets (never customer-visible)
CREATE TABLE public.ticket_internal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  staff_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT ALL ON public.ticket_internal_notes TO service_role;
ALTER TABLE public.ticket_internal_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX ticket_internal_notes_ticket_idx ON public.ticket_internal_notes (ticket_id, created_at);

-- Direct staff-to-staff messages
CREATE TABLE public.staff_direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_staff_id UUID REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  from_name TEXT,
  to_staff_id UUID NOT NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_direct_messages TO service_role;
ALTER TABLE public.staff_direct_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX staff_direct_messages_pair_idx ON public.staff_direct_messages (to_staff_id, read_at);