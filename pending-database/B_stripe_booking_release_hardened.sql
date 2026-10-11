-- Stripe booking release ledger, hardened revision (review findings 1-9).
-- Re-runnable. Controls default OFF; no account binding; no financial rows changed.

-- [1] Fail before any change when a dependency is missing.
DO $$
DECLARE missing text := '';
BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name IN
      ('payment_provider','payment_currency','payment_amount','payment_reference','provider_transaction_id','paid_at','commission_rate',
       'verification_status','verified_at','provider_transfer_status','provider_transfer_id','price','status')) <> 13 THEN missing := missing||' bookings-columns'; END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name IN
      ('stripe_account_id','stripe_payouts_enabled','stripe_details_submitted')) <> 3 THEN missing := missing||' profiles-stripe-columns'; END IF;
  IF to_regclass('public.booking_verification_codes') IS NULL THEN missing := missing||' booking_verification_codes'; END IF;
  IF to_regprocedure('public.complete_booking_payment(text,text)') IS NULL THEN missing := missing||' complete_booking_payment'; END IF;
  IF to_regprocedure('public.charge_platform_commission()') IS NULL THEN missing := missing||' charge_platform_commission'; END IF;
  IF to_regprocedure('public.verify_booking_code(uuid,text)') IS NULL THEN missing := missing||' verify_booking_code'; END IF;
  IF missing <> '' THEN RAISE EXCEPTION 'STRIPE_RELEASE_DEPENDENCY_MISSING:%', missing; END IF;
END $$;

-- [9] Pre-change snapshot of every bookings trigger, kept for restoration.
CREATE TABLE IF NOT EXISTS public.stripe_release_install_snapshot (
  trigger_name text PRIMARY KEY, definition text NOT NULL, captured_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON public.stripe_release_install_snapshot FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.stripe_release_install_snapshot TO service_role;
ALTER TABLE public.stripe_release_install_snapshot ENABLE ROW LEVEL SECURITY;
INSERT INTO public.stripe_release_install_snapshot(trigger_name, definition)
SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid='public.bookings'::regclass AND NOT tgisinternal
ON CONFLICT (trigger_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.stripe_marketplace_controls (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  marketplace_account_id text,
  transfers_enabled boolean NOT NULL DEFAULT false,
  onboarding_enabled boolean NOT NULL DEFAULT false);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_inbox (
  event_account_id text NOT NULL, event_id text NOT NULL, marketplace_account_id text NOT NULL, event_type text NOT NULL,
  status text NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','PROCESSED')),
  outcome text, created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
  PRIMARY KEY (event_account_id, event_id));

CREATE TABLE IF NOT EXISTS public.stripe_booking_releases (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id),
  marketplace_account_id text NOT NULL,
  session_id text NOT NULL UNIQUE CHECK (session_id ~ '^cs_'),
  payment_intent_id text NOT NULL UNIQUE CHECK (payment_intent_id ~ '^pi_'),
  source_charge_id text NOT NULL UNIQUE CHECK (source_charge_id ~ '^ch_'),
  verified_event_id text NOT NULL CHECK (verified_event_id ~ '^evt_'),
  destination_account_id text,
  gross_minor bigint NOT NULL CHECK (gross_minor > 0),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= gross_minor),
  commission_rate numeric NOT NULL CHECK (commission_rate IN (0.12, 0.15)),
  currency text NOT NULL CHECK (currency IN ('usd','cad')),
  idempotency_key text NOT NULL UNIQUE,
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt BETWEEN 0 AND 5),
  review_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN
    ('PENDING_VERIFICATION','ELIGIBLE','SUBMITTING','UNKNOWN','FAILED','INSUFFICIENT_FUNDS','TRANSFERRED','HELD','REVERSED')),
  transfer_id text UNIQUE CHECK (transfer_id IS NULL OR transfer_id ~ '^tr_'),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(), submitted_at timestamptz, transferred_at timestamptz,
  CHECK (gross_minor - amount_minor = round(gross_minor * commission_rate)));

-- [6] Holds are recorded by charge, even before the booking is registered.
CREATE TABLE IF NOT EXISTS public.stripe_charge_holds (
  charge_id text NOT NULL CHECK (charge_id ~ '^ch_'),
  kind text NOT NULL CHECK (kind IN ('REFUND_FULL','REFUND_PARTIAL','DISPUTE')),
  reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (charge_id, kind));

