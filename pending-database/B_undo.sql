-- Undo B: restores the original wallet-commission trigger from the snapshot taken at install,
-- then removes everything B added. Run in one transaction. Release records are dropped, so
-- export stripe_booking_releases / stripe_charge_holds first if any rows exist.
DO $$ DECLARE d text; BEGIN
  SELECT definition INTO d FROM public.stripe_release_install_snapshot WHERE definition LIKE '%charge_platform_commission()%' LIMIT 1;
  IF d IS NULL THEN RAISE EXCEPTION 'SNAPSHOT_MISSING'; END IF;
  DROP TRIGGER IF EXISTS booking_local_wallet_commission ON public.bookings;
  EXECUTE d;
END $$;
DROP TRIGGER IF EXISTS queue_stripe_booking_release ON public.bookings;
DROP TRIGGER IF EXISTS guard_stripe_booking_release ON public.bookings;
DROP TRIGGER IF EXISTS guard_stripe_booking_evidence ON public.bookings;
DROP TRIGGER IF EXISTS guard_provider_stripe_mapping ON public.profiles;
DROP FUNCTION IF EXISTS public.retry_stripe_booking_release(uuid);
DROP FUNCTION IF EXISTS public.hold_stripe_booking_charge(text,text);
DROP FUNCTION IF EXISTS public.finish_stripe_booking_release(uuid,text,boolean);
DROP FUNCTION IF EXISTS public.claim_stripe_booking_release(uuid);
DROP FUNCTION IF EXISTS public.register_verified_stripe_booking(text,text,jsonb);
DROP FUNCTION IF EXISTS public.queue_stripe_booking_release();
DROP FUNCTION IF EXISTS public.guard_stripe_booking_release();
DROP FUNCTION IF EXISTS public.guard_stripe_booking_evidence();
DROP FUNCTION IF EXISTS public.guard_provider_stripe_mapping();
DROP TABLE IF EXISTS public.stripe_connected_payouts, public.stripe_charge_holds, public.stripe_booking_releases,
  public.stripe_webhook_inbox, public.stripe_marketplace_controls, public.stripe_release_install_snapshot;
