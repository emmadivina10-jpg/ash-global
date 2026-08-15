CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX account_deletion_requests_pending_uniq
  ON public.account_deletion_requests (user_id)
  WHERE status = 'PENDING';

GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own deletion requests"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own deletion request"
  ON public.account_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'PENDING');

CREATE POLICY "Admins update deletion requests"
  ON public.account_deletion_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER account_deletion_requests_touch
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();