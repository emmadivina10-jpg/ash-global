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
  fee := round(b.price * coalesce(public.campus_commission_rate(b.provider_id), (SELECT commission_rate FROM public.marketplace_settings WHERE id), 0.12));
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
    'Your booking for "' || b.service_title || '" is confirmed. Your private ASH verification code is on your booking — give it to the provider only when the service is done.',
    jsonb_build_object('booking_id', b.id, 'status', 'CONFIRMED', 'invoice_number', inv, 'conversation_id', conv, 'celebrate', true));
  PERFORM public.notify_user(prov.user_id, 'BOOKING', 'Booking confirmed and paid',
    'Payment received for "' || b.service_title || '". You earn ' || net::text || ' XAF once the customer gives you their ASH verification code.',
    jsonb_build_object('booking_id', b.id, 'status', 'CONFIRMED', 'invoice_number', inv, 'conversation_id', conv));

  RETURN jsonb_build_object('ok', true, 'booking_id', b.id, 'invoice_number', inv);
END;
$function$;