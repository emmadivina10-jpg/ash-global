
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  account_status text NOT NULL DEFAULT 'PENDING' CHECK (account_status IN ('PENDING','ACTIVE','SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_referred_by ON public.profiles(referred_by);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- protect immutable / server-controlled columns
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' OR auth.uid() IS NOT NULL THEN
    NEW.referral_code := OLD.referral_code;
    NEW.referred_by := OLD.referred_by;
    NEW.account_status := OLD.account_status;
    NEW.email := OLD.email;
    NEW.user_id := OLD.user_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_profile BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- WALLETS
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance numeric(14,2) NOT NULL DEFAULT 0,
  pending_balance numeric(14,2) NOT NULL DEFAULT 0,
  total_earned numeric(14,2) NOT NULL DEFAULT 0,
  total_withdrawn numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XAF',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own wallet" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- REFERRALS
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level smallint NOT NULL CHECK (level BETWEEN 1 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_user_id),
  CHECK (referrer_id <> referred_user_id)
);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own referrals" ON public.referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ACTIVATIONS
CREATE TABLE public.activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL DEFAULT 5000,
  currency text NOT NULL DEFAULT 'XAF',
  payment_provider text NOT NULL DEFAULT 'TCHOKOPAY',
  provider_transaction_id text,
  payment_reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','PAID','FAILED','CANCELLED')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activations_user ON public.activations(user_id);
GRANT SELECT ON public.activations TO authenticated;
GRANT ALL ON public.activations TO service_role;
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own activations" ON public.activations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- TRANSACTIONS (immutable ledger)
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ACTIVATION_PAYMENT','REFERRAL_COMMISSION','WITHDRAWAL','WITHDRAWAL_REVERSAL','ADJUSTMENT')),
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  reference text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING','COMPLETED','FAILED','REVERSED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_user ON public.transactions(user_id, created_at DESC);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own transactions" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- WITHDRAWALS
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XAF',
  payment_method text NOT NULL CHECK (payment_method IN ('MTN_MOMO','ORANGE_MONEY')),
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','REVERSED')),
  reference text NOT NULL UNIQUE,
  provider_reference text,
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX idx_withdrawals_user ON public.withdrawals(user_id, requested_at DESC);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage withdrawals" ON public.withdrawals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- REFERRAL CODE GENERATION
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := 'REFER-';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- NEW USER HANDLER: profile + wallet + referral chain
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text;
  v_parent uuid;
  v_l2 uuid;
  v_l3 uuid;
BEGIN
  v_code := upper(coalesce(NEW.raw_user_meta_data->>'referral_code',''));
  IF v_code <> '' THEN
    SELECT p.user_id INTO v_parent FROM public.profiles p WHERE upper(p.referral_code) = v_code;
    IF v_parent = NEW.id THEN v_parent := NULL; END IF;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, phone, referral_code, referred_by)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name',''),
    coalesce(NEW.email,''),
    coalesce(NEW.raw_user_meta_data->>'phone',''),
    public.generate_referral_code(),
    v_parent
  );

  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  IF v_parent IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_user_id, level) VALUES (v_parent, NEW.id, 1) ON CONFLICT DO NOTHING;
    SELECT referred_by INTO v_l2 FROM public.profiles WHERE user_id = v_parent;
    IF v_l2 IS NOT NULL AND v_l2 <> NEW.id THEN
      INSERT INTO public.referrals (referrer_id, referred_user_id, level) VALUES (v_l2, NEW.id, 2) ON CONFLICT DO NOTHING;
      SELECT referred_by INTO v_l3 FROM public.profiles WHERE user_id = v_l2;
      IF v_l3 IS NOT NULL AND v_l3 <> NEW.id THEN
        INSERT INTO public.referrals (referrer_id, referred_user_id, level) VALUES (v_l3, NEW.id, 3) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- IMMUTABLE REFERRALS
CREATE OR REPLACE FUNCTION public.block_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Records in % are immutable', TG_TABLE_NAME; END; $$;
CREATE TRIGGER trg_referrals_immutable BEFORE UPDATE OR DELETE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.block_change();
CREATE TRIGGER trg_transactions_immutable BEFORE DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.block_change();

