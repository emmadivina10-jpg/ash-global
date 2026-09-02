-- ============ FREELANCE ============
CREATE TABLE public.freelancer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  headline text NOT NULL,
  bio text,
  skills text[] NOT NULL DEFAULT '{}',
  categories text[] NOT NULL DEFAULT '{}',
  city text,
  country text NOT NULL DEFAULT 'CM',
  hourly_rate integer,
  starting_price integer NOT NULL DEFAULT 0,
  availability text NOT NULL DEFAULT 'AVAILABLE' CHECK (availability IN ('AVAILABLE','BUSY','UNAVAILABLE')),
  years_experience integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  rating_avg numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  completed_projects integer NOT NULL DEFAULT 0,
  profile_views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelancer_profiles TO authenticated;
GRANT SELECT ON public.freelancer_profiles TO anon;
GRANT ALL ON public.freelancer_profiles TO service_role;
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "freelancers_public_read" ON public.freelancer_profiles FOR SELECT USING (is_published OR user_id = auth.uid());
CREATE POLICY "freelancers_insert_own" ON public.freelancer_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "freelancers_update_own" ON public.freelancer_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "freelancers_delete_own" ON public.freelancer_profiles FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER freelancer_profiles_touch BEFORE UPDATE ON public.freelancer_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX freelancer_profiles_city_idx ON public.freelancer_profiles (country, city) WHERE is_published;

CREATE TABLE public.freelance_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'OTHER',
  budget integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XAF',
  deadline_days integer NOT NULL DEFAULT 14,
  skills text[] NOT NULL DEFAULT '{}',
  location_type text NOT NULL DEFAULT 'REMOTE' CHECK (location_type IN ('REMOTE','ONSITE','HYBRID')),
  city text,
  country text NOT NULL DEFAULT 'CM',
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','AWARDED','IN_PROGRESS','COMPLETED','CANCELLED')),
  proposals_count integer NOT NULL DEFAULT 0,
  awarded_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_projects TO authenticated;
GRANT ALL ON public.freelance_projects TO service_role;
ALTER TABLE public.freelance_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_read" ON public.freelance_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert_own" ON public.freelance_projects FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "projects_update_own" ON public.freelance_projects FOR UPDATE TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "projects_delete_own" ON public.freelance_projects FOR DELETE TO authenticated USING (client_id = auth.uid() AND status = 'OPEN');
CREATE TRIGGER freelance_projects_touch BEFORE UPDATE ON public.freelance_projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX freelance_projects_status_idx ON public.freelance_projects (status, created_at DESC);

CREATE TABLE public.freelance_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.freelance_projects(id) ON DELETE CASCADE,
  freelancer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter text NOT NULL,
  amount integer NOT NULL,
  delivery_days integer NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','SHORTLISTED','ACCEPTED','DECLINED','WITHDRAWN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, freelancer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelance_proposals TO authenticated;
GRANT ALL ON public.freelance_proposals TO service_role;
ALTER TABLE public.freelance_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposals_read_participants" ON public.freelance_proposals FOR SELECT TO authenticated
  USING (freelancer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.freelance_projects p WHERE p.id = project_id AND p.client_id = auth.uid()));
CREATE POLICY "proposals_insert_own" ON public.freelance_proposals FOR INSERT TO authenticated WITH CHECK (freelancer_id = auth.uid());
CREATE POLICY "proposals_update_participants" ON public.freelance_proposals FOR UPDATE TO authenticated
  USING (freelancer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.freelance_projects p WHERE p.id = project_id AND p.client_id = auth.uid()))
  WITH CHECK (freelancer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.freelance_projects p WHERE p.id = project_id AND p.client_id = auth.uid()));
CREATE POLICY "proposals_delete_own" ON public.freelance_proposals FOR DELETE TO authenticated USING (freelancer_id = auth.uid());
CREATE TRIGGER freelance_proposals_touch BEFORE UPDATE ON public.freelance_proposals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.sync_proposal_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.freelance_projects p
     SET proposals_count = (SELECT count(*) FROM public.freelance_proposals fp WHERE fp.project_id = p.id)
   WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.sync_proposal_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_proposal_count() TO service_role;
