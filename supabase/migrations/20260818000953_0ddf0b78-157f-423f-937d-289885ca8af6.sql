-- ============ transition guard ============
CREATE OR REPLACE FUNCTION public.enforce_booking_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  uid uuid := auth.uid();
  is_provider boolean;
  is_client boolean;
  via_rpc boolean := coalesce(current_setting('app.booking_rpc', true), '') = 'on';
  old_s text := OLD.status::text;
  new_s text := NEW.status::text;
  allowed text[];
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price
     OR NEW.service_id IS DISTINCT FROM OLD.service_id
     OR NEW.service_title IS DISTINCT FROM OLD.service_title
     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'BOOKING_TERMS_IMMUTABLE';
  END IF;

  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at AND old_s <> 'PENDING' THEN
    RAISE EXCEPTION 'BOOKING_SCHEDULE_LOCKED';
  END IF;

  IF new_s IS DISTINCT FROM old_s THEN
    allowed := CASE old_s
      WHEN 'PENDING' THEN ARRAY['ACCEPTED','DECLINED','CANCELLED','PAYMENT_EXPIRED']
      WHEN 'ACCEPTED' THEN ARRAY['PAYMENT_PROCESSING','CANCELLED','PAYMENT_EXPIRED']
      WHEN 'PAYMENT_PROCESSING' THEN ARRAY['CONFIRMED','PAYMENT_FAILED','PAYMENT_EXPIRED','CANCELLED']
      WHEN 'PAYMENT_FAILED' THEN ARRAY['PAYMENT_PROCESSING','CANCELLED','PAYMENT_EXPIRED']
      WHEN 'PAYMENT_EXPIRED' THEN ARRAY['CANCELLED']
      WHEN 'CONFIRMED' THEN ARRAY['IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW','DISPUTED','REFUNDED']
      WHEN 'IN_PROGRESS' THEN ARRAY['COMPLETED','NO_SHOW','DISPUTED']
      WHEN 'COMPLETED' THEN ARRAY['SETTLED','DISPUTED','REFUNDED']
      ELSE ARRAY[]::text[]
    END;

    IF uid IS NOT NULL AND NOT public.has_role(uid, 'admin') AND NOT (new_s = ANY (allowed)) THEN
      RAISE EXCEPTION 'BOOKING_INVALID_TRANSITION_% _TO_%', old_s, new_s;
    END IF;

    IF uid IS NOT NULL AND NOT via_rpc AND NOT public.has_role(uid, 'admin') THEN
      SELECT EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = OLD.provider_id AND p.user_id = uid)
        INTO is_provider;
      is_client := OLD.client_id = uid;
      IF is_client AND NOT is_provider THEN
        IF NOT (new_s = 'CANCELLED' AND old_s IN ('PENDING','ACCEPTED','PAYMENT_FAILED','PAYMENT_EXPIRED','CONFIRMED')) THEN
          RAISE EXCEPTION 'BOOKING_STATUS_FORBIDDEN';
        END IF;
      ELSIF is_provider THEN
        IF NOT (new_s = ANY (ARRAY['ACCEPTED','DECLINED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'])) THEN
          RAISE EXCEPTION 'BOOKING_STATUS_FORBIDDEN';
        END IF;
      ELSE
        RAISE EXCEPTION 'BOOKING_STATUS_FORBIDDEN';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============ request ============
