-- 1. Device push tokens ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage their own devices" ON public.push_tokens;
CREATE POLICY "Members manage their own devices"
  ON public.push_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens (user_id);

-- 2. Withdrawal decision notifications ------------------------------------
CREATE OR REPLACE FUNCTION public.notify_withdrawal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  title text;
  body text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'APPROVED' THEN
    title := 'Withdrawal approved';
    body := 'Your withdrawal of ' || NEW.amount || ' ' || NEW.currency || ' was approved and is being sent.';
  ELSIF NEW.status = 'PAID' THEN
    title := 'Withdrawal paid';
    body := NEW.amount || ' ' || NEW.currency || ' has been sent to your ' || replace(NEW.payment_method, '_', ' ') || ' account.';
  ELSIF NEW.status = 'REJECTED' THEN
    title := 'Withdrawal declined';
    body := coalesce(nullif(NEW.admin_note, ''), 'Your withdrawal request was declined. Contact support for details.');
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.notify_user(NEW.user_id, 'WITHDRAWAL', title, body,
    jsonb_build_object('withdrawal_id', NEW.id, 'status', NEW.status, 'amount', NEW.amount));
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_withdrawal_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS withdrawals_notify_status ON public.withdrawals;
CREATE TRIGGER withdrawals_notify_status
AFTER UPDATE OF status ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal_status();

-- 3. Activation verified ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_account_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.account_status = 'ACTIVE' AND OLD.account_status IS DISTINCT FROM 'ACTIVE' THEN
    PERFORM public.notify_user(NEW.user_id, 'ACTIVATION', 'Account activated',
      'Your payment was verified. You can now earn referral commissions and get paid.',
      jsonb_build_object('account_status', NEW.account_status));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_account_activated() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_notify_activated ON public.profiles;
CREATE TRIGGER profiles_notify_activated
AFTER UPDATE OF account_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_account_activated();

-- 4. Referral commission earned -------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.commission_status = 'EARNED' AND OLD.commission_status IS DISTINCT FROM 'EARNED' THEN
    PERFORM public.notify_user(NEW.referrer_id, 'COMMISSION', 'Referral commission earned',
      'You earned ' || coalesce(NEW.commission_amount, 0) || ' XAF from a level ' || NEW.level || ' referral.',
      jsonb_build_object('referral_id', NEW.id, 'level', NEW.level, 'amount', NEW.commission_amount));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_referral_commission() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS referrals_notify_commission ON public.referrals;
CREATE TRIGGER referrals_notify_commission
AFTER UPDATE OF commission_status ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.notify_referral_commission();