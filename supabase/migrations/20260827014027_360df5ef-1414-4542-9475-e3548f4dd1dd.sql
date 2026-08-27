-- 1) Invoice fee: always 1%, independent of legacy billing_mode values.
CREATE OR REPLACE FUNCTION public.complete_booking_payment(_payment_reference text, _provider_transaction_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b public.bookings%ROWTYPE;
  prov RECORD;
  fee integer := 0;
  net integer := 0;
  inv text;
  conv uuid;
  cprof RECORD;
  pprof RECORD;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE payment_reference = _payment_reference FOR UPDATE;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'BOOKING_NOT_FOUND'); END IF;
  IF b.status::text IN ('CONFIRMED','IN_PROGRESS','COMPLETED','SETTLED') THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'booking_id', b.id);
  END IF;

  SELECT id, user_id, business_name, billing_mode, phone INTO prov FROM public.provider_profiles WHERE id = b.provider_id;
  fee := round(b.price * 0.01);
  net := b.price - fee;
  inv := coalesce(b.invoice_number, 'ASH-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ash_invoice_seq')::text, 6, '0'));

  PERFORM set_config('app.booking_rpc', 'on', true);
  UPDATE public.bookings
     SET status = 'CONFIRMED', paid_at = now(), platform_fee = fee, provider_amount = net,
         invoice_number = inv, provider_transaction_id = coalesce(_provider_transaction_id, provider_transaction_id)
   WHERE id = b.id;

  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (b.client_id, 'BOOKING_PAYMENT', -b.price, 'XAF', 'BKGPAY-' || _payment_reference,
          'Payment for ' || b.service_title, 'COMPLETED')
  ON CONFLICT (reference) DO NOTHING;

  SELECT full_name, email, phone INTO cprof FROM public.profiles WHERE user_id = b.client_id;
  SELECT full_name, email, phone INTO pprof FROM public.profiles WHERE user_id = prov.user_id;

  SELECT id INTO conv FROM public.conversations
   WHERE provider_id = b.provider_id AND client_id = b.client_id
   ORDER BY (booking_id = b.id) DESC LIMIT 1;
  IF conv IS NULL THEN
    INSERT INTO public.conversations (provider_id, client_id, booking_id)
    VALUES (b.provider_id, b.client_id, b.id) RETURNING id INTO conv;
  ELSE
    UPDATE public.conversations SET booking_id = coalesce(booking_id, b.id) WHERE id = conv;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = conv AND kind = 'INVOICE' AND metadata->>'booking_id' = b.id::text) THEN
    INSERT INTO public.messages (conversation_id, sender_id, body, kind, metadata)
    VALUES (conv, b.client_id, 'ASH invoice ' || inv || ' — ' || b.service_title || ' — ' || b.price::text || ' XAF (paid)', 'INVOICE',
      jsonb_build_object(
        'booking_id', b.id, 'invoice_number', inv,
        'customer_name', coalesce(cprof.full_name,''), 'customer_email', coalesce(cprof.email,''), 'customer_phone', coalesce(cprof.phone,''),
        'provider_name', prov.business_name, 'provider_email', coalesce(pprof.email,''), 'provider_phone', coalesce(prov.phone, pprof.phone,''),
        'service', b.service_title, 'scheduled_at', b.scheduled_at, 'address', coalesce(b.address,''),
        'subtotal', b.price, 'platform_fee', fee, 'provider_amount', net, 'total', b.price,
        'payment_status', 'PAID', 'transaction_reference', _payment_reference));
  END IF;

  PERFORM public.notify_user(b.client_id, 'BOOKING', 'Payment successful — booking confirmed',
    'Your booking for "' || b.service_title || '" is confirmed. Invoice ' || inv || ' is in your messages.',
    jsonb_build_object('booking_id', b.id, 'status', 'CONFIRMED', 'invoice_number', inv, 'conversation_id', conv, 'celebrate', true));
  PERFORM public.notify_user(prov.user_id, 'BOOKING', 'Booking confirmed and paid',
    'Payment received for "' || b.service_title || '". You earn ' || net::text || ' XAF on completion.',
    jsonb_build_object('booking_id', b.id, 'status', 'CONFIRMED', 'invoice_number', inv, 'conversation_id', conv));

  RETURN jsonb_build_object('ok', true, 'booking_id', b.id, 'invoice_number', inv);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_booking_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_booking_payment(text, text) TO service_role;

-- 2) Ledger fee at completion: reuse the exact invoice figure when present.
CREATE OR REPLACE FUNCTION public.charge_platform_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD;
  fee numeric := 0;
  net numeric := 0;
  old_s text := coalesce(OLD.status::text, '');
  new_s text := NEW.status::text;
BEGIN
  SELECT user_id INTO p FROM public.provider_profiles WHERE id = NEW.provider_id;
  IF p.user_id IS NULL THEN RETURN NEW; END IF;

  fee := coalesce(nullif(NEW.platform_fee, 0), round(NEW.price * 0.01));
  net := NEW.price - fee;

  IF new_s = 'COMPLETED' AND old_s IS DISTINCT FROM 'COMPLETED' THEN
    IF fee > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
      VALUES (p.user_id, 'PLATFORM_FEE', -fee, 'XAF', 'FEE-' || NEW.id::text,
              'Platform fee (1%) for ' || NEW.service_title, 'COMPLETED')
      ON CONFLICT (reference) DO NOTHING;
    END IF;

    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (p.user_id, 'BOOKING_EARNING', net, 'XAF', 'BKG-' || NEW.id::text,
            'Booking earning for ' || NEW.service_title, 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;

    UPDATE public.wallets
       SET available_balance = available_balance + net,
           total_earned = total_earned + net,
           updated_at = now()
     WHERE user_id = p.user_id;
  END IF;

  IF old_s = 'COMPLETED' AND new_s IN ('REFUNDED','DISPUTED','NO_SHOW','CANCELLED') THEN
    IF fee > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
      VALUES (p.user_id, 'PLATFORM_FEE_REVERSAL', fee, 'XAF', 'FEEREV-' || NEW.id::text,
              'Platform fee reversed for ' || NEW.service_title, 'COMPLETED')
      ON CONFLICT (reference) DO NOTHING;
    END IF;

    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
    VALUES (p.user_id, 'BOOKING_REVERSAL', -net, 'XAF', 'BKGREV-' || NEW.id::text,
            'Booking earning reversed for ' || NEW.service_title, 'COMPLETED')
    ON CONFLICT (reference) DO NOTHING;

    UPDATE public.wallets
       SET available_balance = greatest(available_balance - net, 0),
           total_earned = greatest(total_earned - net, 0),
           updated_at = now()
     WHERE user_id = p.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.charge_platform_commission() FROM PUBLIC, anon, authenticated;