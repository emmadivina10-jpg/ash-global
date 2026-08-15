-- 1. Booking integrity ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_provider boolean;
  is_client boolean;
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF; -- service role / triggers
  IF public.has_role(uid, 'admin') THEN RETURN NEW; END IF;

  SELECT EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = OLD.provider_id AND p.user_id = uid)
    INTO is_provider;
  is_client := OLD.client_id = uid;

  -- Immutable commercial terms
  IF NEW.price IS DISTINCT FROM OLD.price
     OR NEW.service_id IS DISTINCT FROM OLD.service_id
     OR NEW.service_title IS DISTINCT FROM OLD.service_title
     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'BOOKING_TERMS_IMMUTABLE';
  END IF;

  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at AND OLD.status <> 'PENDING' THEN
    RAISE EXCEPTION 'BOOKING_SCHEDULE_LOCKED';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF is_client AND NOT is_provider THEN
      -- clients may only cancel a booking that has not started
      IF NOT (NEW.status = 'CANCELLED' AND OLD.status IN ('PENDING','CONFIRMED')) THEN
        RAISE EXCEPTION 'BOOKING_STATUS_FORBIDDEN';
      END IF;
    ELSIF is_provider THEN
      IF NOT (NEW.status::text = ANY (ARRAY['CONFIRMED','DECLINED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'])) THEN
        RAISE EXCEPTION 'BOOKING_STATUS_FORBIDDEN';
      END IF;
    ELSE
      RAISE EXCEPTION 'BOOKING_STATUS_FORBIDDEN';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_enforce_update ON public.bookings;
CREATE TRIGGER bookings_enforce_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_update();

-- 2. Portfolio storage visibility -------------------------------------------
DROP POLICY IF EXISTS "Signed-in users view portfolio images" ON storage.objects;
CREATE POLICY "Portfolio images follow provider visibility"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'portfolio'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.portfolio_items pi
      WHERE pi.image_path = storage.objects.name
        AND public.is_provider_visible(pi.provider_id)
    )
  )
);

-- 3. SECURITY DEFINER execution surface --------------------------------------
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

-- Helpers required by RLS policies and app features for signed-in users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider_visible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_network_tree() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_withdrawal(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.console_financials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_financials() TO authenticated;

-- Privileged, server-only routines
GRANT EXECUTE ON FUNCTION public.complete_activation(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_provider_subscription(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.console_settle_withdrawal(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO service_role;