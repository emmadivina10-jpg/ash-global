-- 1. Remove anon EXECUTE on SECURITY DEFINER routines
REVOKE EXECUTE ON FUNCTION public.admin_credit_wallet(uuid, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.console_platform_payout(integer, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_provider_owner(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.provider_slots(uuid, date, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_credit_wallet(uuid, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_platform_payout(integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_provider_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.provider_slots(uuid, date, integer) TO authenticated, service_role;

-- 2. Bookings can only be created through request_booking (SECURITY DEFINER)
DROP POLICY IF EXISTS "Clients create their bookings" ON public.bookings;

-- 3. Event tickets can only be created by the server-side purchase flow
DROP POLICY IF EXISTS "tickets_insert_own" ON public.event_tickets;

-- 4. Financial columns on bookings are immutable for clients/providers
CREATE OR REPLACE FUNCTION public.enforce_booking_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- payment/settlement columns are owned by the payment flow only
  IF uid IS NOT NULL AND NOT via_rpc AND NOT public.has_role(uid, 'admin') THEN
    IF NEW.platform_fee IS DISTINCT FROM OLD.platform_fee
       OR NEW.provider_amount IS DISTINCT FROM OLD.provider_amount
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
       OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference
       OR NEW.provider_transaction_id IS DISTINCT FROM OLD.provider_transaction_id
       OR NEW.payment_provider IS DISTINCT FROM OLD.payment_provider
       OR NEW.payment_currency IS DISTINCT FROM OLD.payment_currency
       OR NEW.payment_amount IS DISTINCT FROM OLD.payment_amount
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
       OR NEW.pay_by IS DISTINCT FROM OLD.pay_by
       OR NEW.respond_by IS DISTINCT FROM OLD.respond_by THEN
      RAISE EXCEPTION 'BOOKING_PAYMENT_FIELDS_IMMUTABLE';
    END IF;
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