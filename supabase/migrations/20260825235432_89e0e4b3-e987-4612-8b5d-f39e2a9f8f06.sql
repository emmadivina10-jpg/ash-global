
-- 1) Storefront identity + verification on provider profiles ---------------
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS slot_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS booking_lead_hours integer NOT NULL DEFAULT 2;

DO $$ BEGIN
  ALTER TABLE public.provider_profiles
    ADD CONSTRAINT provider_verification_status_chk
    CHECK (verification_status IN ('NONE','PENDING','VERIFIED','REJECTED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS provider_profiles_slug_key ON public.provider_profiles (slug);

CREATE OR REPLACE FUNCTION public.slugify(_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT nullif(trim(both '-' from regexp_replace(lower(coalesce(_value,'')), '[^a-z0-9]+', '-', 'g')), '')
$$;

CREATE OR REPLACE FUNCTION public.assign_provider_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base text; candidate text; n int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := coalesce(public.slugify(NEW.business_name), 'ash-pro');
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.slug = candidate AND p.id <> NEW.id) LOOP
      n := n + 1;
      candidate := base || '-' || n::text;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS assign_provider_slug_trg ON public.provider_profiles;
CREATE TRIGGER assign_provider_slug_trg
BEFORE INSERT OR UPDATE OF business_name, slug ON public.provider_profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_provider_slug();

UPDATE public.provider_profiles SET slug = NULL WHERE slug IS NULL;
UPDATE public.provider_profiles p SET business_name = p.business_name WHERE p.slug IS NULL;

-- Providers may never self-verify: only admins/service role move the badge.
CREATE OR REPLACE FUNCTION public.enforce_provider_live()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE privileged boolean := (auth.role() = 'service_role') OR public.has_role(auth.uid(), 'admin');
BEGIN
  NEW.billing_mode := 'COMMISSION';
  NEW.is_live := coalesce(nullif(btrim(NEW.business_name), ''), NULL) IS NOT NULL;
  NEW.slot_minutes := greatest(15, least(240, coalesce(NEW.slot_minutes, 30)));
  NEW.booking_lead_hours := greatest(0, least(168, coalesce(NEW.booking_lead_hours, 2)));

  IF TG_OP = 'INSERT' THEN
    IF NOT privileged THEN
      NEW.is_verified := false;
      NEW.verification_status := 'NONE';
      NEW.verified_at := NULL;
    END IF;
  ELSE
    IF NOT privileged THEN
      NEW.is_verified := OLD.is_verified;
      NEW.verified_at := OLD.verified_at;
      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
        IF NEW.verification_status = 'PENDING' AND OLD.verification_status IN ('NONE','REJECTED') THEN
          NEW.verification_requested_at := now();
        ELSE
          NEW.verification_status := OLD.verification_status;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Admin decision helper
CREATE OR REPLACE FUNCTION public.console_set_verification(_provider_id uuid, _approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.provider_profiles
     SET verification_status = CASE WHEN _approve THEN 'VERIFIED' ELSE 'REJECTED' END,
         is_verified = _approve,
         verified_at = CASE WHEN _approve THEN now() ELSE NULL END
   WHERE id = _provider_id;
  RETURN jsonb_build_object('ok', found);
END $$;
REVOKE ALL ON FUNCTION public.console_set_verification(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.console_set_verification(uuid, boolean) TO service_role;

-- 2) Weekly availability ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minute integer NOT NULL CHECK (start_minute >= 0 AND start_minute < 1440),
  end_minute integer NOT NULL CHECK (end_minute > 0 AND end_minute <= 1440),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_minute > start_minute),
  UNIQUE (provider_id, weekday, start_minute)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_availability TO authenticated;
GRANT SELECT ON public.provider_availability TO anon;
GRANT ALL ON public.provider_availability TO service_role;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Availability readable for live providers" ON public.provider_availability;
CREATE POLICY "Availability readable for live providers" ON public.provider_availability
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = provider_id AND (p.is_live OR p.user_id = auth.uid())));

DROP POLICY IF EXISTS "Providers manage own availability" ON public.provider_availability;
CREATE POLICY "Providers manage own availability" ON public.provider_availability
FOR ALL TO authenticated
USING (public.is_provider_owner(provider_id))
WITH CHECK (public.is_provider_owner(provider_id));

-- 3) Public storefront reads ----------------------------------------------
DROP POLICY IF EXISTS "Public can view live storefronts" ON public.provider_profiles;
CREATE POLICY "Public can view live storefronts" ON public.provider_profiles
FOR SELECT TO anon USING (is_live = true);

DROP POLICY IF EXISTS "Public can view active services" ON public.provider_services;
CREATE POLICY "Public can view active services" ON public.provider_services
FOR SELECT TO anon
USING (is_active = true AND EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = provider_id AND p.is_live));

DROP POLICY IF EXISTS "Public can view portfolio of live providers" ON public.portfolio_items;
CREATE POLICY "Public can view portfolio of live providers" ON public.portfolio_items
FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = provider_id AND p.is_live));

DROP POLICY IF EXISTS "Public can view reviews of live providers" ON public.reviews;
CREATE POLICY "Public can view reviews of live providers" ON public.reviews
FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = provider_id AND p.is_live));

GRANT SELECT ON public.provider_profiles TO anon;
GRANT SELECT ON public.provider_services TO anon;
GRANT SELECT ON public.portfolio_items TO anon;
GRANT SELECT ON public.reviews TO anon;

