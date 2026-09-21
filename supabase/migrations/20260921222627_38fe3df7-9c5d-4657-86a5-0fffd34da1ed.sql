ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS member_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_read_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_support_ticket_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at,
      member_read_at = CASE WHEN NEW.sender = 'CUSTOMER' THEN NEW.created_at ELSE member_read_at END,
      admin_read_at = CASE WHEN NEW.sender = 'ADMIN' THEN NEW.created_at ELSE admin_read_at END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_message_touches_ticket ON public.support_ticket_messages;
CREATE TRIGGER support_message_touches_ticket
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket_on_message();

CREATE INDEX IF NOT EXISTS support_tickets_member_unread_idx
  ON public.support_tickets (user_id, last_message_at DESC)
  WHERE user_id IS NOT NULL;