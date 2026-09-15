-- 1. verifications ---------------------------------------------------------
CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text NOT NULL CHECK (tier IN ('INDIVIDUAL','BUSINESS','BUSINESS_PLUS')),
  status text NOT NULL DEFAULT 'PENDING',
  amount integer NOT NULL DEFAULT 0,
  payment_reference text UNIQUE,
  provider_transaction_id text,
  started_at timestamptz,
  expires_at timestamptz,
  granted_by text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.verifications TO authenticated;
GRANT ALL ON public.verifications TO service_role;

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own verifications"
  ON public.verifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX verifications_user_idx ON public.verifications (user_id, created_at DESC);

CREATE TRIGGER verifications_touch
  BEFORE UPDATE ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. impersonation attempts -------------------------------------------------
CREATE TABLE public.impersonation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  protected_user_id uuid,
  kind text NOT NULL,
  attempted_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.impersonation_attempts TO service_role;

ALTER TABLE public.impersonation_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read impersonation attempts"
  ON public.impersonation_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. profile + post columns -------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_tier text,
  ADD COLUMN IF NOT EXISTS verified_until timestamptz;

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS allow_reuse boolean NOT NULL DEFAULT false;

-- members must not set their own badge
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('role', true) = 'authenticated' OR auth.uid() IS NOT NULL THEN
    NEW.referral_code := OLD.referral_code;
    NEW.referred_by := OLD.referred_by;
    NEW.account_status := OLD.account_status;
    NEW.email := OLD.email;
    NEW.user_id := OLD.user_id;
    NEW.stripe_account_id := OLD.stripe_account_id;
    NEW.stripe_payouts_enabled := OLD.stripe_payouts_enabled;
    NEW.stripe_details_submitted := OLD.stripe_details_submitted;
    NEW.verified_tier := OLD.verified_tier;
    NEW.verified_until := OLD.verified_until;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- 4. helper -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.verified_tier IS NOT NULL
      AND coalesce(p.verified_until, now()) > now()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_verified(uuid) FROM anon;

-- 5. impersonation guard ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_verified_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  IF NEW.full_name IS NOT NULL AND btrim(NEW.full_name) <> ''
     AND (TG_OP = 'INSERT' OR coalesce(OLD.full_name,'') IS DISTINCT FROM NEW.full_name) THEN
    SELECT p.user_id INTO v_owner
    FROM public.profiles p
    WHERE p.user_id <> NEW.user_id
      AND lower(btrim(p.full_name)) = lower(btrim(NEW.full_name))
      AND p.verified_tier IS NOT NULL
      AND coalesce(p.verified_until, now()) > now()
    LIMIT 1;

    IF v_owner IS NOT NULL THEN
      INSERT INTO public.impersonation_attempts (actor_id, protected_user_id, kind, attempted_value)
      VALUES (NEW.user_id, v_owner, 'NAME', left(NEW.full_name, 120));
      RAISE EXCEPTION 'NAME_PROTECTED_BY_VERIFIED_ACCOUNT';
    END IF;
  END IF;

  IF NEW.avatar_url IS NOT NULL AND btrim(NEW.avatar_url) <> ''
     AND (TG_OP = 'INSERT' OR coalesce(OLD.avatar_url,'') IS DISTINCT FROM NEW.avatar_url) THEN
    SELECT p.user_id INTO v_owner
    FROM public.profiles p
    WHERE p.user_id <> NEW.user_id
      AND p.avatar_url = NEW.avatar_url
      AND p.verified_tier IS NOT NULL
      AND coalesce(p.verified_until, now()) > now()
    LIMIT 1;

    IF v_owner IS NOT NULL THEN
      INSERT INTO public.impersonation_attempts (actor_id, protected_user_id, kind, attempted_value)
      VALUES (NEW.user_id, v_owner, 'PHOTO', left(NEW.avatar_url, 200));
      RAISE EXCEPTION 'PHOTO_PROTECTED_BY_VERIFIED_ACCOUNT';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER guard_verified_identity_trg
  BEFORE INSERT OR UPDATE OF full_name, avatar_url ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_verified_identity();