CREATE TRIGGER freelance_proposals_count AFTER INSERT OR DELETE ON public.freelance_proposals
  FOR EACH ROW EXECUTE FUNCTION public.sync_proposal_count();

-- ============ DEALS ============
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.provider_profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'OTHER',
  image_path text,
  original_price integer NOT NULL,
  deal_price integer NOT NULL,
  city text,
  country text NOT NULL DEFAULT 'CM',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  claim_limit integer NOT NULL DEFAULT 100,
  claimed_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT SELECT ON public.deals TO anon;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deals_public_read" ON public.deals FOR SELECT USING ((is_active AND ends_at > now()) OR owner_id = auth.uid());
CREATE POLICY "deals_insert_own" ON public.deals FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "deals_update_own" ON public.deals FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "deals_delete_own" ON public.deals FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER deals_touch BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX deals_live_idx ON public.deals (country, city, ends_at DESC) WHERE is_active;

CREATE TABLE public.deal_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'CLAIMED' CHECK (status IN ('CLAIMED','REDEEMED','EXPIRED')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  UNIQUE (deal_id, user_id)
);
GRANT SELECT ON public.deal_claims TO authenticated;
GRANT ALL ON public.deal_claims TO service_role;
ALTER TABLE public.deal_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claims_read_own" ON public.deal_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.claim_deal(_deal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _deal public.deals;
  _code text;
  _existing public.deal_claims;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT * INTO _deal FROM public.deals WHERE id = _deal_id FOR UPDATE;
  IF _deal.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF NOT _deal.is_active OR _deal.ends_at <= now() THEN RETURN jsonb_build_object('ok', false, 'error', 'EXPIRED'); END IF;

  SELECT * INTO _existing FROM public.deal_claims WHERE deal_id = _deal_id AND user_id = _uid;
  IF _existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'code', _existing.code, 'already', true);
  END IF;

  IF _deal.claimed_count >= _deal.claim_limit THEN RETURN jsonb_build_object('ok', false, 'error', 'SOLD_OUT'); END IF;

  _code := 'ASH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.deal_claims (deal_id, user_id, code) VALUES (_deal_id, _uid, _code);
  UPDATE public.deals SET claimed_count = claimed_count + 1 WHERE id = _deal_id;

  PERFORM public.notify_user(_deal.owner_id, 'DEAL', 'Deal claimed', 'Someone just claimed "' || _deal.title || '".', jsonb_build_object('deal_id', _deal_id));
  RETURN jsonb_build_object('ok', true, 'code', _code, 'already', false);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_deal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_deal(uuid) TO authenticated, service_role;

-- ============ EVENTS ============
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'OTHER',
  cover_path text,
  venue text,
  city text,
  country text NOT NULL DEFAULT 'CM',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  is_free boolean NOT NULL DEFAULT true,
  ticket_price integer NOT NULL DEFAULT 0,
  ticket_capacity integer NOT NULL DEFAULT 100,
  tickets_sold integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_public_read" ON public.events FOR SELECT USING (is_published OR organizer_id = auth.uid());
CREATE POLICY "events_insert_own" ON public.events FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "events_update_own" ON public.events FOR UPDATE TO authenticated USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "events_delete_own" ON public.events FOR DELETE TO authenticated USING (organizer_id = auth.uid());
CREATE TRIGGER events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX events_upcoming_idx ON public.events (starts_at) WHERE is_published;

