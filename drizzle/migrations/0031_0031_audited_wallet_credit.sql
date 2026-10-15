-- PROPOSED production migration 0031 (v4, final for approval) — NOT APPLIED. Requires separate written approval.
-- Adds an immutable request-idempotency table and an atomic, audited wallet-credit function.
-- The legacy public.admin_credit_wallet(uuid, numeric, text) is left untouched (compatibility window).
-- Deliberately excludes staging 0013 (photo-check grant: production already has it)
-- and staging 0014 (sign-up trigger: production already works).

-- 1. Request records: one row per accepted credit, written once with its final result, never changed.
CREATE TABLE public.wallet_credit_requests (
  request_id       uuid PRIMARY KEY,
  user_id          uuid NOT NULL,
  amount           numeric NOT NULL
                   CONSTRAINT wallet_credit_requests_amount_check
                   CHECK (amount > 0 AND amount = trunc(amount) AND amount <= 10000000),
  currency         text NOT NULL DEFAULT 'XAF' CHECK (currency = 'XAF'),
  reason           text NOT NULL CHECK (length(reason) BETWEEN 5 AND 500),
  actor_staff_id   uuid NOT NULL,
  actor_department text NOT NULL CHECK (actor_department IN ('REVENUE', 'SUPER_ADMIN')),
  reference        text NOT NULL UNIQUE,
  result           jsonb NOT NULL CHECK (result ? 'ok' AND result ? 'reference'),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- No direct table access for any app role. Only the owner-run security-definer functions below touch it.
REVOKE ALL ON public.wallet_credit_requests FROM PUBLIC, anon, authenticated, service_role;
-- Production default privileges also give the platform's read-only inspection role SELECT+INSERT on new tables.
-- Keep read-only SELECT for verification; remove any write ability.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.wallet_credit_requests FROM sandbox_exec;
  END IF;
END $$;

ALTER TABLE public.wallet_credit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to wallet credit requests" ON public.wallet_credit_requests
  AS RESTRICTIVE FOR ALL TO anon, authenticated, service_role USING (false) WITH CHECK (false);

-- Immutable: reuse the existing production block_change() trigger function.
CREATE TRIGGER trg_wallet_credit_requests_immutable_update
  BEFORE UPDATE ON public.wallet_credit_requests
  FOR EACH ROW EXECUTE FUNCTION public.block_change();
CREATE TRIGGER trg_wallet_credit_requests_immutable_delete
  BEFORE DELETE ON public.wallet_credit_requests
  FOR EACH ROW EXECUTE FUNCTION public.block_change();

COMMENT ON TABLE public.wallet_credit_requests IS
  'Append-only idempotency record for staff wallet credits. Written once by admin_credit_wallet_audited.';

-- 2. Atomic audited credit. Balance, transaction, audit entry and request record commit together or not at all.
--    The acting seat is re-read here; department and name come from the database, never from the caller.
CREATE FUNCTION public.admin_credit_wallet_audited(
  _request_id uuid,
  _user_id    uuid,
  _amount     numeric,
  _reason     text,
  _staff_id   uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  reason_text  text := trim(coalesce(_reason, ''));
  seat_active  boolean;
  seat_dept    text;
  seat_extra   text[];
  actor_name   text;
  actor_dept   text;
  actor_emp_id text;
  review_flag  boolean;
  review_threshold constant numeric := 500000; -- PROPOSED VALUE, NOT CONFIRMED BY OWNER: XAF review threshold
  existing     public.wallet_credit_requests%ROWTYPE;
  old_balance  numeric;
  new_balance  numeric;
  ref          text;
  res          jsonb;
BEGIN
  -- Input
  IF _request_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'REQUEST_ID_REQUIRED'); END IF;
  IF _user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_USER'); END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount <> trunc(_amount) OR _amount > 10000000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT');
  END IF;
  IF length(reason_text) < 5 THEN RETURN jsonb_build_object('ok', false, 'error', 'REASON_REQUIRED'); END IF;
  IF length(reason_text) > 500 THEN RETURN jsonb_build_object('ok', false, 'error', 'REASON_TOO_LONG'); END IF;

  -- Actor: an individual, active Revenue or Super-admin seat is mandatory. No seat-less path exists.
  IF _staff_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'MISSING_ACTOR'); END IF;
  SELECT s.is_active, s.department, coalesce(s.extra_departments, '{}'::text[]),
         coalesce(s.employee_name, s.full_name, s.username, 'Staff'), s.employee_id
    INTO seat_active, seat_dept, seat_extra, actor_name, actor_emp_id
    FROM public.staff_accounts s
   WHERE s.id = _staff_id
     FOR SHARE;
  IF NOT FOUND OR NOT coalesce(seat_active, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_ACTOR');
  END IF;
  IF seat_dept IN ('REVENUE', 'SUPER_ADMIN') THEN
    actor_dept := seat_dept;
  ELSIF 'REVENUE' = ANY(seat_extra) THEN
    actor_dept := 'REVENUE';
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_ACTOR');
  END IF;

  -- Idempotency: serialize all calls for this request ID inside this transaction.
  PERFORM pg_advisory_xact_lock(hashtextextended('wallet_credit:' || _request_id::text, 0));

  SELECT * INTO existing FROM public.wallet_credit_requests WHERE request_id = _request_id;
  IF FOUND THEN
    IF existing.user_id <> _user_id
       OR existing.amount <> _amount
       OR existing.reason <> reason_text
       OR existing.actor_staff_id <> _staff_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'REQUEST_ID_REUSED');
    END IF;
    RETURN existing.result || jsonb_build_object('replayed', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND');
  END IF;

  -- Wallet (same conventions as the legacy function: XAF available_balance, create if missing).
  SELECT w.available_balance INTO old_balance FROM public.wallets w WHERE w.user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
    SELECT w.available_balance INTO old_balance FROM public.wallets w WHERE w.user_id = _user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'WALLET_NOT_FOUND'); END IF;
  END IF;

  review_flag := _amount >= review_threshold;
  ref := 'ADJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

  UPDATE public.wallets
     SET available_balance = available_balance + _amount, updated_at = now()
   WHERE user_id = _user_id
  RETURNING available_balance INTO new_balance;

  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (_user_id, 'ADJUSTMENT', _amount, 'XAF', ref, 'Admin wallet credit: ' || reason_text, 'COMPLETED');

  -- Required audit entry: any failure raises and rolls back the whole credit.
  INSERT INTO public.admin_audit_log
    (actor, action, target_user_id, target_reference, previous_state, new_state, reason, metadata)
  VALUES
    (actor_name, 'WALLET_CREDIT', _user_id, ref,
     jsonb_build_object('available_balance', old_balance),
     jsonb_build_object('available_balance', new_balance, 'amount', _amount, 'currency', 'XAF'),
     reason_text,
     jsonb_build_object('department', actor_dept, 'staff_id', _staff_id, 'employee_id', actor_emp_id,
                        'request_id', _request_id, 'review_required', review_flag,
                        'review_threshold', review_threshold));

  -- Unusually large credits get a second, separate audit entry for review (same transaction).
  IF review_flag THEN
    INSERT INTO public.admin_audit_log
      (actor, action, target_user_id, target_reference, previous_state, new_state, reason, metadata)
    VALUES
      (actor_name, 'WALLET_CREDIT_REVIEW_REQUIRED', _user_id, ref, '{}'::jsonb,
       jsonb_build_object('amount', _amount, 'currency', 'XAF'),
       'Credit at or above review threshold',
       jsonb_build_object('staff_id', _staff_id, 'employee_id', actor_emp_id,
                          'request_id', _request_id, 'review_threshold', review_threshold));
  END IF;

  -- Result is computed BEFORE the request row is written, so the row is inserted once and never updated.
  res := jsonb_build_object('ok', true, 'reference', ref, 'amount', _amount,
                            'currency', 'XAF', 'new_balance', new_balance,
                            'review_required', review_flag);

  INSERT INTO public.wallet_credit_requests
    (request_id, user_id, amount, currency, reason, actor_staff_id, actor_department, reference, result)
  VALUES
    (_request_id, _user_id, _amount, 'XAF', reason_text, _staff_id, actor_dept, ref, res);

  -- Member notification is best-effort and never affects the financial outcome.
  BEGIN
    PERFORM public.notify_user(_user_id, 'WALLET', 'Wallet credited',
      'Your ASH wallet has been credited with ' || _amount::text || ' XAF.',
      jsonb_build_object('type', 'ADMIN_CREDIT', 'amount', _amount, 'currency', 'XAF', 'reference', ref));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN res;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_credit_wallet_audited(uuid, uuid, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_credit_wallet_audited(uuid, uuid, numeric, text, uuid) TO service_role;

-- 3. Read-only verification path: returns a stored request by ID. Cannot create or change records.
CREATE FUNCTION public.get_wallet_credit_request(_request_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT jsonb_build_object(
    'request_id', r.request_id, 'user_id', r.user_id, 'amount', r.amount, 'currency', r.currency,
    'actor_staff_id', r.actor_staff_id, 'actor_department', r.actor_department,
    'reference', r.reference, 'result', r.result, 'created_at', r.created_at,
    'transaction_count', (SELECT count(*) FROM public.transactions t WHERE t.reference = r.reference),
    'audit_count', (SELECT count(*) FROM public.admin_audit_log a
                     WHERE a.action = 'WALLET_CREDIT' AND a.target_reference = r.reference))
  FROM public.wallet_credit_requests r WHERE r.request_id = _request_id;
$function$;
REVOKE ALL ON FUNCTION public.get_wallet_credit_request(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_credit_request(uuid) TO service_role;

-- Inspection role: never allowed to run either new function, regardless of default privileges.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    REVOKE ALL ON FUNCTION public.admin_credit_wallet_audited(uuid, uuid, numeric, text, uuid) FROM sandbox_exec;
    REVOKE ALL ON FUNCTION public.get_wallet_credit_request(uuid) FROM sandbox_exec;
  END IF;
END $$;

COMMENT ON FUNCTION public.admin_credit_wallet(uuid, numeric, text) IS
  'DEPRECATED: replaced by admin_credit_wallet_audited. Server-key access is revoked in migration 0032 after release verification.';
