ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moderation_banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_ban_reason text,
  ADD COLUMN IF NOT EXISTS moderation_previous_status text;

CREATE TABLE public.moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_type text NOT NULL,
  original_name text,
  media_type text NOT NULL,
  media_hash text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('EXPLICIT', 'UNCERTAIN')),
  confidence numeric(5,4),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'UPHELD', 'CLEARED')),
  reviewed_by text,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.moderation_cases TO service_role;
ALTER TABLE public.moderation_cases ENABLE ROW LEVEL SECURITY;

CREATE INDEX moderation_cases_queue_idx
  ON public.moderation_cases (status, created_at DESC);
CREATE INDEX moderation_cases_user_idx
  ON public.moderation_cases (user_id, created_at DESC);
CREATE UNIQUE INDEX moderation_cases_active_media_idx
  ON public.moderation_cases (user_id, media_hash)
  WHERE status = 'PENDING_REVIEW';

CREATE TRIGGER moderation_cases_touch
  BEFORE UPDATE ON public.moderation_cases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.account_status := OLD.account_status;
    NEW.referred_by := OLD.referred_by;
    NEW.referral_code := OLD.referral_code;
    NEW.stripe_account_id := OLD.stripe_account_id;
    NEW.stripe_payouts_enabled := OLD.stripe_payouts_enabled;
    NEW.verified_tier := OLD.verified_tier;
    NEW.verified_until := OLD.verified_until;
    NEW.moderation_banned_at := OLD.moderation_banned_at;
    NEW.moderation_ban_reason := OLD.moderation_ban_reason;
    NEW.moderation_previous_status := OLD.moderation_previous_status;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_profile_columns() TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_not_moderation_banned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND moderation_banned_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_UNDER_SAFETY_REVIEW';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_not_moderation_banned() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_not_moderation_banned() TO service_role;

DROP TRIGGER IF EXISTS enforce_not_moderation_banned ON public.social_posts;
CREATE TRIGGER enforce_not_moderation_banned BEFORE INSERT ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.enforce_not_moderation_banned();
DROP TRIGGER IF EXISTS enforce_not_moderation_banned ON public.stories;
CREATE TRIGGER enforce_not_moderation_banned BEFORE INSERT ON public.stories FOR EACH ROW EXECUTE FUNCTION public.enforce_not_moderation_banned();
DROP TRIGGER IF EXISTS enforce_not_moderation_banned ON public.spotlight_posts;
CREATE TRIGGER enforce_not_moderation_banned BEFORE INSERT ON public.spotlight_posts FOR EACH ROW EXECUTE FUNCTION public.enforce_not_moderation_banned();
DROP TRIGGER IF EXISTS enforce_not_moderation_banned ON public.forum_posts;
CREATE TRIGGER enforce_not_moderation_banned BEFORE INSERT ON public.forum_posts FOR EACH ROW EXECUTE FUNCTION public.enforce_not_moderation_banned();
DROP TRIGGER IF EXISTS enforce_not_moderation_banned ON public.articles;
CREATE TRIGGER enforce_not_moderation_banned BEFORE INSERT ON public.articles FOR EACH ROW EXECUTE FUNCTION public.enforce_not_moderation_banned();
DROP TRIGGER IF EXISTS enforce_not_moderation_banned ON public.portfolio_items;
CREATE TRIGGER enforce_not_moderation_banned BEFORE INSERT ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION public.enforce_not_moderation_banned();
DROP TRIGGER IF EXISTS enforce_not_moderation_banned ON public.property_listings;
CREATE TRIGGER enforce_not_moderation_banned BEFORE INSERT ON public.property_listings FOR EACH ROW EXECUTE FUNCTION public.enforce_not_moderation_banned();
DROP TRIGGER IF EXISTS enforce_not_moderation_banned ON public.property_images;
CREATE TRIGGER enforce_not_moderation_banned BEFORE INSERT ON public.property_images FOR EACH ROW EXECUTE FUNCTION public.enforce_not_moderation_banned();

CREATE OR REPLACE FUNCTION public.security_housekeeping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day';
  DELETE FROM public.security_events WHERE created_at < now() - interval '180 days';
  DELETE FROM public.story_views
   WHERE story_id IN (SELECT id FROM public.stories WHERE expires_at < now() - interval '7 days');
  DELETE FROM public.stories WHERE expires_at < now() - interval '7 days';
END;
$$;
REVOKE ALL ON FUNCTION public.security_housekeeping() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_housekeeping() TO service_role;