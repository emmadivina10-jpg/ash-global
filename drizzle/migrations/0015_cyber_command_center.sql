ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
UPDATE public.staff_accounts SET password_changed_at = COALESCE(updated_at, created_at) WHERE password_changed_at IS NULL;
ALTER TABLE public.staff_accounts ALTER COLUMN password_changed_at SET DEFAULT now();

CREATE TABLE public.security_restrictions (
  user_id uuid PRIMARY KEY,
  watch boolean NOT NULL DEFAULT false,
  no_posting boolean NOT NULL DEFAULT false,
  no_commerce boolean NOT NULL DEFAULT false,
  wallet_frozen boolean NOT NULL DEFAULT false,
  no_transactions boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  reason text,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_restrictions TO service_role;
ALTER TABLE public.security_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all security_restrictions" ON public.security_restrictions FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.security_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_staff_id uuid,
  actor_name text NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  target_ref text,
  before_state jsonb,
  after_state jsonb,
  reason text,
  reverted_at timestamptz,
  reverted_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX security_actions_created_idx ON public.security_actions (created_at DESC);
GRANT ALL ON public.security_actions TO service_role;
ALTER TABLE public.security_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all security_actions" ON public.security_actions FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.ip_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('IP','CIDR','FINGERPRINT')),
  value text NOT NULL,
  reason text,
  expires_at timestamptz,
  created_by text NOT NULL,
  lifted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ip_blocks TO service_role;
ALTER TABLE public.ip_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all ip_blocks" ON public.ip_blocks FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.access_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip text NOT NULL,
  fingerprint text NOT NULL,
  user_agent text,
  country text,
  hits integer NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ip, fingerprint)
);
CREATE INDEX access_fingerprints_seen_idx ON public.access_fingerprints (last_seen DESC);
GRANT ALL ON public.access_fingerprints TO service_role;
ALTER TABLE public.access_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all access_fingerprints" ON public.access_fingerprints FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.security_daily_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_date date NOT NULL UNIQUE,
  summary text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by text
);
GRANT ALL ON public.security_daily_reviews TO service_role;
ALTER TABLE public.security_daily_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all security_daily_reviews" ON public.security_daily_reviews FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.security_bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO','WARN','CRITICAL')),
  audience text NOT NULL CHECK (audience IN ('ALL_MEMBERS','MEMBERS','STAFF')),
  target_user_ids uuid[] NOT NULL DEFAULT '{}',
  target_departments text[] NOT NULL DEFAULT '{}',
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT ON public.security_bulletins TO authenticated;
GRANT ALL ON public.security_bulletins TO service_role;
ALTER TABLE public.security_bulletins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read their security bulletins" ON public.security_bulletins FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (audience = 'ALL_MEMBERS' OR (audience = 'MEMBERS' AND auth.uid() = ANY (target_user_ids))));

CREATE TABLE public.security_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  lessons jsonb NOT NULL DEFAULT '[]'::jsonb,
  quiz jsonb NOT NULL DEFAULT '[]'::jsonb,
  pass_mark integer NOT NULL DEFAULT 70,
  active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_trainings TO service_role;
ALTER TABLE public.security_trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all security_trainings" ON public.security_trainings FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.security_training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.security_trainings(id),
  staff_id uuid NOT NULL,
  score integer NOT NULL,
  passed boolean NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_training_completions TO service_role;
ALTER TABLE public.security_training_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all security_training_completions" ON public.security_training_completions FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.is_protected_account(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin');
$$;
REVOKE EXECUTE ON FUNCTION public.is_protected_account(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.enforce_security_restriction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid;
  _kind text := TG_ARGV[1];
  r public.security_restrictions;
BEGIN
  EXECUTE format('SELECT ($1).%I', TG_ARGV[0]) INTO _uid USING NEW;
  IF _uid IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO r FROM public.security_restrictions WHERE user_id = _uid;
  IF NOT FOUND OR public.is_protected_account(_uid) THEN RETURN NEW; END IF;
  IF r.locked
     OR (_kind = 'POSTING' AND r.no_posting)
     OR (_kind = 'COMMERCE' AND (r.no_commerce OR r.no_transactions))
     OR (_kind = 'MONEY' AND (r.wallet_frozen OR r.no_transactions)) THEN
    RAISE EXCEPTION 'SECURITY_RESTRICTED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER sec_restrict_social_posts BEFORE INSERT ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('author_id','POSTING');
CREATE TRIGGER sec_restrict_post_comments BEFORE INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('author_id','POSTING');
CREATE TRIGGER sec_restrict_messages BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('sender_id','POSTING');
CREATE TRIGGER sec_restrict_stories BEFORE INSERT ON public.stories FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('author_id','POSTING');
CREATE TRIGGER sec_restrict_spotlight BEFORE INSERT ON public.spotlight_posts FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('author_id','POSTING');
CREATE TRIGGER sec_restrict_forum BEFORE INSERT ON public.forum_posts FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('author_id','POSTING');
CREATE TRIGGER sec_restrict_market_posts BEFORE INSERT ON public.market_posts FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('author_id','COMMERCE');
CREATE TRIGGER sec_restrict_property BEFORE INSERT ON public.property_listings FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('owner_id','COMMERCE');
CREATE TRIGGER sec_restrict_payment_links BEFORE INSERT ON public.payment_links FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('provider_id','COMMERCE');
CREATE TRIGGER sec_restrict_bookings BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('client_id','COMMERCE');
CREATE TRIGGER sec_restrict_event_tickets BEFORE INSERT ON public.event_tickets FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('user_id','COMMERCE');
CREATE TRIGGER sec_restrict_withdrawals BEFORE INSERT ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.enforce_security_restriction('user_id','MONEY');