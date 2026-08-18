ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS completed_bookings integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_provider_completed_bookings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.status::text = 'COMPLETED' AND OLD.status::text IS DISTINCT FROM 'COMPLETED' THEN
    UPDATE public.provider_profiles SET completed_bookings = completed_bookings + 1 WHERE id = NEW.provider_id;
  ELSIF OLD.status::text = 'COMPLETED' AND NEW.status::text IS DISTINCT FROM 'COMPLETED' THEN
    UPDATE public.provider_profiles SET completed_bookings = greatest(completed_bookings - 1, 0) WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS bookings_sync_completed_count ON public.bookings;
CREATE TRIGGER bookings_sync_completed_count
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_provider_completed_bookings();

UPDATE public.provider_profiles p
   SET completed_bookings = (SELECT count(*) FROM public.bookings b WHERE b.provider_id = p.id AND b.status::text = 'COMPLETED');

CREATE OR REPLACE FUNCTION public.get_provider_bookings()
RETURNS TABLE(
  id uuid, client_id uuid, provider_id uuid, service_id uuid, service_title text, price integer,
  scheduled_at timestamptz, notes text, address text, status text, decline_reason text,
  respond_by timestamptz, pay_by timestamptz, accepted_at timestamptz, paid_at timestamptz,
  completed_at timestamptz, invoice_number text, platform_fee integer, provider_amount integer,
  created_at timestamptz, client_name text, client_phone text, client_email text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT b.id, b.client_id, b.provider_id, b.service_id, b.service_title, b.price,
         b.scheduled_at, b.notes, b.address, b.status::text, b.decline_reason,
         b.respond_by, b.pay_by, b.accepted_at, b.paid_at, b.completed_at,
         b.invoice_number, b.platform_fee, b.provider_amount, b.created_at,
         coalesce(pr.full_name, 'ASH client') AS client_name,
         CASE WHEN b.status::text IN ('ACCEPTED','PAYMENT_PROCESSING','CONFIRMED','IN_PROGRESS','COMPLETED','SETTLED')
              THEN pr.phone ELSE NULL END AS client_phone,
         CASE WHEN b.status::text IN ('CONFIRMED','IN_PROGRESS','COMPLETED','SETTLED')
              THEN pr.email ELSE NULL END AS client_email
    FROM public.bookings b
    JOIN public.provider_profiles pp ON pp.id = b.provider_id
    LEFT JOIN public.profiles pr ON pr.user_id = b.client_id
   WHERE auth.uid() IS NOT NULL AND pp.user_id = auth.uid()
   ORDER BY b.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_provider_bookings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_provider_bookings() TO authenticated, service_role;