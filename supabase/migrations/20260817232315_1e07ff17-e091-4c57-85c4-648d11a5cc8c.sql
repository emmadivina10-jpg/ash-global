-- 1. Notifications ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _category text, _title text, _body text DEFAULT '', _data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.notifications (user_id, category, title, body, data)
  VALUES (_user_id, _category, _title, coalesce(_body,''), coalesce(_data,'{}'::jsonb));
$$;

REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, jsonb) TO service_role;

-- 2. Referral ledger columns ------------------------------------------------
-- Replace the blanket immutability trigger first: platform functions must be
-- able to maintain ledger fields, end users still cannot touch referral rows.
DROP TRIGGER IF EXISTS trg_referrals_immutable ON public.referrals;
CREATE TRIGGER trg_referrals_immutable
  BEFORE DELETE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.block_change();

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS activation_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS transaction_id uuid;

CREATE OR REPLACE FUNCTION public.set_referral_commission_amount()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF coalesce(NEW.commission_amount, 0) = 0 THEN
    NEW.commission_amount := CASE NEW.level WHEN 1 THEN 1500 WHEN 2 THEN 750 WHEN 3 THEN 250 ELSE 0 END;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS referrals_set_commission_amount ON public.referrals;
CREATE TRIGGER referrals_set_commission_amount
  BEFORE INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_commission_amount();

UPDATE public.referrals r
   SET commission_amount = CASE r.level WHEN 1 THEN 1500 WHEN 2 THEN 750 WHEN 3 THEN 250 ELSE 0 END
 WHERE coalesce(r.commission_amount, 0) = 0;

UPDATE public.referrals r
   SET activation_status = p.account_status
  FROM public.profiles p
 WHERE p.user_id = r.referred_user_id
   AND r.activation_status IS DISTINCT FROM p.account_status;

CREATE OR REPLACE FUNCTION public.guard_referral_update()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_setting('role', true) = 'authenticated' THEN
    RAISE EXCEPTION 'Records in referrals are immutable';
  END IF;
  IF NEW.referrer_id IS DISTINCT FROM OLD.referrer_id
     OR NEW.referred_user_id IS DISTINCT FROM OLD.referred_user_id
     OR NEW.level IS DISTINCT FROM OLD.level THEN
    RAISE EXCEPTION 'Referral identity is immutable';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_referrals_guard_update ON public.referrals;
CREATE TRIGGER trg_referrals_guard_update
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.guard_referral_update();