CREATE OR REPLACE FUNCTION public.request_booking(
  _provider_id uuid, _service_id uuid, _scheduled_at timestamptz, _notes text DEFAULT NULL, _address text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  uid uuid := auth.uid();
  prov RECORD;
  svc RECORD;
  bid uuid;
  cname text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  IF _scheduled_at IS NULL OR _scheduled_at < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_DATE'); END IF;

  SELECT id, user_id, business_name, is_live, accepting_bookings INTO prov
    FROM public.provider_profiles WHERE id = _provider_id;
  IF prov.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'PROVIDER_NOT_FOUND'); END IF;
  IF prov.user_id = uid THEN RETURN jsonb_build_object('ok', false, 'error', 'CANNOT_BOOK_SELF'); END IF;
  IF NOT prov.is_live OR NOT prov.accepting_bookings THEN RETURN jsonb_build_object('ok', false, 'error', 'PROVIDER_UNAVAILABLE'); END IF;

  SELECT id, title, price, is_active INTO svc
    FROM public.provider_services WHERE id = _service_id AND provider_id = _provider_id;
  IF svc.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'SERVICE_NOT_FOUND'); END IF;
  IF NOT svc.is_active THEN RETURN jsonb_build_object('ok', false, 'error', 'SERVICE_UNAVAILABLE'); END IF;

  INSERT INTO public.bookings (client_id, provider_id, service_id, service_title, price, scheduled_at, notes, address, status, respond_by)
  VALUES (uid, _provider_id, _service_id, svc.title, svc.price, _scheduled_at, nullif(trim(coalesce(_notes,'')),''), nullif(trim(coalesce(_address,'')),''), 'PENDING', now() + interval '24 hours')
  RETURNING id INTO bid;

  SELECT full_name INTO cname FROM public.profiles WHERE user_id = uid;

  PERFORM public.notify_user(prov.user_id, 'BOOKING', 'New booking request',
    coalesce(nullif(cname,''), 'A client') || ' requested "' || svc.title || '". Respond within 24 hours.',
    jsonb_build_object('booking_id', bid, 'status', 'PENDING'));

  PERFORM public.notify_user(uid, 'BOOKING', 'Booking request sent',
    'Your request for "' || svc.title || '" was sent to ' || prov.business_name || '.',
    jsonb_build_object('booking_id', bid, 'status', 'PENDING'));

  RETURN jsonb_build_object('ok', true, 'booking_id', bid);
END;
$function$;

