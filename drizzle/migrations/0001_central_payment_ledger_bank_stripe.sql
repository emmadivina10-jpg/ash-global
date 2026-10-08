ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type = ANY (ARRAY['ACTIVATION_PAYMENT','REFERRAL_COMMISSION','WITHDRAWAL','WITHDRAWAL_REVERSAL','ADJUSTMENT','WALLET_TOPUP']));

CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid,
  amount numeric,
  currency text NOT NULL DEFAULT 'XAF',
  method text NOT NULL CHECK (method IN ('MTN','ORANGE','MOMO','BANK','CARD')),
  provider text NOT NULL CHECK (provider IN ('TCHOKOPAY','STRIPE','BANK')),
  provider_reference text,
  purpose text NOT NULL CHECK (purpose IN ('WALLET_TOPUP','PAYMENT_LINK','BOOKING','ACTIVATION','OTHER')),
  purpose_ref text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','SUCCESS','FAILED','CANCELLED','REFUNDED','EXPIRED')),
  reconciliation_status text NOT NULL DEFAULT 'UNRECONCILED' CHECK (reconciliation_status IN ('UNRECONCILED','RECONCILED','NEEDS_REVIEW')),
  payer_name text,
  confirmed_by text,
  bank_reference text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE UNIQUE INDEX payment_transactions_provider_ref_uidx ON public.payment_transactions(provider, provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX payment_transactions_user_idx ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX payment_transactions_status_idx ON public.payment_transactions(status, method);
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all payment_transactions" ON public.payment_transactions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.bank_accounts_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  iban text,
  swift text,
  branch text,
  country text,
  currency text NOT NULL DEFAULT 'XAF',
  instructions text,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  verified_by text,
  verified_at timestamptz,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bank_accounts_config TO service_role;
ALTER TABLE public.bank_accounts_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all bank_accounts_config" ON public.bank_accounts_config FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.complete_wallet_topup(_payment_reference text, _provider_transaction_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.payment_transactions%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.payment_transactions WHERE reference = _payment_reference AND purpose = 'WALLET_TOPUP' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOPUP_NOT_FOUND'; END IF;
  IF r.status = 'SUCCESS' THEN RETURN; END IF;
  IF r.status IN ('REFUNDED') THEN RAISE EXCEPTION 'TOPUP_FINAL'; END IF;
  IF r.user_id IS NULL OR r.amount IS NULL OR r.amount <= 0 THEN RAISE EXCEPTION 'TOPUP_INVALID'; END IF;

  UPDATE public.payment_transactions
     SET status = 'SUCCESS', completed_at = now(), updated_at = now(),
         provider_reference = COALESCE(provider_reference, NULLIF(_provider_transaction_id, '')),
         reconciliation_status = 'RECONCILED'
   WHERE id = r.id;

  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (r.user_id, 'WALLET_TOPUP', r.amount, r.currency, r.reference, 'Wallet top-up (' || r.method || ')', 'COMPLETED')
  ON CONFLICT (reference) DO NOTHING;

  INSERT INTO public.wallets (user_id, available_balance, currency)
  VALUES (r.user_id, r.amount, r.currency)
  ON CONFLICT (user_id) DO UPDATE SET available_balance = public.wallets.available_balance + EXCLUDED.available_balance, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.complete_wallet_topup(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_wallet_topup(text, text) TO service_role;