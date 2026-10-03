ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'APPROVED'
  CHECK (moderation_status IN ('PENDING','APPROVED','FLAGGED','REMOVED'));

CREATE OR REPLACE FUNCTION public.screen_ugc_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE body text;
BEGIN
  IF TG_TABLE_NAME = 'post_comments' THEN body := NEW.body; ELSE body := NEW.caption; END IF;
  -- trusted backend (moderation console) and admins set status directly
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.moderation_status := CASE WHEN public.ugc_text_is_suspicious(body) THEN 'FLAGGED' ELSE 'APPROVED' END;
  ELSE
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
REVOKE EXECUTE ON FUNCTION public.screen_ugc_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_screen_stories ON public.stories;
CREATE TRIGGER trg_screen_stories BEFORE INSERT OR UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.screen_ugc_insert();

DROP POLICY IF EXISTS "stories readable while live" ON public.stories;
CREATE POLICY "stories readable while live" ON public.stories FOR SELECT TO authenticated
USING (
  author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR (
    expires_at > now()
    AND moderation_status = 'APPROVED'
    AND NOT public.is_author_restricted(author_id)
    AND NOT public.is_blocked_pair(auth.uid(), author_id)
    AND (
      (audience = 'ALL' AND NOT (auth.uid() = ANY (block_ids)))
      OR (audience = 'SELECT' AND auth.uid() = ANY (allow_ids))
    )
  )
);