-- 6. repost protection ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_verified_repost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_author uuid;
  v_allow boolean;
BEGIN
  SELECT sp.author_id, sp.allow_reuse INTO v_author, v_allow
  FROM public.social_posts sp WHERE sp.id = NEW.post_id;

  IF v_author IS NOT NULL
     AND v_author <> NEW.user_id
     AND coalesce(v_allow, false) = false
     AND public.is_verified(v_author) THEN
    RAISE EXCEPTION 'CONTENT_PROTECTED_BY_VERIFIED_ACCOUNT';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER guard_verified_repost_trg
  BEFORE INSERT ON public.post_reposts
  FOR EACH ROW EXECUTE FUNCTION public.guard_verified_repost();

-- 7. automatic activation on paid webhook -----------------------------------
CREATE OR REPLACE FUNCTION public.complete_verification(_payment_reference text, _provider_transaction_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.verifications%ROWTYPE;
  v_from timestamptz;
  v_until timestamptz;
BEGIN
  SELECT * INTO v_row FROM public.verifications WHERE payment_reference = _payment_reference FOR UPDATE;
  IF v_row.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF v_row.status = 'PAID' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;

  SELECT greatest(coalesce(p.verified_until, now()), now()) INTO v_from
  FROM public.profiles p WHERE p.user_id = v_row.user_id;
  v_from := coalesce(v_from, now());
  v_until := v_from + interval '30 days';

  UPDATE public.verifications
     SET status = 'PAID',
         provider_transaction_id = coalesce(_provider_transaction_id, provider_transaction_id),
         started_at = now(),
         expires_at = v_until,
         updated_at = now()
   WHERE id = v_row.id;

  UPDATE public.profiles
     SET verified_tier = v_row.tier,
         verified_until = v_until
   WHERE user_id = v_row.user_id;

  PERFORM public.notify_user(
    v_row.user_id,
    'ACCOUNT',
    'You are ASH Verified',
    'Your blue badge is active until ' || to_char(v_until, 'DD Mon YYYY') || '.',
    jsonb_build_object('tier', v_row.tier)
  );

  RETURN jsonb_build_object('ok', true, 'tier', v_row.tier, 'expires_at', v_until);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.complete_verification(text, text) FROM anon, authenticated, PUBLIC;

-- 8. admin grant / revoke ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.console_set_verification(_user_id uuid, _tier text, _days integer DEFAULT 30, _note text DEFAULT NULL, _actor text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_until timestamptz;
BEGIN
  IF _tier IS NULL THEN
    UPDATE public.profiles SET verified_tier = NULL, verified_until = NULL WHERE user_id = _user_id;
    INSERT INTO public.verifications (user_id, tier, status, amount, granted_by, note, started_at, expires_at)
    VALUES (_user_id, 'INDIVIDUAL', 'REVOKED', 0, _actor, _note, now(), now());
    RETURN jsonb_build_object('ok', true, 'tier', null);
  END IF;

  IF _tier NOT IN ('INDIVIDUAL','BUSINESS','BUSINESS_PLUS') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_TIER');
  END IF;

  v_until := now() + make_interval(days => greatest(coalesce(_days, 30), 1));

  UPDATE public.profiles SET verified_tier = _tier, verified_until = v_until WHERE user_id = _user_id;

  INSERT INTO public.verifications (user_id, tier, status, amount, granted_by, note, started_at, expires_at)
  VALUES (_user_id, _tier, 'GRANTED', 0, _actor, _note, now(), v_until);

  PERFORM public.notify_user(_user_id, 'ACCOUNT', 'You are ASH Verified',
    'Your blue badge is active until ' || to_char(v_until, 'DD Mon YYYY') || '.',
    jsonb_build_object('tier', _tier));

  RETURN jsonb_build_object('ok', true, 'tier', _tier, 'expires_at', v_until);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.console_set_verification(uuid, text, integer, text, text) FROM anon, authenticated, PUBLIC;