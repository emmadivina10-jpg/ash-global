ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clean_worker';

CREATE TABLE public.clean_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  price_per_kg numeric NOT NULL DEFAULT 1500,
  facility_address text NOT NULL DEFAULT 'Molyko, Buea',
  facility_lat double precision NOT NULL DEFAULT 4.1537,
  facility_lng double precision NOT NULL DEFAULT 9.2920,
  facility_phone text,
  facility_hours text NOT NULL DEFAULT 'Mon–Sat, 8:00–18:00',
  staff_radius_km numeric NOT NULL DEFAULT 3,
  max_staff_km numeric NOT NULL DEFAULT 3,
  min_rider_fee numeric NOT NULL DEFAULT 1000,
  base_pickup_fee numeric NOT NULL DEFAULT 0,
  base_delivery_fee numeric NOT NULL DEFAULT 0,
  far_fee_per_km numeric NOT NULL DEFAULT 200,
  staff_pickup_enabled boolean NOT NULL DEFAULT true,
  staff_delivery_enabled boolean NOT NULL DEFAULT true,
  rider_enabled boolean NOT NULL DEFAULT true,
  cash_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.clean_settings (id) VALUES (1);

CREATE TABLE public.clean_distance_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_km numeric NOT NULL,
  max_km numeric,
  fee numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.clean_distance_bands (min_km, max_km, fee) VALUES
 (3,5,1000),(5,8,1500),(8,12,2000);

CREATE TABLE public.clean_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'SERVICE' CHECK (kind IN ('SERVICE','SPECIAL')),
  name_en text NOT NULL,
  name_fr text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.clean_services (code, kind, name_en, name_fr, price, sort) VALUES
 ('WASH','SERVICE','Washing','Lavage',0,1),
 ('DRY','SERVICE','Drying','Séchage',0,2),
 ('FOLD','SERVICE','Folding','Pliage',0,3),
 ('IRON','SERVICE','Ironing','Repassage',0,4),
 ('SUIT','SPECIAL','Suit','Costume',2500,10),
 ('DUVET','SPECIAL','Duvet / blanket','Couette / couverture',3000,11),
 ('GOWN','SPECIAL','Wedding / evening gown','Robe de soirée / mariage',5000,12),
 ('SHOES','SPECIAL','Shoes (pair)','Chaussures (paire)',1500,13);

CREATE SEQUENCE public.clean_order_seq;

CREATE TABLE public.clean_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE DEFAULT ('AC-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.clean_order_seq')::text, 6, '0')),
  customer_id uuid NOT NULL,
  services text[] NOT NULL DEFAULT '{}',
  notes text,
  contact_phone text,
  pickup_address text NOT NULL,
  pickup_lat double precision NOT NULL,
  pickup_lng double precision NOT NULL,
  pickup_method text NOT NULL CHECK (pickup_method IN ('STAFF','RIDER')),
  pickup_distance_km numeric NOT NULL,
  pickup_distance_source text NOT NULL DEFAULT 'ROAD',
  pickup_fee numeric NOT NULL DEFAULT 0,
  pickup_eta_min int,
  delivery_address text NOT NULL,
  delivery_lat double precision NOT NULL,
  delivery_lng double precision NOT NULL,
  delivery_method text NOT NULL CHECK (delivery_method IN ('STAFF','RIDER')),
  delivery_distance_km numeric NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 0,
  delivery_eta_min int,
  status text NOT NULL DEFAULT 'BOOKED',
  weight_kg numeric,
  total numeric,
  current_quote_id uuid,
  payment_reference text UNIQUE,
  payment_status text NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PROCESSING','PAID','FAILED')),
  provider_transaction_id text,
  paid_at timestamptz,
  receipt_no text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clean_orders_customer_idx ON public.clean_orders(customer_id, created_at DESC);
CREATE INDEX clean_orders_status_idx ON public.clean_orders(status);

CREATE TABLE public.clean_price_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.clean_orders(id) ON DELETE CASCADE,
  weight_kg numeric NOT NULL,
  rate_per_kg numeric NOT NULL,
  laundry_amount numeric NOT NULL,
  special_items jsonb NOT NULL DEFAULT '[]',
  special_amount numeric NOT NULL DEFAULT 0,
  pickup_fee numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT','APPROVED','DECLINED','SUPERSEDED')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE public.clean_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.clean_orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clean_status_events_order_idx ON public.clean_status_events(order_id, created_at);