-- ============ provider decision ============
CREATE OR REPLACE FUNCTION public.decide_booking(_booking_id uuid, _accept boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  uid uuid := auth.uid();
  b public.bookings%ROWTYPE;
  pname text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF NOT public.is_provider_owner(b.provider_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN'); END IF;
  IF b.status::text <> 'PENDING' THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_PENDING'); END IF;

  SELECT business_name INTO pname FROM public.provider_profiles WHERE id = b.provider_id;
  PERFORM set_config('app.booking_rpc', 'on', true);

  IF _accept THEN
    UPDATE public.bookings SET status = 'ACCEPTED', accepted_at = now(), pay_by = now() + interval '24 hours'
     WHERE id = b.id;
    PERFORM public.notify_user(b.client_id, 'BOOKING', 'Your booking request has been accepted',
      pname || ' accepted "' || b.service_title || '". Please complete payment within 24 hours.',
      jsonb_build_object('booking_id', b.id, 'status', 'ACCEPTED', 'payment_required', true));
  ELSE
    UPDATE public.bookings SET status = 'DECLINED', decline_reason = nullif(trim(coalesce(_reason,'')),'')
     WHERE id = b.id;
    PERFORM public.notify_user(b.client_id, 'BOOKING', 'Booking request declined',
      pname || ' could not take "' || b.service_title || '".' ||
      coalesce(' Reason: ' || nullif(trim(coalesce(_reason,'')),''), '') || ' No payment was collected.',
      jsonb_build_object('booking_id', b.id, 'status', 'DECLINED'));
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ============ client cancel ============
CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); b public.bookings%ROWTYPE; puid uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF b.client_id <> uid THEN RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN'); END IF;
  IF b.status::text NOT IN ('PENDING','ACCEPTED','PAYMENT_FAILED','PAYMENT_EXPIRED') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_CANCELLABLE');
  END IF;
  PERFORM set_config('app.booking_rpc', 'on', true);
  UPDATE public.bookings SET status = 'CANCELLED', decline_reason = nullif(trim(coalesce(_reason,'')),'') WHERE id = b.id;
  SELECT user_id INTO puid FROM public.provider_profiles WHERE id = b.provider_id;
  PERFORM public.notify_user(puid, 'BOOKING', 'Booking cancelled',
    'A client cancelled "' || b.service_title || '".', jsonb_build_object('booking_id', b.id, 'status', 'CANCELLED'));
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ============ start payment ============
CREATE OR REPLACE FUNCTION public.begin_booking_payment(_booking_id uuid, _reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); b public.bookings%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF b.client_id <> uid THEN RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN'); END IF;
  IF b.status::text NOT IN ('ACCEPTED','PAYMENT_PROCESSING','PAYMENT_FAILED') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PAYMENT_NOT_AVAILABLE');
  END IF;
  IF b.pay_by IS NOT NULL AND b.pay_by < now() THEN
    PERFORM set_config('app.booking_rpc', 'on', true);
    UPDATE public.bookings SET status = 'PAYMENT_EXPIRED' WHERE id = b.id;
    RETURN jsonb_build_object('ok', false, 'error', 'PAYMENT_WINDOW_EXPIRED');
  END IF;
  PERFORM set_config('app.booking_rpc', 'on', true);
  UPDATE public.bookings SET status = 'PAYMENT_PROCESSING', payment_reference = _reference WHERE id = b.id;
  RETURN jsonb_build_object('ok', true, 'amount', b.price);
END;
$function$;

-- ============ verified payment (service role only) ============
CREATE OR REPLACE FUNCTION public.complete_booking_payment(_payment_reference text, _provider_transaction_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
  IF prov.billing_mode = 'COMMISSION' THEN fee := round(b.price * 0.01); END IF;
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

CREATE OR REPLACE FUNCTION public.fail_booking_payment(_payment_reference text, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE b public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE payment_reference = _payment_reference FOR UPDATE;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF b.status::text <> 'PAYMENT_PROCESSING' THEN RETURN jsonb_build_object('ok', true, 'skipped', true); END IF;
  PERFORM set_config('app.booking_rpc', 'on', true);
  UPDATE public.bookings SET status = 'PAYMENT_FAILED' WHERE id = b.id;
  PERFORM public.notify_user(b.client_id, 'BOOKING', 'Payment failed',
    'Your payment for "' || b.service_title || '" did not go through. You can try again.',
    jsonb_build_object('booking_id', b.id, 'status', 'PAYMENT_FAILED'));
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ============ progress ============
CREATE OR REPLACE FUNCTION public.set_booking_progress(_booking_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); b public.bookings%ROWTYPE; puid uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  IF _status NOT IN ('IN_PROGRESS','COMPLETED','NO_SHOW') THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_STATUS'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF NOT public.is_provider_owner(b.provider_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN'); END IF;
  PERFORM set_config('app.booking_rpc', 'on', true);
  UPDATE public.bookings SET status = _status::public.booking_status,
      completed_at = CASE WHEN _status = 'COMPLETED' THEN now() ELSE completed_at END
   WHERE id = b.id;
  SELECT user_id INTO puid FROM public.provider_profiles WHERE id = b.provider_id;
  IF _status = 'COMPLETED' THEN
    PERFORM public.notify_user(b.client_id, 'BOOKING', 'Service completed',
      'How did "' || b.service_title || '" go? Leave a review.',
      jsonb_build_object('booking_id', b.id, 'status', 'COMPLETED', 'review_available', true));
    PERFORM public.notify_user(puid, 'BOOKING', 'Booking completed',
      'Your earning for "' || b.service_title || '" has been credited to your wallet.',
      jsonb_build_object('booking_id', b.id, 'status', 'COMPLETED'));
  ELSIF _status = 'IN_PROGRESS' THEN
    PERFORM public.notify_user(b.client_id, 'BOOKING', 'Service started',
      '"' || b.service_title || '" is now in progress.', jsonb_build_object('booking_id', b.id, 'status', 'IN_PROGRESS'));
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ============ reviews ============
CREATE OR REPLACE FUNCTION public.submit_review(_booking_id uuid, _rating integer, _comment text DEFAULT NULL, _photo_path text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); b public.bookings%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_RATING'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF b.client_id <> uid THEN RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN'); END IF;
  IF b.status::text NOT IN ('COMPLETED','SETTLED') THEN RETURN jsonb_build_object('ok', false, 'error', 'BOOKING_NOT_COMPLETED'); END IF;
  IF EXISTS (SELECT 1 FROM public.reviews WHERE booking_id = b.id) THEN RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_REVIEWED'); END IF;

  INSERT INTO public.reviews (booking_id, provider_id, client_id, rating, comment, photo_path)
  VALUES (b.id, b.provider_id, uid, _rating, nullif(trim(coalesce(_comment,'')),''), _photo_path);

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ============ grants ============
REVOKE ALL ON FUNCTION public.request_booking(uuid, uuid, timestamptz, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_booking(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.begin_booking_payment(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_booking_progress(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_review(uuid, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_booking_payment(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_booking_payment(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.request_booking(uuid, uuid, timestamptz, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_booking(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.begin_booking_payment(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_booking_progress(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_review(uuid, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking_payment(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_booking_payment(text, text) TO service_role;