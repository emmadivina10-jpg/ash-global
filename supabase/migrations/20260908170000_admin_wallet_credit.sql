-- ============================================================
-- ASH Glo — Admin Wallet Credit
-- Creates a secure backend operation for adding withdrawable
-- funds to a user's wallet.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_credit_wallet(
  _user_id uuid,
  _amount numeric,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  w public.wallets%ROWTYPE;
  reference text;
  reason_text text;
  new_balance numeric;
BEGIN
  -- ----------------------------------------------------------
  -- 1. Require an authenticated user.
  -- ----------------------------------------------------------
  IF actor IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'UNAUTHENTICATED'
    );
  END IF;

  -- ----------------------------------------------------------
  -- 2. Only admins may credit wallets.
  -- ----------------------------------------------------------
  IF NOT public.has_role(actor, 'admin') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'FORBIDDEN'
    );
  END IF;

  -- ----------------------------------------------------------
  -- 3. Validate target user.
  -- ----------------------------------------------------------
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'INVALID_USER'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'USER_NOT_FOUND'
    );
  END IF;

  -- ----------------------------------------------------------
  -- 4. Validate amount.
  --
  -- Admin credits must be positive whole XAF amounts.
  -- ----------------------------------------------------------
  IF _amount IS NULL
     OR _amount <= 0
     OR _amount <> trunc(_amount)
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'INVALID_AMOUNT'
    );
  END IF;

  -- ----------------------------------------------------------
  -- 5. Require a meaningful reason.
  -- ----------------------------------------------------------
  reason_text := trim(coalesce(_reason, ''));

  IF length(reason_text) < 5 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'REASON_REQUIRED'
    );
  END IF;

  IF length(reason_text) > 500 THEN
    reason_text := left(reason_text, 500);
  END IF;

  -- ----------------------------------------------------------
  -- 6. Lock the wallet so concurrent operations cannot
  --    produce an inconsistent balance.
  -- ----------------------------------------------------------
  SELECT *
  INTO w
  FROM public.wallets
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'WALLET_NOT_FOUND'
    );
  END IF;

  -- ----------------------------------------------------------
  -- 7. Generate a unique ledger reference.
  -- ----------------------------------------------------------
  reference :=
    'ADJ-' ||
    upper(
      substr(
        replace(gen_random_uuid()::text, '-', ''),
        1,
        16
      )
    );

  -- ----------------------------------------------------------
  -- 8. Credit the user's available / withdrawable balance.
  -- ----------------------------------------------------------
  UPDATE public.wallets
  SET
    available_balance = available_balance + _amount,
    total_earned = total_earned + _amount,
    updated_at = now()
  WHERE user_id = _user_id
  RETURNING available_balance
  INTO new_balance;

  -- ----------------------------------------------------------
  -- 9. Create the immutable financial ledger entry.
  -- ----------------------------------------------------------
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    currency,
    reference,
    description,
    status
  )
  VALUES (
    _user_id,
    'ADMIN_CREDIT',
    _amount,
    'XAF',
    reference,
    reason_text,
    'COMPLETED'
  );

  -- ----------------------------------------------------------
  -- 10. Notify the user.
  -- ----------------------------------------------------------
  PERFORM public.notify_user(
    _user_id,
    'WALLET',
    'Wallet credited',
    'Your ASH wallet has been credited with ' ||
      _amount::text ||
      ' XAF.',
    jsonb_build_object(
      'type', 'ADMIN_CREDIT',
      'amount', _amount,
      'currency', 'XAF',
      'reference', reference,
      'reason', reason_text
    )
  );

  -- ----------------------------------------------------------
  -- 11. Return the result.
  -- ----------------------------------------------------------
  RETURN jsonb_build_object(
    'ok', true,
    'reference', reference,
    'amount', _amount,
    'currency', 'XAF',
    'new_balance', new_balance
  );
END;
$$;

-- ------------------------------------------------------------
-- Function permissions
-- ------------------------------------------------------------

REVOKE ALL
ON FUNCTION public.admin_credit_wallet(uuid, numeric, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_credit_wallet(uuid, numeric, text)
TO authenticated;