DROP POLICY IF EXISTS "Public portfolio images for live providers" ON storage.objects;
CREATE POLICY "Public portfolio images for live providers" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'portfolio' AND EXISTS (
  SELECT 1 FROM public.portfolio_items pi
  JOIN public.provider_profiles p ON p.id = pi.provider_id
  WHERE pi.image_path = storage.objects.name AND p.is_live
));

-- 4) Bookable slots --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provider_slots(_provider_id uuid, _date date, _duration integer DEFAULT 60)
RETURNS timestamptz[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prov RECORD;
  win RECORD;
  cursor_min integer;
  step integer;
  slot_ts timestamptz;
  out_slots timestamptz[] := '{}';
  dur integer := greatest(15, least(480, coalesce(_duration, 60)));
BEGIN
  SELECT id, is_live, accepting_bookings, slot_minutes, booking_lead_hours INTO prov
    FROM public.provider_profiles WHERE id = _provider_id;
  IF prov.id IS NULL OR NOT prov.is_live OR NOT prov.accepting_bookings THEN RETURN out_slots; END IF;
  step := greatest(15, coalesce(prov.slot_minutes, 30));

  FOR win IN
    SELECT start_minute, end_minute FROM public.provider_availability
     WHERE provider_id = _provider_id AND weekday = extract(dow from _date)::int
     ORDER BY start_minute
  LOOP
    cursor_min := win.start_minute;
    WHILE cursor_min + dur <= win.end_minute LOOP
      slot_ts := (_date::timestamp + make_interval(mins => cursor_min)) AT TIME ZONE 'Africa/Douala';
      IF slot_ts > now() + make_interval(hours => coalesce(prov.booking_lead_hours, 2))
         AND NOT EXISTS (
            SELECT 1 FROM public.bookings b
             WHERE b.provider_id = _provider_id
               AND b.status::text NOT IN ('CANCELLED','DECLINED','EXPIRED','PAYMENT_FAILED')
               AND b.scheduled_at < slot_ts + make_interval(mins => dur)
               AND b.scheduled_at + make_interval(mins => dur) > slot_ts)
      THEN
        out_slots := out_slots || slot_ts;
      END IF;
      cursor_min := cursor_min + step;
    END LOOP;
  END LOOP;

  RETURN out_slots;
END $$;
REVOKE ALL ON FUNCTION public.provider_slots(uuid, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_slots(uuid, date, integer) TO anon, authenticated, service_role;

-- 5) Payment links ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.provider_services(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XAF',
  is_active boolean NOT NULL DEFAULT true,
  paid_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_links TO authenticated;
GRANT SELECT ON public.payment_links TO anon;
GRANT ALL ON public.payment_links TO service_role;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active payment links are public" ON public.payment_links;
CREATE POLICY "Active payment links are public" ON public.payment_links
FOR SELECT TO anon, authenticated
USING (is_active = true OR public.is_provider_owner(provider_id));

DROP POLICY IF EXISTS "Providers manage own payment links" ON public.payment_links;
CREATE POLICY "Providers manage own payment links" ON public.payment_links
FOR ALL TO authenticated
USING (public.is_provider_owner(provider_id))
WITH CHECK (public.is_provider_owner(provider_id));

CREATE TABLE IF NOT EXISTS public.payment_link_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  amount integer NOT NULL,
  platform_fee integer NOT NULL DEFAULT 0,
  provider_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING',
  payer_name text,
  payer_phone text,
  provider_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_link_charges TO authenticated;
GRANT ALL ON public.payment_link_charges TO service_role;
ALTER TABLE public.payment_link_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers view own link charges" ON public.payment_link_charges;
CREATE POLICY "Providers view own link charges" ON public.payment_link_charges
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.payment_links l WHERE l.id = link_id AND public.is_provider_owner(l.provider_id)));

CREATE OR REPLACE FUNCTION public.complete_link_payment(_payment_reference text, _provider_transaction_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c RECORD; l RECORD; fee integer; net integer;
BEGIN
  SELECT * INTO c FROM public.payment_link_charges WHERE reference = _payment_reference FOR UPDATE;
  IF c.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'CHARGE_NOT_FOUND'); END IF;
  IF c.status = 'PAID' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;

  SELECT * INTO l FROM public.payment_links WHERE id = c.link_id;
  fee := round(c.amount * 0.01);
  net := c.amount - fee;

  UPDATE public.payment_link_charges
     SET status = 'PAID', paid_at = now(), platform_fee = fee, provider_amount = net,
         provider_transaction_id = coalesce(_provider_transaction_id, provider_transaction_id)
   WHERE id = c.id;
  UPDATE public.payment_links SET paid_count = paid_count + 1, updated_at = now() WHERE id = l.id;

  PERFORM public.notify_user((SELECT user_id FROM public.provider_profiles WHERE id = l.provider_id),
    'PAYMENT', 'Payment received',
    coalesce(c.payer_name, 'A customer') || ' paid ' || c.amount::text || ' XAF for "' || l.title || '".',
    jsonb_build_object('link_id', l.id, 'reference', _payment_reference, 'amount', c.amount, 'net', net));

  RETURN jsonb_build_object('ok', true, 'amount', c.amount, 'provider_amount', net);
END $$;
REVOKE ALL ON FUNCTION public.complete_link_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_link_payment(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.fail_link_payment(_payment_reference text, _status text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.payment_link_charges SET status = _status
   WHERE reference = _payment_reference AND status <> 'PAID';
$$;
REVOKE ALL ON FUNCTION public.fail_link_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_link_payment(text, text) TO service_role;
