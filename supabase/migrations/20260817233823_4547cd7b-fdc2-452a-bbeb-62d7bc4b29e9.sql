-- 1. Admin audit log (immutable, service-role only)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL DEFAULT 'CONSOLE',
  action text NOT NULL,
  target_user_id uuid,
  target_reference text,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read audit log" ON public.admin_audit_log;
CREATE POLICY "admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.admin_audit_log TO authenticated;

DROP TRIGGER IF EXISTS trg_admin_audit_immutable_update ON public.admin_audit_log;
CREATE TRIGGER trg_admin_audit_immutable_update BEFORE UPDATE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_change();
DROP TRIGGER IF EXISTS trg_admin_audit_immutable_delete ON public.admin_audit_log;
CREATE TRIGGER trg_admin_audit_immutable_delete BEFORE DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_change();

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

-- 2. Payment provider event log (webhook + reconcile deliveries, dedup evidence)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  reference text,
  status text,
  signature_verified boolean NOT NULL DEFAULT false,
  outcome text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS payment_events_created_idx ON public.payment_events (created_at DESC);
CREATE INDEX IF NOT EXISTS payment_events_reference_idx ON public.payment_events (reference);

-- 3. Manual administrative activation (service-role only, audited, no fake payment record)
CREATE OR REPLACE FUNCTION public.admin_manual_activate(
  _user_id uuid,
  _reason text,
  _actor text DEFAULT 'CONSOLE'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prev text;
BEGIN
  IF coalesce(trim(_reason), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'REASON_REQUIRED');
  END IF;

  SELECT account_status INTO prev FROM public.profiles WHERE user_id = _user_id;
  IF prev IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND'); END IF;
  IF prev = 'ACTIVE' THEN RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_ACTIVE'); END IF;

  UPDATE public.profiles SET account_status = 'ACTIVE', updated_at = now() WHERE user_id = _user_id;

  -- Administrative policy: no payment was received, so no referral commission is paid.
  UPDATE public.referrals
     SET activation_status = 'ACTIVE',
         activated_at = coalesce(activated_at, now()),
         commission_status = 'SKIPPED'
   WHERE referred_user_id = _user_id AND commission_status = 'PENDING';

  INSERT INTO public.admin_audit_log (actor, action, target_user_id, previous_state, new_state, reason, metadata)
  VALUES (_actor, 'MANUAL_ACTIVATION', _user_id,
          jsonb_build_object('account_status', prev),
          jsonb_build_object('account_status', 'ACTIVE', 'activation_source', 'ADMIN_MANUAL'),
          _reason,
          jsonb_build_object('commission_policy', 'SKIPPED_NO_PAYMENT'));

  PERFORM public.notify_user(_user_id, 'ACTIVATION', 'Your account is active',
    'An administrator activated your ASH Glo account.', jsonb_build_object('source', 'ADMIN_MANUAL'));

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_manual_activate(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manual_activate(uuid, text, text) TO service_role;