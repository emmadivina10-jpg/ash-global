CREATE OR REPLACE FUNCTION public.request_booking(_provider_id uuid, _service_id uuid, _scheduled_at timestamp with time zone, _notes text DEFAULT NULL::text, _address text DEFAULT NULL::text, _custom_title text DEFAULT NULL::text, _custom_price integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  prov RECORD;
  svc RECORD;
  bid uuid;
  cname text;
  b_title text;
  b_price integer;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  IF _scheduled_at IS NULL OR _scheduled_at < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_DATE'); END IF;

  SELECT id, user_id, business_name, is_live, accepting_bookings INTO prov
    FROM public.provider_profiles WHERE id = _provider_id;
  IF prov.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'PROVIDER_NOT_FOUND'); END IF;
  IF prov.user_id = uid THEN RETURN jsonb_build_object('ok', false, 'error', 'CANNOT_BOOK_SELF'); END IF;
  IF NOT prov.is_live OR NOT prov.accepting_bookings THEN RETURN jsonb_build_object('ok', false, 'error', 'PROVIDER_UNAVAILABLE'); END IF;

  IF _service_id IS NULL THEN
    b_title := nullif(trim(coalesce(_custom_title, '')), '');
    IF b_title IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'SERVICE_NOT_FOUND'); END IF;
    b_title := left(b_title, 120);
    b_price := greatest(coalesce(_custom_price, 0), 0);
    IF b_price > 10000000 THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_PRICE'); END IF;
  ELSE
    SELECT id, title, price, is_active INTO svc
      FROM public.provider_services WHERE id = _service_id AND provider_id = _provider_id;
    IF svc.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'SERVICE_NOT_FOUND'); END IF;
    IF NOT svc.is_active THEN RETURN jsonb_build_object('ok', false, 'error', 'SERVICE_UNAVAILABLE'); END IF;
    b_title := svc.title;
    b_price := svc.price;
  END IF;

  INSERT INTO public.bookings (client_id, provider_id, service_id, service_title, price, scheduled_at, notes, address, status, respond_by)
  VALUES (uid, _provider_id, _service_id, b_title, b_price, _scheduled_at, nullif(trim(coalesce(_notes,'')),''), nullif(trim(coalesce(_address,'')),''), 'PENDING', now() + interval '24 hours')
  RETURNING id INTO bid;

  SELECT full_name INTO cname FROM public.profiles WHERE user_id = uid;

  PERFORM public.notify_user(prov.user_id, 'BOOKING', 'New booking request',
    coalesce(nullif(cname,''), 'A client') || ' requested "' || b_title || '". Respond within 24 hours.',
    jsonb_build_object('booking_id', bid, 'status', 'PENDING'));

  PERFORM public.notify_user(uid, 'BOOKING', 'Booking request sent',
    'Your request for "' || b_title || '" was sent to ' || prov.business_name || '.',
    jsonb_build_object('booking_id', bid, 'status', 'PENDING'));

  RETURN jsonb_build_object('ok', true, 'booking_id', bid);
END;
$function$;

REVOKE ALL ON FUNCTION public.request_booking(uuid, uuid, timestamptz, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_booking(uuid, uuid, timestamptz, text, text, text, integer) TO authenticated;