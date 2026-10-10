-- STAGED ONLY. Do not apply until shared-production database approval.
-- Apply byte-for-byte through the migration tool after approval.
CREATE TABLE public.stripe_marketplace_controls (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  marketplace_account_id text,
  transfers_enabled boolean NOT NULL DEFAULT false,
  onboarding_enabled boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.stripe_marketplace_controls TO service_role;
ALTER TABLE public.stripe_marketplace_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_only ON public.stripe_marketplace_controls FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.stripe_webhook_inbox (
  event_account_id text NOT NULL,
  event_id text NOT NULL,
  marketplace_account_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','PROCESSED')),
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  PRIMARY KEY (event_account_id,event_id)
);
GRANT ALL ON public.stripe_webhook_inbox TO service_role;
ALTER TABLE public.stripe_webhook_inbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_only ON public.stripe_webhook_inbox FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.stripe_booking_releases (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id),
  marketplace_account_id text NOT NULL,
  session_id text NOT NULL UNIQUE,
  payment_intent_id text NOT NULL UNIQUE,
  source_charge_id text NOT NULL UNIQUE,
  verified_event_id text NOT NULL,
  destination_account_id text,
  gross_minor bigint NOT NULL CHECK (gross_minor > 0),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  commission_rate numeric NOT NULL,
  currency text NOT NULL CHECK (currency IN ('usd','cad')),
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION','ELIGIBLE','SUBMITTING','UNKNOWN','FAILED','INSUFFICIENT_FUNDS','TRANSFERRED','HELD','REVERSED')),
  transfer_id text UNIQUE,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  transferred_at timestamptz
);
GRANT ALL ON public.stripe_booking_releases TO service_role;
ALTER TABLE public.stripe_booking_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_only ON public.stripe_booking_releases FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.stripe_connected_payouts (
  account_id text NOT NULL,
  payout_id text NOT NULL,
  status text NOT NULL,
  amount_minor bigint NOT NULL,
  currency text NOT NULL,
  failure_code text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id,payout_id)
);
GRANT ALL ON public.stripe_connected_payouts TO service_role;
ALTER TABLE public.stripe_connected_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_only ON public.stripe_connected_payouts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- No existing financial rows are modified. Controls remain absent/off until
-- the owner separately authorizes account binding and live operation.

CREATE FUNCTION public.guard_provider_stripe_mapping() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role','supabase_admin') AND
     (NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id OR
      NEW.stripe_payouts_enabled IS DISTINCT FROM OLD.stripe_payouts_enabled OR
      NEW.stripe_details_submitted IS DISTINCT FROM OLD.stripe_details_submitted) THEN
    RAISE EXCEPTION 'STRIPE_ACCOUNT_SERVER_ONLY';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_provider_stripe_mapping BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_provider_stripe_mapping();

