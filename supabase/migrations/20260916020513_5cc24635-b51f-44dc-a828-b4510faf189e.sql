CREATE OR REPLACE FUNCTION public.admin_credit_wallet(_user_id uuid, _amount numeric, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  w public.wallets%ROWTYPE;
  reference text;
  reason_text text;
  new_balance numeric;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_USER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND');
  END IF;

  IF _amount IS NULL OR _amount <= 0 OR _amount <> trunc(_amount) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT');
  END IF;

  reason_text := trim(coalesce(_reason, ''));
  IF length(reason_text) < 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'REASON_REQUIRED');
  END IF;
  reason_text := left(reason_text, 500);

  SELECT * INTO w FROM public.wallets WHERE user_id = _user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id)
    VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO w FROM public.wallets WHERE user_id = _user_id FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'WALLET_NOT_FOUND');
    END IF;
  END IF;

  reference := 'ADJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

  UPDATE public.wallets
  SET available_balance = available_balance + _amount,
      updated_at = now()
  WHERE user_id = _user_id
  RETURNING available_balance INTO new_balance;

  INSERT INTO public.transactions (
    user_id, type, amount, currency, reference, description, status
  ) VALUES (
    _user_id, 'ADJUSTMENT', _amount, 'XAF', reference,
    'Admin wallet credit: ' || reason_text, 'COMPLETED'
  );

  BEGIN
    PERFORM public.notify_user(
      _user_id,
      'WALLET',
      'Wallet credited',
      'Your ASH wallet has been credited with ' || _amount::text || ' XAF.',
      jsonb_build_object(
        'type', 'ADMIN_CREDIT',
        'amount', _amount,
        'currency', 'XAF',
        'reference', reference,
        'reason', reason_text
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'reference', reference,
    'amount', _amount,
    'currency', 'XAF',
    'new_balance', new_balance
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_credit_wallet(uuid, numeric, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_credit_wallet(uuid, numeric, text) TO service_role;