-- 3. Idempotency on provider payments ---------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS activations_provider_transaction_id_key
  ON public.activations (provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS activations_payment_reference_key
  ON public.activations (payment_reference);

-- 4. Activation completion: ledger + notifications ---------------------------
CREATE OR REPLACE FUNCTION public.complete_activation(_payment_reference text, _provider_transaction_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  act public.activations%ROWTYPE;
  r RECORD;
  commission numeric;
  tx_id uuid;
  new_name text;
  active_count int;
BEGIN
  SELECT * INTO act FROM public.activations WHERE payment_reference = _payment_reference FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'ACTIVATION_NOT_FOUND'); END IF;
  IF act.status = 'PAID' THEN RETURN jsonb_build_object('ok', true, 'already', true, 'user_id', act.user_id); END IF;

  UPDATE public.activations
     SET status = 'PAID', paid_at = now(), updated_at = now(),
         provider_transaction_id = coalesce(_provider_transaction_id, provider_transaction_id)
   WHERE id = act.id;

  UPDATE public.profiles SET account_status = 'ACTIVE', updated_at = now() WHERE user_id = act.user_id;
  SELECT full_name INTO new_name FROM public.profiles WHERE user_id = act.user_id;

  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (act.user_id, 'ACTIVATION_PAYMENT', -act.amount, act.currency, 'ACT-' || act.payment_reference,
          'Account activation fee', 'COMPLETED')
  ON CONFLICT (reference) DO NOTHING;

  UPDATE public.referrals
     SET activation_status = 'ACTIVE', activated_at = coalesce(activated_at, now())
   WHERE referred_user_id = act.user_id;

  PERFORM public.notify_user(
    act.user_id, 'ACTIVATION',
    'Your account is active',
    'Your activation payment was confirmed. You can now earn referral commissions and withdraw.',
    jsonb_build_object('reference', act.payment_reference)
  );

  FOR r IN
    SELECT ref.id, ref.referrer_id, ref.level, ref.commission_amount, p.account_status
      FROM public.referrals ref
      JOIN public.profiles p ON p.user_id = ref.referrer_id
     WHERE ref.referred_user_id = act.user_id
  LOOP
    commission := coalesce(r.commission_amount, 0);
    tx_id := NULL;

    IF r.account_status <> 'ACTIVE' OR commission <= 0 THEN
      UPDATE public.referrals
         SET commission_status = 'SKIPPED'
       WHERE id = r.id AND commission_status = 'PENDING';
      CONTINUE;
    END IF;

    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (r.referrer_id, 'REFERRAL_COMMISSION', commission, 'XAF',
            'COM-' || act.payment_reference || '-L' || r.level,
            'Level ' || r.level || ' referral commission', 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING
    RETURNING id INTO tx_id;

    IF tx_id IS NOT NULL THEN
      UPDATE public.wallets
         SET available_balance = available_balance + commission,
             total_earned = total_earned + commission,
             updated_at = now()
       WHERE user_id = r.referrer_id;

      UPDATE public.referrals
         SET commission_status = 'EARNED', transaction_id = tx_id
       WHERE id = r.id;

      SELECT count(*) INTO active_count
        FROM public.referrals ref2
        JOIN public.profiles p2 ON p2.user_id = ref2.referred_user_id
       WHERE ref2.referrer_id = r.referrer_id AND p2.account_status = 'ACTIVE';

      PERFORM public.notify_user(
        r.referrer_id, 'COMMISSION',
        'You earned ' || commission::bigint || ' XAF',
        coalesce(nullif(new_name, ''), 'A member') || ' activated their account. Your network now has '
          || active_count || ' activated member(s).',
        jsonb_build_object('level', r.level, 'amount', commission, 'celebrate', true, 'active_members', active_count)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'user_id', act.user_id);
END;
$function$;

-- 5. Withdrawal notifications -----------------------------------------------
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method text, _phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  w public.wallets%ROWTYPE;
  st text;
  ref text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT account_status INTO st FROM public.profiles WHERE user_id = uid;
  IF st <> 'ACTIVE' THEN RETURN jsonb_build_object('ok', false, 'error', 'ACCOUNT_NOT_ACTIVE'); END IF;
  IF _method NOT IN ('MTN_MOMO','ORANGE_MONEY') THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_METHOD'); END IF;
  IF _phone !~ '^(\+?237)?6[0-9]{8}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_PHONE'); END IF;
  IF _amount IS NULL OR _amount < 1000 THEN RETURN jsonb_build_object('ok', false, 'error', 'MIN_AMOUNT_1000'); END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF w.available_balance < _amount THEN RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_BALANCE'); END IF;

  IF EXISTS (SELECT 1 FROM public.withdrawals WHERE user_id = uid AND status IN ('PENDING','PROCESSING')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PENDING_WITHDRAWAL_EXISTS');
  END IF;

  ref := 'WD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));

  INSERT INTO public.withdrawals (user_id, amount, payment_method, phone_number, reference)
  VALUES (uid, _amount, _method, _phone, ref);

  UPDATE public.wallets SET available_balance = available_balance - _amount,
         pending_balance = pending_balance + _amount, updated_at = now() WHERE user_id = uid;

  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (uid, 'WITHDRAWAL', -_amount, 'XAF', ref, 'Withdrawal request (' || _method || ')', 'PENDING');

  PERFORM public.notify_user(uid, 'WITHDRAWAL',
    'Withdrawal requested',
    _amount::bigint || ' XAF is being reviewed for payout to ' || _phone || '.',
    jsonb_build_object('reference', ref, 'amount', _amount));

  RETURN jsonb_build_object('ok', true, 'reference', ref);
END;
$function$;

CREATE OR REPLACE FUNCTION public.console_settle_withdrawal(_withdrawal_id uuid, _status text, _provider_reference text DEFAULT NULL::text, _note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE wd public.withdrawals%ROWTYPE;
BEGIN
  IF _status NOT IN ('PROCESSING','COMPLETED','FAILED','REVERSED') THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_STATUS'); END IF;
  SELECT * INTO wd FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF wd.status IN ('COMPLETED','FAILED','REVERSED') THEN RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_SETTLED'); END IF;

  UPDATE public.withdrawals SET status = _status,
    provider_reference = coalesce(_provider_reference, provider_reference),
    admin_note = coalesce(_note, admin_note),
    processed_at = CASE WHEN _status IN ('COMPLETED','FAILED','REVERSED') THEN now() ELSE processed_at END
  WHERE id = wd.id;

  IF _status = 'COMPLETED' THEN
    UPDATE public.wallets SET pending_balance = pending_balance - wd.amount,
      total_withdrawn = total_withdrawn + wd.amount, updated_at = now() WHERE user_id = wd.user_id;
    UPDATE public.transactions SET status = 'COMPLETED' WHERE reference = wd.reference;
    PERFORM public.notify_user(wd.user_id, 'WITHDRAWAL', 'Withdrawal completed',
      wd.amount::bigint || ' XAF has been sent to ' || wd.phone_number || '.',
      jsonb_build_object('reference', wd.reference));
  ELSIF _status = 'PROCESSING' THEN
    PERFORM public.notify_user(wd.user_id, 'WITHDRAWAL', 'Withdrawal processing',
      'Your withdrawal of ' || wd.amount::bigint || ' XAF is being processed.',
      jsonb_build_object('reference', wd.reference));
  ELSIF _status IN ('FAILED','REVERSED') THEN
    UPDATE public.wallets SET pending_balance = pending_balance - wd.amount,
      available_balance = available_balance + wd.amount, updated_at = now() WHERE user_id = wd.user_id;
    UPDATE public.transactions SET status = 'REVERSED' WHERE reference = wd.reference;
    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (wd.user_id, 'WITHDRAWAL_REVERSAL', wd.amount, wd.currency, wd.reference || '-REV', 'Withdrawal reversed', 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;
    PERFORM public.notify_user(wd.user_id, 'WITHDRAWAL', 'Withdrawal ' || lower(_status),
      'Your withdrawal of ' || wd.amount::bigint || ' XAF was returned to your available balance.',
      jsonb_build_object('reference', wd.reference));
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;