CREATE TABLE public.event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  amount integer NOT NULL DEFAULT 0,
  platform_fee integer NOT NULL DEFAULT 0,
  code text NOT NULL UNIQUE,
  payment_reference text UNIQUE,
  provider_transaction_id text,
  payment_provider text NOT NULL DEFAULT 'TCHOKOPAY',
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','PAID','FAILED','CANCELLED')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.event_tickets TO authenticated;
GRANT ALL ON public.event_tickets TO service_role;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_read_own" ON public.event_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()));
CREATE POLICY "tickets_insert_own" ON public.event_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.complete_event_ticket(_payment_reference text, _provider_transaction_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ticket public.event_tickets; _event public.events;
BEGIN
  SELECT * INTO _ticket FROM public.event_tickets WHERE payment_reference = _payment_reference FOR UPDATE;
  IF _ticket.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF _ticket.status = 'PAID' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;

  UPDATE public.event_tickets
     SET status = 'PAID', paid_at = now(), provider_transaction_id = COALESCE(_provider_transaction_id, provider_transaction_id)
   WHERE id = _ticket.id;
  UPDATE public.events SET tickets_sold = tickets_sold + _ticket.quantity WHERE id = _ticket.event_id
  RETURNING * INTO _event;

  PERFORM public.notify_user(_ticket.user_id, 'EVENT', 'Ticket confirmed', 'Your ticket for "' || _event.title || '" is confirmed. Code ' || _ticket.code || '.', jsonb_build_object('event_id', _event.id));
  PERFORM public.notify_user(_event.organizer_id, 'EVENT', 'Ticket sold', _ticket.quantity || ' ticket(s) sold for "' || _event.title || '".', jsonb_build_object('event_id', _event.id));
  RETURN jsonb_build_object('ok', true, 'already', false);
END;
$$;
REVOKE ALL ON FUNCTION public.complete_event_ticket(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_event_ticket(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.fail_event_ticket(_payment_reference text, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.event_tickets SET status = _status WHERE payment_reference = _payment_reference AND status <> 'PAID';
END;
$$;
REVOKE ALL ON FUNCTION public.fail_event_ticket(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_event_ticket(text, text) TO service_role;

-- ============ PROMOTIONS ============
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('PROVIDER','DEAL','EVENT','PROJECT','FREELANCER')),
  target_id uuid NOT NULL,
  headline text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('DAY_1','DAY_7','DAY_30')),
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  city text,
  category text,
  payment_reference text UNIQUE,
  provider_transaction_id text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','ACTIVE','EXPIRED','FAILED','CANCELLED')),
  starts_at timestamptz,
  ends_at timestamptz,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.promotions TO authenticated;
GRANT SELECT ON public.promotions TO anon;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions_public_read" ON public.promotions FOR SELECT
  USING ((status = 'ACTIVE' AND ends_at > now()) OR owner_id = auth.uid());
CREATE POLICY "promotions_insert_own" ON public.promotions FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND status = 'PENDING');
CREATE TRIGGER promotions_touch BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX promotions_active_idx ON public.promotions (status, ends_at DESC);

CREATE OR REPLACE FUNCTION public.complete_promotion(_payment_reference text, _provider_transaction_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _promo public.promotions; _days integer;
BEGIN
  SELECT * INTO _promo FROM public.promotions WHERE payment_reference = _payment_reference FOR UPDATE;
  IF _promo.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF _promo.status = 'ACTIVE' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;

  _days := CASE _promo.plan WHEN 'DAY_1' THEN 1 WHEN 'DAY_7' THEN 7 ELSE 30 END;
  UPDATE public.promotions
     SET status = 'ACTIVE', starts_at = now(), ends_at = now() + (_days || ' days')::interval,
         provider_transaction_id = COALESCE(_provider_transaction_id, provider_transaction_id)
   WHERE id = _promo.id;

  PERFORM public.notify_user(_promo.owner_id, 'PROMOTION', 'Promotion live', 'Your promotion "' || _promo.headline || '" is now live for ' || _days || ' day(s).', jsonb_build_object('promotion_id', _promo.id));
  RETURN jsonb_build_object('ok', true, 'already', false);
END;
$$;
REVOKE ALL ON FUNCTION public.complete_promotion(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_promotion(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.fail_promotion(_payment_reference text, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.promotions SET status = _status WHERE payment_reference = _payment_reference AND status <> 'ACTIVE';
END;
$$;
REVOKE ALL ON FUNCTION public.fail_promotion(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_promotion(text, text) TO service_role;