CREATE TABLE IF NOT EXISTS public.stripe_connected_payouts (
  account_id text NOT NULL, payout_id text NOT NULL, status text NOT NULL, amount_minor bigint NOT NULL,
  currency text NOT NULL, failure_code text, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, payout_id));

-- [3] Service-only tables: explicit revokes, then service grant, RLS, policy.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['stripe_marketplace_controls','stripe_webhook_inbox','stripe_booking_releases','stripe_charge_holds','stripe_connected_payouts'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS service_only ON public.%I', t);
    EXECUTE format('CREATE POLICY service_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- [3] Provider Stripe mapping is server-owned on INSERT and UPDATE.
CREATE OR REPLACE FUNCTION public.guard_provider_stripe_mapping() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.stripe_account_id IS NOT NULL OR NEW.stripe_payouts_enabled IS TRUE OR NEW.stripe_details_submitted IS TRUE THEN
      RAISE EXCEPTION 'STRIPE_ACCOUNT_SERVER_ONLY'; END IF;
  ELSIF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id OR NEW.stripe_payouts_enabled IS DISTINCT FROM OLD.stripe_payouts_enabled
     OR NEW.stripe_details_submitted IS DISTINCT FROM OLD.stripe_details_submitted THEN
    RAISE EXCEPTION 'STRIPE_ACCOUNT_SERVER_ONLY';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_provider_stripe_mapping ON public.profiles;
CREATE TRIGGER guard_provider_stripe_mapping BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_provider_stripe_mapping();

-- [3] Payment/verification evidence cannot be forged on INSERT or UPDATE.
CREATE OR REPLACE FUNCTION public.guard_stripe_booking_evidence() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.commission_rate IS NOT NULL OR NEW.verification_status IS DISTINCT FROM 'NOT_ISSUED' OR NEW.verified_at IS NOT NULL
       OR NEW.provider_transfer_status IS DISTINCT FROM 'NOT_APPLICABLE' OR NEW.provider_transfer_id IS NOT NULL OR NEW.paid_at IS NOT NULL THEN
      RAISE EXCEPTION 'BOOKING_EVIDENCE_SERVER_ONLY'; END IF;
  ELSIF NEW.commission_rate IS DISTINCT FROM OLD.commission_rate OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at OR NEW.provider_transfer_status IS DISTINCT FROM OLD.provider_transfer_status
     OR NEW.provider_transfer_id IS DISTINCT FROM OLD.provider_transfer_id OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.payment_amount IS DISTINCT FROM OLD.payment_amount OR NEW.payment_currency IS DISTINCT FROM OLD.payment_currency THEN
    RAISE EXCEPTION 'BOOKING_EVIDENCE_SERVER_ONLY';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_stripe_booking_evidence ON public.bookings;
CREATE TRIGGER guard_stripe_booking_evidence BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.guard_stripe_booking_evidence();

-- [2][4][5][6] Register a verified Stripe payment with null-safe, explicit evidence checks.
CREATE OR REPLACE FUNCTION public.register_verified_stripe_booking(_reference text, _intent text, _evidence jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings%ROWTYPE; r public.stripe_booking_releases%ROWTYPE; settled jsonb; rate numeric; destination text;
  account_id text; ev_session text; ev_charge text; ev_event text; ev_currency text; ev_account text; ev_minor bigint; held boolean;
BEGIN
  ev_session := _evidence->>'session_id'; ev_charge := _evidence->>'charge_id'; ev_event := _evidence->>'stripe_event_id';
  ev_currency := lower(_evidence->>'currency'); ev_account := _evidence->>'marketplace_account_id';
  IF _reference IS NULL OR _intent IS NULL OR ev_session IS NULL OR ev_charge IS NULL OR ev_event IS NULL OR ev_currency IS NULL
     OR ev_account IS NULL OR coalesce(_evidence->>'amount_minor','') !~ '^[1-9][0-9]{0,11}$'
     OR _intent !~ '^pi_' OR ev_session !~ '^cs_' OR ev_charge !~ '^ch_' OR ev_event !~ '^evt_' OR ev_currency NOT IN ('usd','cad') THEN
    RAISE EXCEPTION 'EVIDENCE_INCOMPLETE'; END IF;
  ev_minor := (_evidence->>'amount_minor')::bigint;
  SELECT * INTO b FROM public.bookings WHERE payment_reference = _reference FOR UPDATE;
  IF b.id IS NULL OR b.payment_provider IS DISTINCT FROM 'STRIPE' THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  SELECT marketplace_account_id INTO account_id FROM public.stripe_marketplace_controls WHERE id;
  IF account_id IS NULL OR account_id IS DISTINCT FROM ev_account THEN RAISE EXCEPTION 'ACCOUNT_MISMATCH'; END IF;
  SELECT * INTO r FROM public.stripe_booking_releases WHERE booking_id = b.id FOR UPDATE;
  IF r.booking_id IS NOT NULL THEN
    IF r.payment_intent_id IS DISTINCT FROM _intent OR r.session_id IS DISTINCT FROM ev_session OR r.source_charge_id IS DISTINCT FROM ev_charge
       OR r.gross_minor IS DISTINCT FROM ev_minor OR r.currency IS DISTINCT FROM ev_currency THEN RAISE EXCEPTION 'PAYMENT_MISMATCH'; END IF;
    RETURN jsonb_build_object('ok', true, 'already', true, 'booking_id', b.id);
  END IF;
  IF b.paid_at IS NOT NULL THEN RAISE EXCEPTION 'HISTORICAL_PAYMENT_REQUIRES_REVIEW'; END IF;
  IF b.status::text NOT IN ('PAYMENT_PROCESSING','PAYMENT_FAILED') THEN RAISE EXCEPTION 'BOOKING_NOT_PAYABLE'; END IF;
  -- [5] Stripe amounts are actual minor units of the booking's own Stripe currency.
  IF b.provider_transaction_id IS DISTINCT FROM ev_session OR b.payment_amount IS NULL OR b.payment_currency IS NULL
     OR round(b.payment_amount * 100)::bigint IS DISTINCT FROM ev_minor OR lower(b.payment_currency) IS DISTINCT FROM ev_currency THEN
    RAISE EXCEPTION 'EVIDENCE_MISMATCH'; END IF;
  settled := public.complete_booking_payment(_reference, _intent);
  IF coalesce((settled->>'ok')::boolean, false) IS NOT TRUE OR coalesce((settled->>'already')::boolean, false) THEN RAISE EXCEPTION 'PAYMENT_REJECTED'; END IF;
  -- [4] Only the reviewed 12%/15% marketplace rates; the saved rate is kept.
  SELECT commission_rate INTO rate FROM public.bookings WHERE id = b.id;
  IF rate IS NULL OR rate NOT IN (0.12, 0.15) THEN RAISE EXCEPTION 'SAVED_RATE_NOT_AUTHORIZED'; END IF;
  -- [5] The customer payment record shows the real Stripe amount and currency, not XAF.
  UPDATE public.transactions SET amount = -b.payment_amount, currency = upper(ev_currency)
   WHERE reference = 'BKGPAY-' || _reference AND type = 'BOOKING_PAYMENT';
  SELECT p.stripe_account_id INTO destination FROM public.provider_profiles pp JOIN public.profiles p ON p.user_id = pp.user_id WHERE pp.id = b.provider_id;
  held := EXISTS (SELECT 1 FROM public.stripe_charge_holds WHERE charge_id = ev_charge);
  INSERT INTO public.stripe_booking_releases(booking_id, marketplace_account_id, session_id, payment_intent_id, source_charge_id, verified_event_id,
    destination_account_id, gross_minor, amount_minor, commission_rate, currency, idempotency_key, status, review_required, last_error)
  VALUES (b.id, account_id, ev_session, _intent, ev_charge, ev_event, destination, ev_minor, ev_minor - round(ev_minor * rate)::bigint, rate,
    ev_currency, 'ash_marketplace_booking_' || b.id::text || '_v1', CASE WHEN held THEN 'HELD' ELSE 'PENDING_VERIFICATION' END, held,
    CASE WHEN held THEN 'HELD_BEFORE_REGISTRATION' END);
  RETURN jsonb_build_object('ok', true, 'booking_id', b.id, 'held', held);
END $$;

-- [9] Stripe completions no longer fire the local wallet credit; other rails unchanged.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.bookings'::regclass AND tgfoid='public.charge_platform_commission()'::regprocedure AND NOT tgisinternal LOOP
    EXECUTE format('DROP TRIGGER %I ON public.bookings', t.tgname);
  END LOOP;
END $$;
CREATE TRIGGER booking_local_wallet_commission AFTER UPDATE ON public.bookings FOR EACH ROW
  WHEN (NEW.payment_provider IS DISTINCT FROM 'STRIPE') EXECUTE FUNCTION public.charge_platform_commission();

CREATE OR REPLACE FUNCTION public.guard_stripe_booking_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.payment_provider = 'STRIPE' AND NEW.status::text = 'COMPLETED' AND OLD.status::text IS DISTINCT FROM 'COMPLETED' THEN
    IF NEW.verification_status IS DISTINCT FROM 'VERIFIED' OR NEW.paid_at IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.stripe_booking_releases WHERE booking_id = NEW.id AND status IN ('PENDING_VERIFICATION','HELD')) THEN
      RAISE EXCEPTION 'VERIFIED_STRIPE_PAYABLE_REQUIRED'; END IF;
    NEW.provider_transfer_status := 'PENDING_TRANSFER';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_stripe_booking_release ON public.bookings;
CREATE TRIGGER guard_stripe_booking_release BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.guard_stripe_booking_release();

CREATE OR REPLACE FUNCTION public.queue_stripe_booking_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.payment_provider = 'STRIPE' AND NEW.status::text = 'COMPLETED' AND NEW.verification_status = 'VERIFIED' THEN
    UPDATE public.stripe_booking_releases SET status = 'ELIGIBLE' WHERE booking_id = NEW.id AND status = 'PENDING_VERIFICATION';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS queue_stripe_booking_release ON public.bookings;
CREATE TRIGGER queue_stripe_booking_release AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.queue_stripe_booking_release();

-- Claim locks booking then release row (same order everywhere), so only one worker submits.
CREATE OR REPLACE FUNCTION public.claim_stripe_booking_release(_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings%ROWTYPE; r public.stripe_booking_releases%ROWTYPE; c public.stripe_marketplace_controls%ROWTYPE; destination text;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  SELECT * INTO r FROM public.stripe_booking_releases WHERE booking_id = _booking_id FOR UPDATE;
  SELECT * INTO c FROM public.stripe_marketplace_controls WHERE id;
  IF b.id IS NULL OR r.booking_id IS NULL OR c.transfers_enabled IS NOT TRUE OR c.marketplace_account_id IS NULL
     OR r.marketplace_account_id IS DISTINCT FROM c.marketplace_account_id OR r.status IS DISTINCT FROM 'ELIGIBLE' OR r.review_required
     OR b.status::text IS DISTINCT FROM 'COMPLETED' OR b.verification_status IS DISTINCT FROM 'VERIFIED' OR b.paid_at IS NULL
     OR EXISTS (SELECT 1 FROM public.stripe_charge_holds WHERE charge_id = r.source_charge_id)
     OR NOT EXISTS (SELECT 1 FROM public.booking_verification_codes WHERE booking_id = b.id AND used_at IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', false); END IF;
  SELECT p.stripe_account_id INTO destination FROM public.provider_profiles pp JOIN public.profiles p ON p.user_id = pp.user_id WHERE pp.id = b.provider_id;
  IF destination IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  IF r.destination_account_id IS NOT NULL AND r.destination_account_id IS DISTINCT FROM destination THEN RAISE EXCEPTION 'DESTINATION_CHANGED'; END IF;
  UPDATE public.stripe_booking_releases SET status = 'SUBMITTING', destination_account_id = destination, submitted_at = now() WHERE booking_id = _booking_id;
  RETURN jsonb_build_object('ok', true, 'destination_account_id', destination, 'amount_minor', r.amount_minor, 'currency', r.currency,
    'source_charge_id', r.source_charge_id, 'attempt', r.attempt);
END $$;

-- [7] Finish returns the persisted state; HELD and REVERSED are never downgraded.
DROP FUNCTION IF EXISTS public.finish_stripe_booking_release(uuid, text, boolean);
CREATE FUNCTION public.finish_stripe_booking_release(_booking_id uuid, _transfer_id text, _reversed boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings%ROWTYPE; r public.stripe_booking_releases%ROWTYPE; next text;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  SELECT * INTO r FROM public.stripe_booking_releases WHERE booking_id = _booking_id FOR UPDATE;
  IF r.booking_id IS NULL OR _transfer_id IS NULL OR _transfer_id !~ '^tr_' OR _reversed IS NULL
     OR (r.transfer_id IS NOT NULL AND r.transfer_id IS DISTINCT FROM _transfer_id)
     OR r.status IN ('PENDING_VERIFICATION','ELIGIBLE') THEN RAISE EXCEPTION 'TRANSFER_MISMATCH'; END IF;
  next := CASE WHEN r.status = 'REVERSED' OR _reversed THEN 'REVERSED' WHEN r.status = 'HELD' THEN 'HELD' ELSE 'TRANSFERRED' END;
  UPDATE public.stripe_booking_releases SET transfer_id = _transfer_id, status = next, last_error = CASE WHEN next = 'TRANSFERRED' THEN NULL ELSE last_error END,
    review_required = review_required OR next = 'HELD', transferred_at = coalesce(transferred_at, now()) WHERE booking_id = _booking_id;
  PERFORM set_config('app.booking_rpc', 'on', true);
  UPDATE public.bookings SET provider_transfer_id = _transfer_id, provider_transfer_status = next WHERE id = _booking_id;
  RETURN jsonb_build_object('ok', true, 'status', next, 'transfer_id', _transfer_id);
END $$;

-- [6] Refund/dispute holds: recorded even before registration; never moves money.
CREATE OR REPLACE FUNCTION public.hold_stripe_booking_charge(_charge_id text, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE booking uuid; k text;
BEGIN
  IF _charge_id IS NULL OR _charge_id !~ '^ch_' THEN RAISE EXCEPTION 'CHARGE_REQUIRED'; END IF;
  k := CASE WHEN _reason LIKE 'charge.dispute%' THEN 'DISPUTE' WHEN _reason = 'charge.refunded.partial' THEN 'REFUND_PARTIAL' ELSE 'REFUND_FULL' END;
  SELECT booking_id INTO booking FROM public.stripe_booking_releases WHERE source_charge_id = _charge_id;
  IF booking IS NOT NULL THEN PERFORM 1 FROM public.bookings WHERE id = booking FOR UPDATE; PERFORM 1 FROM public.stripe_booking_releases WHERE booking_id = booking FOR UPDATE; END IF;
  INSERT INTO public.stripe_charge_holds(charge_id, kind, reason) VALUES (_charge_id, k, coalesce(_reason, 'HOLD')) ON CONFLICT DO NOTHING;
  -- Already-sent transfers stay recorded as sent and are flagged for review.
  UPDATE public.stripe_booking_releases SET
    status = CASE WHEN status IN ('TRANSFERRED','REVERSED') THEN status ELSE 'HELD' END,
    review_required = true, last_error = coalesce(_reason, 'HOLD')
   WHERE source_charge_id = _charge_id;
END $$;

-- [8] Retry only after a definitive rejection; ambiguous outcomes must reconcile.
CREATE OR REPLACE FUNCTION public.retry_stripe_booking_release(_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.stripe_booking_releases%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  SELECT * INTO r FROM public.stripe_booking_releases WHERE booking_id = _booking_id FOR UPDATE;
  IF r.booking_id IS NULL OR r.status NOT IN ('FAILED','INSUFFICIENT_FUNDS') OR r.transfer_id IS NOT NULL OR r.review_required THEN
    RETURN jsonb_build_object('ok', false, 'status', r.status); END IF;
  IF r.attempt >= 5 THEN RETURN jsonb_build_object('ok', false, 'error', 'RETRY_LIMIT'); END IF;
  UPDATE public.stripe_booking_releases SET status = 'ELIGIBLE', attempt = attempt + 1 WHERE booking_id = _booking_id;
  RETURN jsonb_build_object('ok', true, 'attempt', r.attempt + 1);
END $$;

-- [3] Every function: no PUBLIC/anon/member execution; server only.
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['register_verified_stripe_booking(text,text,jsonb)','claim_stripe_booking_release(uuid)','finish_stripe_booking_release(uuid,text,boolean)',
    'hold_stripe_booking_charge(text,text)','retry_stripe_booking_release(uuid)','guard_provider_stripe_mapping()','guard_stripe_booking_evidence()',
    'guard_stripe_booking_release()','queue_stripe_booking_release()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;