CREATE FUNCTION public.register_verified_stripe_booking(_reference text,_intent text,_evidence jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings%ROWTYPE; r public.stripe_booking_releases%ROWTYPE; settled jsonb; rate numeric; destination text; account_id text;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE payment_reference=_reference FOR UPDATE;
  IF b.id IS NULL OR b.payment_provider <> 'STRIPE' THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  SELECT marketplace_account_id INTO account_id FROM public.stripe_marketplace_controls WHERE id;
  IF account_id IS NULL OR account_id <> _evidence->>'marketplace_account_id' THEN RAISE EXCEPTION 'ACCOUNT_MISMATCH'; END IF;
  SELECT * INTO r FROM public.stripe_booking_releases WHERE booking_id=b.id FOR UPDATE;
  IF r.booking_id IS NOT NULL THEN
    IF r.payment_intent_id<>_intent OR r.session_id<>_evidence->>'session_id' OR r.source_charge_id<>_evidence->>'charge_id' THEN RAISE EXCEPTION 'PAYMENT_MISMATCH'; END IF;
    RETURN jsonb_build_object('ok',true,'already',true);
  END IF;
  IF b.paid_at IS NOT NULL THEN RAISE EXCEPTION 'HISTORICAL_PAYMENT_REQUIRES_REVIEW'; END IF;
  IF b.status::text NOT IN ('ACCEPTED','PAYMENT_PROCESSING') THEN RAISE EXCEPTION 'BOOKING_NOT_PAYABLE'; END IF;
  IF b.provider_transaction_id IS DISTINCT FROM _evidence->>'session_id' OR
     round(b.payment_amount*100) IS DISTINCT FROM (_evidence->>'amount_minor')::numeric OR
     lower(b.payment_currency) IS DISTINCT FROM lower(_evidence->>'currency') OR
     (_evidence->>'currency') NOT IN ('usd','cad') OR
     _intent NOT LIKE 'pi_%' OR (_evidence->>'charge_id') NOT LIKE 'ch_%' OR (_evidence->>'stripe_event_id') NOT LIKE 'evt_%'
     THEN RAISE EXCEPTION 'EVIDENCE_MISMATCH'; END IF;
  settled:=public.complete_booking_payment(_reference,_intent);
  IF coalesce((settled->>'ok')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'PAYMENT_REJECTED'; END IF;
  SELECT commission_rate INTO rate FROM public.bookings WHERE id=b.id;
  IF rate IS NULL OR rate<0 OR rate>=1 THEN RAISE EXCEPTION 'SAVED_RATE_REQUIRED'; END IF;
  SELECT p.stripe_account_id INTO destination FROM public.provider_profiles pp JOIN public.profiles p ON p.user_id=pp.user_id WHERE pp.id=b.provider_id;
  INSERT INTO public.stripe_booking_releases(booking_id,marketplace_account_id,session_id,payment_intent_id,source_charge_id,verified_event_id,destination_account_id,gross_minor,amount_minor,commission_rate,currency,idempotency_key)
  VALUES(b.id,account_id,_evidence->>'session_id',_intent,_evidence->>'charge_id',_evidence->>'stripe_event_id',destination,
    (_evidence->>'amount_minor')::bigint,(_evidence->>'amount_minor')::bigint-round((_evidence->>'amount_minor')::numeric*rate),rate,lower(_evidence->>'currency'),'ash_marketplace_booking_'||b.id::text||'_v1');
  RETURN jsonb_build_object('ok',true,'booking_id',b.id);
END $$;
REVOKE ALL ON FUNCTION public.register_verified_stripe_booking(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_verified_stripe_booking(text,text,jsonb) TO service_role;

-- A Stripe completion updates eligibility without firing the legacy wallet
-- credit trigger: only non-Stripe booking completions retain that wallet path.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.bookings'::regclass AND tgfoid='public.charge_platform_commission()'::regprocedure AND NOT tgisinternal LOOP
    EXECUTE format('DROP TRIGGER %I ON public.bookings',t.tgname);
  END LOOP;
END $$;
CREATE TRIGGER booking_local_wallet_commission AFTER UPDATE ON public.bookings FOR EACH ROW
WHEN (NEW.payment_provider IS DISTINCT FROM 'STRIPE') EXECUTE FUNCTION public.charge_platform_commission();

CREATE FUNCTION public.guard_stripe_booking_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.payment_provider='STRIPE' AND NEW.status::text='COMPLETED' AND OLD.status::text IS DISTINCT FROM 'COMPLETED' THEN
    IF NEW.verification_status<>'VERIFIED' OR NEW.paid_at IS NULL OR NOT EXISTS(
      SELECT 1 FROM public.stripe_booking_releases WHERE booking_id=NEW.id AND status='PENDING_VERIFICATION') THEN
      RAISE EXCEPTION 'VERIFIED_STRIPE_PAYABLE_REQUIRED';
    END IF;
    NEW.provider_transfer_status:='PENDING_TRANSFER';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_stripe_booking_release BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.guard_stripe_booking_release();
CREATE FUNCTION public.queue_stripe_booking_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.payment_provider='STRIPE' AND NEW.status::text='COMPLETED' AND NEW.verification_status='VERIFIED' THEN
    UPDATE public.stripe_booking_releases SET status='ELIGIBLE' WHERE booking_id=NEW.id AND status='PENDING_VERIFICATION';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER queue_stripe_booking_release AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.queue_stripe_booking_release();

CREATE FUNCTION public.claim_stripe_booking_release(_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings%ROWTYPE; r public.stripe_booking_releases%ROWTYPE; c public.stripe_marketplace_controls%ROWTYPE; destination text;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
  SELECT * INTO r FROM public.stripe_booking_releases WHERE booking_id=_booking_id FOR UPDATE;
  SELECT * INTO c FROM public.stripe_marketplace_controls WHERE id;
  IF b.id IS NULL OR r.booking_id IS NULL OR c.transfers_enabled IS NOT TRUE OR r.marketplace_account_id IS DISTINCT FROM c.marketplace_account_id OR r.status IS DISTINCT FROM 'ELIGIBLE' OR b.status::text IS DISTINCT FROM 'COMPLETED' OR b.verification_status IS DISTINCT FROM 'VERIFIED' OR b.paid_at IS NULL OR NOT EXISTS (SELECT 1 FROM public.booking_verification_codes WHERE booking_id=b.id AND used_at IS NOT NULL) THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT p.stripe_account_id INTO destination FROM public.provider_profiles pp JOIN public.profiles p ON p.user_id=pp.user_id WHERE pp.id=b.provider_id;
  IF destination IS NULL THEN RETURN jsonb_build_object('ok',false); END IF;
  IF r.destination_account_id IS NOT NULL AND r.destination_account_id<>destination THEN RAISE EXCEPTION 'DESTINATION_CHANGED'; END IF;
  UPDATE public.stripe_booking_releases SET status='SUBMITTING',destination_account_id=destination,submitted_at=now() WHERE booking_id=_booking_id;
  RETURN jsonb_build_object('ok',true,'destination_account_id',destination,'amount_minor',r.amount_minor,'currency',r.currency,'source_charge_id',r.source_charge_id);
END $$;
REVOKE ALL ON FUNCTION public.claim_stripe_booking_release(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_booking_release(uuid) TO service_role;

CREATE FUNCTION public.finish_stripe_booking_release(_booking_id uuid,_transfer_id text,_reversed boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings%ROWTYPE; r public.stripe_booking_releases%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
  SELECT * INTO r FROM public.stripe_booking_releases WHERE booking_id=_booking_id FOR UPDATE;
  IF r.booking_id IS NULL OR _transfer_id NOT LIKE 'tr_%' OR (r.transfer_id IS NOT NULL AND r.transfer_id<>_transfer_id) THEN RAISE EXCEPTION 'TRANSFER_MISMATCH'; END IF;
  UPDATE public.stripe_booking_releases SET transfer_id=_transfer_id,status=CASE WHEN _reversed THEN 'REVERSED' WHEN status='HELD' THEN 'HELD' ELSE 'TRANSFERRED' END,transferred_at=coalesce(transferred_at,now()) WHERE booking_id=_booking_id;
  PERFORM set_config('app.booking_rpc','on',true);
  UPDATE public.bookings SET provider_transfer_id=_transfer_id,provider_transfer_status=CASE WHEN _reversed THEN 'REVERSED' WHEN r.status='HELD' THEN 'HELD' ELSE 'TRANSFERRED' END WHERE id=_booking_id;
END $$;
REVOKE ALL ON FUNCTION public.finish_stripe_booking_release(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_stripe_booking_release(uuid,text,boolean) TO service_role;

CREATE FUNCTION public.hold_stripe_booking_charge(_charge_id text,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE booking uuid;
BEGIN
  SELECT booking_id INTO booking FROM public.stripe_booking_releases WHERE source_charge_id=_charge_id;
  IF booking IS NOT NULL THEN PERFORM 1 FROM public.bookings WHERE id=booking FOR UPDATE; END IF;
  -- Persist the hold without reversing balances or initiating a refund.
  UPDATE public.stripe_booking_releases SET status='HELD',last_error=_reason WHERE source_charge_id=_charge_id;
END $$;
REVOKE ALL ON FUNCTION public.hold_stripe_booking_charge(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hold_stripe_booking_charge(text,text) TO service_role;

-- Payment and verification evidence cannot be forged through a member UPDATE.
CREATE FUNCTION public.guard_stripe_booking_evidence() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role','supabase_admin') AND
    (NEW.commission_rate IS DISTINCT FROM OLD.commission_rate OR
     NEW.verification_status IS DISTINCT FROM OLD.verification_status OR
     NEW.verified_at IS DISTINCT FROM OLD.verified_at OR
     NEW.provider_transfer_status IS DISTINCT FROM OLD.provider_transfer_status OR
     NEW.provider_transfer_id IS DISTINCT FROM OLD.provider_transfer_id) THEN
    RAISE EXCEPTION 'BOOKING_EVIDENCE_SERVER_ONLY';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_stripe_booking_evidence BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.guard_stripe_booking_evidence();

-- Account binding, execution activation and any historical repair remain
-- separate owner-approved actions, never seed data in this migration.