-- ACTIVATION + COMMISSION ENGINE (server-side only)
CREATE OR REPLACE FUNCTION public.complete_activation(_payment_reference text, _provider_transaction_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  act public.activations%ROWTYPE;
  r RECORD;
  commission numeric;
BEGIN
  SELECT * INTO act FROM public.activations WHERE payment_reference = _payment_reference FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'ACTIVATION_NOT_FOUND'); END IF;
  IF act.status = 'PAID' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;

  UPDATE public.activations
    SET status = 'PAID', paid_at = now(), updated_at = now(),
        provider_transaction_id = coalesce(_provider_transaction_id, provider_transaction_id)
    WHERE id = act.id;

  UPDATE public.profiles SET account_status = 'ACTIVE', updated_at = now() WHERE user_id = act.user_id;

  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (act.user_id, 'ACTIVATION_PAYMENT', -act.amount, act.currency, 'ACT-' || act.payment_reference, 'Account activation fee', 'COMPLETED')
  ON CONFLICT (reference) DO NOTHING;

  FOR r IN
    SELECT ref.referrer_id, ref.level FROM public.referrals ref
    JOIN public.profiles p ON p.user_id = ref.referrer_id
    WHERE ref.referred_user_id = act.user_id AND p.account_status = 'ACTIVE'
  LOOP
    commission := CASE r.level WHEN 1 THEN 1500 WHEN 2 THEN 750 WHEN 3 THEN 250 ELSE 0 END;
    IF commission > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
      VALUES (r.referrer_id, 'REFERRAL_COMMISSION', commission, 'XAF',
              'COM-' || act.payment_reference || '-L' || r.level,
              'Level ' || r.level || ' referral commission', 'COMPLETED')
      ON CONFLICT (reference) DO NOTHING;
      IF FOUND THEN
        UPDATE public.wallets SET available_balance = available_balance + commission,
               total_earned = total_earned + commission, updated_at = now()
        WHERE user_id = r.referrer_id;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'user_id', act.user_id);
END;
$$;

-- WITHDRAWAL REQUEST (validated server-side)
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method text, _phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  RETURN jsonb_build_object('ok', true, 'reference', ref);
END;
$$;

-- ADMIN: settle withdrawal
CREATE OR REPLACE FUNCTION public.settle_withdrawal(_withdrawal_id uuid, _status text, _provider_reference text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  wd public.withdrawals%ROWTYPE;
BEGIN
  IF NOT public.has_role(uid,'admin') THEN RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN'); END IF;
  IF _status NOT IN ('PROCESSING','COMPLETED','FAILED','REVERSED') THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_STATUS'); END IF;
  SELECT * INTO wd FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF wd.status IN ('COMPLETED','FAILED','REVERSED') THEN RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_SETTLED'); END IF;

  UPDATE public.withdrawals SET status = _status, provider_reference = coalesce(_provider_reference, provider_reference),
    admin_note = coalesce(_note, admin_note),
    processed_at = CASE WHEN _status IN ('COMPLETED','FAILED','REVERSED') THEN now() ELSE processed_at END
  WHERE id = wd.id;

  IF _status = 'COMPLETED' THEN
    UPDATE public.wallets SET pending_balance = pending_balance - wd.amount,
      total_withdrawn = total_withdrawn + wd.amount, updated_at = now() WHERE user_id = wd.user_id;
    UPDATE public.transactions SET status = 'COMPLETED' WHERE reference = wd.reference;
  ELSIF _status IN ('FAILED','REVERSED') THEN
    UPDATE public.wallets SET pending_balance = pending_balance - wd.amount,
      available_balance = available_balance + wd.amount, updated_at = now() WHERE user_id = wd.user_id;
    UPDATE public.transactions SET status = 'REVERSED' WHERE reference = wd.reference;
    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (wd.user_id, 'WITHDRAWAL_REVERSAL', wd.amount, wd.currency, wd.reference || '-REV', 'Withdrawal reversed', 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;
