
-- Reports
ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_target_type_check;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_target_type_check CHECK (target_type = ANY (ARRAY['PROVIDER','REVIEW','MESSAGE','USER','PORTFOLIO','PROPERTY','POST','SPOTLIGHT','COMMENT','STORY']));
ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS moderator_id uuid,
  ADD COLUMN IF NOT EXISTS action_taken text,
  ADD COLUMN IF NOT EXISTS resolution_reason text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.content_reports r
    WHERE r.reporter_id = NEW.reporter_id AND r.target_type = NEW.target_type
      AND r.target_id IS NOT DISTINCT FROM NEW.target_id
      AND r.target_user_id IS NOT DISTINCT FROM NEW.target_user_id
      AND r.status IN ('OPEN','REVIEWING')
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_REPORT';
  END IF;
  NEW.status := 'OPEN';
  NEW.moderator_id := NULL; NEW.action_taken := NULL; NEW.resolved_at := NULL; NEW.reviewed_at := NULL;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_prevent_duplicate_report ON public.content_reports;
CREATE TRIGGER trg_prevent_duplicate_report BEFORE INSERT ON public.content_reports
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_report();

-- Profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS moderation_suspended_until timestamptz;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
    NEW.moderation_suspended_until := OLD.moderation_suspended_until;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.is_author_restricted(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _uid
      AND (moderation_banned_at IS NOT NULL OR (moderation_suspended_until IS NOT NULL AND moderation_suspended_until > now()))
  )
$$;

-- Moderation status on UGC
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'APPROVED';
ALTER TABLE public.spotlight_posts ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'APPROVED';
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'APPROVED';
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_moderation_status_check CHECK (moderation_status IN ('PENDING','APPROVED','FLAGGED','REMOVED'));
ALTER TABLE public.spotlight_posts ADD CONSTRAINT spotlight_posts_moderation_status_check CHECK (moderation_status IN ('PENDING','APPROVED','FLAGGED','REMOVED'));
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_moderation_status_check CHECK (moderation_status IN ('PENDING','APPROVED','FLAGGED','REMOVED'));

CREATE OR REPLACE FUNCTION public.ugc_text_is_suspicious(_text text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(_text, '') ~* '(\m(kill yourself|kys|i will kill you|je vais te tuer|rape|child porn|cp links?|nudes? for sale|send nudes|sex for money|escort service|buy (cocaine|heroin|meth|guns?)|fake (id|passport)s? for sale|double your money|send (me )?money to win|nigger|faggot|sale race|nègre)\M)'
$$;

CREATE OR REPLACE FUNCTION public.screen_ugc_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE body text;
BEGIN
  IF TG_TABLE_NAME = 'post_comments' THEN body := NEW.body; ELSE body := NEW.caption; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.moderation_status := CASE WHEN public.ugc_text_is_suspicious(body) THEN 'FLAGGED' ELSE 'APPROVED' END;
  ELSE
    -- members cannot change moderation outcome; edits are re-screened
    NEW.moderation_status := OLD.moderation_status;
    IF OLD.moderation_status = 'APPROVED' AND public.ugc_text_is_suspicious(body) THEN
      NEW.moderation_status := 'FLAGGED';
    END IF;
  END IF;
  IF NEW.moderation_status = 'FLAGGED' THEN
    PERFORM public.log_security_event('UGC_FLAGGED', 'WARN', TG_TABLE_NAME, 'auto-filter',
      jsonb_build_object('content_id', NEW.id, 'table', TG_TABLE_NAME), auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_screen_social_posts ON public.social_posts;
CREATE TRIGGER trg_screen_social_posts BEFORE INSERT OR UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.screen_ugc_insert();
DROP TRIGGER IF EXISTS trg_screen_spotlight_posts ON public.spotlight_posts;
CREATE TRIGGER trg_screen_spotlight_posts BEFORE INSERT OR UPDATE ON public.spotlight_posts FOR EACH ROW EXECUTE FUNCTION public.screen_ugc_insert();
DROP TRIGGER IF EXISTS trg_screen_post_comments ON public.post_comments;
CREATE TRIGGER trg_screen_post_comments BEFORE INSERT OR UPDATE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.screen_ugc_insert();

-- Visibility: blocks, restricted authors, moderation state (restrictive, layered on existing policies)
CREATE POLICY "safety visibility" ON public.social_posts AS RESTRICTIVE FOR SELECT TO public
USING (
  author_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR (
    moderation_status = 'APPROVED'
    AND NOT public.is_author_restricted(author_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), author_id))
  )
);
CREATE POLICY "safety visibility" ON public.spotlight_posts AS RESTRICTIVE FOR SELECT TO public
USING (
  author_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR (
    moderation_status = 'APPROVED'
    AND NOT public.is_author_restricted(author_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), author_id))
  )
);
CREATE POLICY "safety visibility" ON public.post_comments AS RESTRICTIVE FOR SELECT TO public
USING (
  author_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR (
    moderation_status = 'APPROVED'
    AND NOT public.is_author_restricted(author_id)
    AND (auth.uid() IS NULL OR NOT public.is_blocked_pair(auth.uid(), author_id))
  )
);

-- Blocked pairs cannot comment on each other's posts
CREATE OR REPLACE FUNCTION public.enforce_comment_not_blocked()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid;
BEGIN
  SELECT author_id INTO owner FROM public.social_posts WHERE id = NEW.post_id;
  IF owner IS NOT NULL AND public.is_blocked_pair(NEW.author_id, owner) THEN
    RAISE EXCEPTION 'BLOCKED';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_comment_not_blocked ON public.post_comments;
CREATE TRIGGER trg_comment_not_blocked BEFORE INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_not_blocked();

-- Every block notifies Trust & Safety
CREATE OR REPLACE FUNCTION public.log_user_block()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.security_events (kind, severity, subject, actor_user_id, route, detail)
  VALUES (
    CASE WHEN TG_OP = 'INSERT' THEN 'USER_BLOCK' ELSE 'USER_UNBLOCK' END,
    'INFO', 'user_blocks',
    CASE WHEN TG_OP = 'INSERT' THEN NEW.blocker_id ELSE OLD.blocker_id END,
    left(coalesce(CASE WHEN TG_OP = 'INSERT' THEN NEW.reason ELSE NULL END, 'app'), 128),
    jsonb_build_object(
      'blocker_user_id', CASE WHEN TG_OP = 'INSERT' THEN NEW.blocker_id ELSE OLD.blocker_id END,
      'blocked_user_id', CASE WHEN TG_OP = 'INSERT' THEN NEW.blocked_id ELSE OLD.blocked_id END
    )
  );
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_log_user_block ON public.user_blocks;
CREATE TRIGGER trg_log_user_block AFTER INSERT OR DELETE ON public.user_blocks FOR EACH ROW EXECUTE FUNCTION public.log_user_block();

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created ON public.content_reports (status, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_kind_created ON public.security_events (kind, created_at DESC);
