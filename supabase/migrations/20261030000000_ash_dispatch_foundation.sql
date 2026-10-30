-- ASH Dispatch foundation
-- Local PostgreSQL/Supabase-compatible schema for rider registration, vendor dispatch, delivery lifecycle and pickup verification.

CREATE TABLE IF NOT EXISTS public.dispatch_riders (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  availability_status text NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE','BUSY','OFFLINE')),
  vehicle_type text NOT NULL DEFAULT 'MOTORCYCLE' CHECK (vehicle_type IN ('MOTORCYCLE','CAR','BICYCLE','WALKING')),
  licence_number text,
  phone text,
  city text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dispatch_riders_vendor_idx ON public.dispatch_riders(vendor_id, availability_status);

CREATE TABLE IF NOT EXISTS public.dispatch_vendor_riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rider_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED','ACCEPTED','REJECTED','SUSPENDED')),
  invited_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, rider_user_id)
);

CREATE INDEX IF NOT EXISTS dispatch_vendor_riders_vendor_idx ON public.dispatch_vendor_riders(vendor_id, status);
CREATE INDEX IF NOT EXISTS dispatch_vendor_riders_rider_idx ON public.dispatch_vendor_riders(rider_user_id, status);

CREATE TABLE IF NOT EXISTS public.dispatch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  rider_user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (
    status IN (
      'REQUESTED',
      'INVITED',
      'ASSIGNED',
      'ACCEPTED',
      'REJECTED',
      'PICKUP_CONFIRMED',
      'IN_TRANSIT',
      'DELIVERED',
      'CANCELLED'
    )
  ),
  pickup_address text NOT NULL,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_address text NOT NULL,
  dropoff_lat double precision,
  dropoff_lng double precision,
  service_type text NOT NULL DEFAULT 'DELIVERY' CHECK (service_type IN ('DELIVERY','PICKUP_VERIFICATION','SELF_PICKUP')),
  notes text,
  customer_phone text,
  eta_minutes integer,
  fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dispatch_jobs_vendor_idx ON public.dispatch_jobs(vendor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS dispatch_jobs_rider_idx ON public.dispatch_jobs(rider_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS dispatch_jobs_customer_idx ON public.dispatch_jobs(customer_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dispatch_job_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.dispatch_jobs(id) ON DELETE CASCADE,
  rider_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACCEPTED','REJECTED','IN_PROGRESS','COMPLETED','CANCELLED')),
  assigned_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (delivery_id, rider_user_id)
);

CREATE INDEX IF NOT EXISTS dispatch_job_assignments_delivery_idx ON public.dispatch_job_assignments(delivery_id, status);
CREATE INDEX IF NOT EXISTS dispatch_job_assignments_rider_idx ON public.dispatch_job_assignments(rider_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dispatch_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.dispatch_jobs(id) ON DELETE CASCADE,
  status text NOT NULL,
  actor_type text NOT NULL DEFAULT 'SYSTEM' CHECK (actor_type IN ('SYSTEM','VENDOR','RIDER','CUSTOMER','ADMIN')),
  actor_user_id uuid REFERENCES auth.users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dispatch_job_events_delivery_idx ON public.dispatch_job_events(delivery_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dispatch_pickup_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.dispatch_jobs(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (delivery_id)
);

CREATE INDEX IF NOT EXISTS dispatch_pickup_verifications_delivery_idx ON public.dispatch_pickup_verifications(delivery_id, is_verified);

CREATE OR REPLACE FUNCTION public.dispatch_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER dispatch_riders_updated_at
BEFORE UPDATE ON public.dispatch_riders
FOR EACH ROW EXECUTE FUNCTION public.dispatch_set_updated_at();

CREATE TRIGGER dispatch_vendor_riders_updated_at
BEFORE UPDATE ON public.dispatch_vendor_riders
FOR EACH ROW EXECUTE FUNCTION public.dispatch_set_updated_at();

CREATE TRIGGER dispatch_jobs_updated_at
BEFORE UPDATE ON public.dispatch_jobs
FOR EACH ROW EXECUTE FUNCTION public.dispatch_set_updated_at();

CREATE TRIGGER dispatch_job_assignments_updated_at
BEFORE UPDATE ON public.dispatch_job_assignments
FOR EACH ROW EXECUTE FUNCTION public.dispatch_set_updated_at();

ALTER TABLE public.dispatch_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_vendor_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_pickup_verifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_riders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_vendor_riders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_job_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_job_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_pickup_verifications TO authenticated;

GRANT ALL ON public.dispatch_riders TO service_role;
GRANT ALL ON public.dispatch_vendor_riders TO service_role;
GRANT ALL ON public.dispatch_jobs TO service_role;
GRANT ALL ON public.dispatch_job_assignments TO service_role;
GRANT ALL ON public.dispatch_job_events TO service_role;
GRANT ALL ON public.dispatch_pickup_verifications TO service_role;