CREATE TABLE public.clean_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.clean_orders(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('PICKUP','DELIVERY')),
  method text NOT NULL CHECK (method IN ('STAFF','RIDER')),
  worker_id uuid,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACCEPTED','ON_THE_WAY','ARRIVED','DONE','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, direction)
);
CREATE INDEX clean_assignments_worker_idx ON public.clean_assignments(worker_id, status);

CREATE TABLE public.clean_locations (
  assignment_id uuid PRIMARY KEY REFERENCES public.clean_assignments(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.clean_orders(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.clean_settings, public.clean_distance_bands, public.clean_services TO authenticated;
GRANT SELECT ON public.clean_orders, public.clean_price_quotes, public.clean_status_events, public.clean_assignments, public.clean_locations TO authenticated;
GRANT ALL ON public.clean_settings, public.clean_distance_bands, public.clean_services, public.clean_orders, public.clean_price_quotes, public.clean_status_events, public.clean_assignments, public.clean_locations TO service_role;
GRANT USAGE ON SEQUENCE public.clean_order_seq TO service_role;

ALTER TABLE public.clean_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clean_distance_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clean_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clean_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clean_price_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clean_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clean_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clean_locations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_clean_worker_on(_order_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clean_assignments a WHERE a.order_id = _order_id AND a.worker_id = _uid)
$$;

CREATE POLICY "Members read clean settings" ON public.clean_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members read distance bands" ON public.clean_distance_bands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members read clean services" ON public.clean_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Customer or assigned worker reads order" ON public.clean_orders FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.is_clean_worker_on(id, auth.uid()));
CREATE POLICY "Customer reads own quotes" ON public.clean_price_quotes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clean_orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));
CREATE POLICY "Customer or worker reads events" ON public.clean_status_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clean_orders o WHERE o.id = order_id AND o.customer_id = auth.uid()) OR public.is_clean_worker_on(order_id, auth.uid()));
CREATE POLICY "Customer or worker reads assignments" ON public.clean_assignments FOR SELECT TO authenticated
  USING (worker_id = auth.uid() OR EXISTS (SELECT 1 FROM public.clean_orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));
CREATE POLICY "Customer or worker reads live location" ON public.clean_locations FOR SELECT TO authenticated
  USING (worker_id = auth.uid() OR EXISTS (SELECT 1 FROM public.clean_orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.clean_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER clean_orders_touch BEFORE UPDATE ON public.clean_orders FOR EACH ROW EXECUTE FUNCTION public.clean_touch();
CREATE TRIGGER clean_assignments_touch BEFORE UPDATE ON public.clean_assignments FOR EACH ROW EXECUTE FUNCTION public.clean_touch();

-- Idempotent payment confirmation shared by webhook, sync and reconcile.
CREATE OR REPLACE FUNCTION public.complete_clean_payment(_payment_reference text, _provider_transaction_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.clean_orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.clean_orders WHERE payment_reference = _payment_reference FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF o.payment_status = 'PAID' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  UPDATE public.clean_orders SET payment_status = 'PAID', paid_at = now(), status = 'APPROVED',
    provider_transaction_id = COALESCE(_provider_transaction_id, provider_transaction_id),
    receipt_no = COALESCE(receipt_no, 'RC-' || substr(order_no, 4))
  WHERE id = o.id;
  UPDATE public.clean_price_quotes SET status = 'APPROVED', decided_at = now() WHERE id = o.current_quote_id;
  INSERT INTO public.clean_status_events (order_id, status, note, actor) VALUES (o.id, 'APPROVED', 'Payment received', 'system');
  INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (o.customer_id, 'SYSTEM', 'ASH Clean payment received', 'Order ' || o.order_no || ' is paid. Washing starts now.', '/clean/orders/' || o.id);
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN undefined_column OR check_violation THEN
  RETURN jsonb_build_object('ok', true, 'note', 'notification skipped');
END; $$;

CREATE OR REPLACE FUNCTION public.fail_clean_payment(_payment_reference text, _status text DEFAULT 'FAILED')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.clean_orders SET payment_status = 'FAILED'
  WHERE payment_reference = _payment_reference AND payment_status <> 'PAID';
$$;

REVOKE EXECUTE ON FUNCTION public.complete_clean_payment(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_clean_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_clean_payment(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_clean_payment(text, text) TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.clean_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clean_orders;