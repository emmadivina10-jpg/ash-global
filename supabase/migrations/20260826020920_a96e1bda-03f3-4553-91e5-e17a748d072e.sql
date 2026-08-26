-- 1. Community reviews -------------------------------------------------
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'BOOKING';

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_kind_check CHECK (kind IN ('BOOKING','COMMUNITY'));

ALTER TABLE public.reviews ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_unique
  ON public.reviews (booking_id) WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_community_unique
  ON public.reviews (provider_id, client_id) WHERE kind = 'COMMUNITY';

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_kind_booking_check
  CHECK ((kind = 'BOOKING' AND booking_id IS NOT NULL) OR (kind = 'COMMUNITY' AND booking_id IS NULL));

CREATE OR REPLACE FUNCTION public.submit_community_review(_provider_id uuid, _rating integer, _comment text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  prov RECORD;
  rid uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_RATING');
  END IF;

  SELECT id, user_id, is_live INTO prov FROM public.provider_profiles WHERE id = _provider_id;
  IF prov.id IS NULL OR NOT prov.is_live THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PROVIDER_NOT_FOUND');
  END IF;
  IF prov.user_id = uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'CANNOT_REVIEW_SELF');
  END IF;
  IF EXISTS (SELECT 1 FROM public.reviews r
              WHERE r.provider_id = _provider_id AND r.client_id = uid AND r.kind = 'COMMUNITY') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_REVIEWED');
  END IF;

  INSERT INTO public.reviews (booking_id, provider_id, client_id, rating, comment, kind)
  VALUES (NULL, _provider_id, uid, _rating, nullif(trim(coalesce(_comment,'')),''), 'COMMUNITY')
  RETURNING id INTO rid;

  PERFORM public.notify_user(prov.user_id, 'REVIEW', 'New community review',
    'Someone left you a ' || _rating::text || '-star community review.',
    jsonb_build_object('provider_id', _provider_id, 'review_id', rid, 'kind', 'COMMUNITY'));

  RETURN jsonb_build_object('ok', true, 'review_id', rid);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_community_review(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_community_review(uuid, integer, text) TO authenticated;

-- Keep direct inserts limited to verified booking reviews; community reviews go through the RPC.
DROP POLICY IF EXISTS "Clients review their completed bookings" ON public.reviews;
CREATE POLICY "Clients review their completed bookings"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND kind = 'BOOKING'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
       WHERE b.id = reviews.booking_id
         AND b.client_id = auth.uid()
         AND b.provider_id = reviews.provider_id
         AND b.status = 'COMPLETED'::booking_status
    )
  );

-- 2. Chat notifications --------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conv RECORD;
  recipient uuid;
  sender_name text;
BEGIN
  SELECT c.client_id, p.user_id AS provider_user_id, p.business_name
    INTO conv
    FROM public.conversations c
    JOIN public.provider_profiles p ON p.id = c.provider_id
   WHERE c.id = NEW.conversation_id;
  IF conv.client_id IS NULL THEN RETURN NEW; END IF;

  recipient := CASE WHEN NEW.sender_id = conv.client_id THEN conv.provider_user_id ELSE conv.client_id END;
  IF recipient IS NULL OR recipient = NEW.sender_id THEN RETURN NEW; END IF;

  IF NEW.sender_id = conv.provider_user_id THEN
    sender_name := conv.business_name;
  ELSE
    SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  END IF;

  PERFORM public.notify_user(recipient, 'MESSAGE',
    'New message from ' || coalesce(nullif(sender_name, ''), 'ASH member'),
    left(NEW.body, 140),
    jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_notify_recipient ON public.messages;
CREATE TRIGGER messages_notify_recipient
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_message_recipient();

-- 3. Stripe Connect payout readiness ------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_account_unique
  ON public.profiles (stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- These columns are payout infrastructure: only the backend may change them.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' OR auth.uid() IS NOT NULL THEN
    NEW.referral_code := OLD.referral_code;
    NEW.referred_by := OLD.referred_by;
    NEW.account_status := OLD.account_status;
    NEW.email := OLD.email;
    NEW.user_id := OLD.user_id;
    NEW.stripe_account_id := OLD.stripe_account_id;
    NEW.stripe_payouts_enabled := OLD.stripe_payouts_enabled;
    NEW.stripe_details_submitted := OLD.stripe_details_submitted;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 4. Withdrawals: allow bank payouts through Stripe ----------------------
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_payment_method_check;
ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_payment_method_check
  CHECK (payment_method IN ('MTN_MOMO','ORANGE_MONEY','STRIPE_BANK'));

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method text, _phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  w public.wallets%ROWTYPE;
  st text;
  ref text;
  payouts_ok boolean;
  dest text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT account_status, stripe_payouts_enabled INTO st, payouts_ok FROM public.profiles WHERE user_id = uid;
  IF st <> 'ACTIVE' THEN RETURN jsonb_build_object('ok', false, 'error', 'ACCOUNT_NOT_ACTIVE'); END IF;
  IF _method NOT IN ('MTN_MOMO','ORANGE_MONEY','STRIPE_BANK') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_METHOD');
  END IF;

  IF _method = 'STRIPE_BANK' THEN
    IF NOT coalesce(payouts_ok, false) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'BANK_PAYOUTS_NOT_READY');
    END IF;
    dest := 'STRIPE_BANK';
  ELSE
    IF _phone !~ '^(\+?237)?6[0-9]{8}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_PHONE'); END IF;
    dest := _phone;
  END IF;

  IF _amount IS NULL OR _amount < 1000 THEN RETURN jsonb_build_object('ok', false, 'error', 'MIN_AMOUNT_1000'); END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF w.user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'WALLET_NOT_FOUND'); END IF;
  IF w.available_balance < _amount THEN RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_BALANCE'); END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals wd WHERE wd.user_id = uid AND wd.status IN ('PENDING','PROCESSING')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PENDING_WITHDRAWAL_EXISTS');
  END IF;

  ref := 'WD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  INSERT INTO public.withdrawals (user_id, amount, currency, payment_method, phone_number, status, reference)
  VALUES (uid, _amount, w.currency, _method, dest, 'PENDING', ref);

  UPDATE public.wallets
     SET available_balance = available_balance - _amount,
         pending_balance = pending_balance + _amount,
         updated_at = now()
   WHERE user_id = uid;

  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (uid, 'WITHDRAWAL', -_amount, w.currency, ref,
          CASE WHEN _method = 'STRIPE_BANK' THEN 'Bank withdrawal request' ELSE 'Mobile money withdrawal request' END,
          'PENDING')
  ON CONFLICT (reference) DO NOTHING;

  PERFORM public.notify_user(uid, 'WITHDRAWAL', 'Withdrawal requested',
    'Your withdrawal of ' || _amount::bigint || ' XAF is pending review.',
    jsonb_build_object('reference', ref, 'method', _method));

  RETURN jsonb_build_object('ok', true, 'reference', ref);
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated;