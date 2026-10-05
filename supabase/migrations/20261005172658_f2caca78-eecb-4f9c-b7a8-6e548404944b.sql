CREATE TABLE public.identity_restrictions (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id),
 attempts integer NOT NULL DEFAULT 0,
 restricted_at timestamptz,
 banned_at timestamptz,
 restored_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.identity_restrictions TO service_role;
ALTER TABLE public.identity_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Private identity enforcement" ON public.identity_restrictions FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TABLE public.identity_photo_reviews (
 object_path text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES public.profiles(user_id),
 file_hash text NOT NULL,
 pixel_hash text,
 approved boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.identity_photo_reviews TO service_role;
ALTER TABLE public.identity_photo_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Private photo comparisons" ON public.identity_photo_reviews FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE OR REPLACE FUNCTION public.identity_access_allowed(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT NOT EXISTS (SELECT 1 FROM public.identity_restrictions WHERE user_id=_uid AND restricted_at IS NOT NULL AND restored_at IS NULL)
$$;
REVOKE ALL ON FUNCTION public.identity_access_allowed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.identity_access_allowed(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.my_identity_status() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce((SELECT jsonb_build_object('attempts', attempts, 'restricted', restricted_at IS NOT NULL AND restored_at IS NULL, 'banned', banned_at IS NOT NULL AND restored_at IS NULL) FROM public.identity_restrictions WHERE user_id=auth.uid()), '{"attempts":0,"restricted":false,"banned":false}'::jsonb)
$$;
REVOKE ALL ON FUNCTION public.my_identity_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_identity_status() TO authenticated;
CREATE OR REPLACE FUNCTION public.record_identity_denial(_actor uuid,_owner uuid,_kind text,_value text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer;
BEGIN
 IF _actor=_owner OR _kind NOT IN ('NAME','PHOTO') THEN RAISE EXCEPTION 'INVALID_IDENTITY_DENIAL'; END IF;
 PERFORM 1 FROM public.profiles WHERE user_id=_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
 INSERT INTO public.identity_restrictions(user_id) VALUES(_actor) ON CONFLICT DO NOTHING;
 UPDATE public.identity_restrictions SET attempts=CASE WHEN restored_at IS NOT NULL THEN 1 ELSE attempts+1 END, restricted_at=now(), banned_at=CASE WHEN restored_at IS NOT NULL THEN NULL WHEN attempts+1>=4 THEN coalesce(banned_at,now()) ELSE NULL END, restored_at=NULL,updated_at=now() WHERE user_id=_actor RETURNING attempts INTO v_count;
 INSERT INTO public.impersonation_attempts(actor_id,protected_user_id,kind,attempted_value) VALUES(_actor,_owner,_kind,left(_value,200));
 IF v_count>=4 THEN
  UPDATE public.profiles SET moderation_banned_at=coalesce(moderation_banned_at,now()), moderation_ban_reason=CASE WHEN moderation_banned_at IS NULL THEN 'VERIFIED_IDENTITY_IMPERSONATION' ELSE moderation_ban_reason END WHERE user_id=_actor;
 END IF;
 RETURN jsonb_build_object('denied',true,'attempts',v_count,'restricted',true,'banned',v_count>=4);
END $$;
REVOKE ALL ON FUNCTION public.record_identity_denial(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_identity_denial(uuid,uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.guard_verified_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid; v_denied boolean:=false; v_result jsonb;
BEGIN
 IF TG_OP='UPDATE' AND NOT public.identity_access_allowed(OLD.user_id) AND EXISTS(SELECT 1 FROM public.identity_restrictions WHERE user_id=OLD.user_id AND banned_at IS NOT NULL AND restored_at IS NULL) AND (NEW.full_name IS DISTINCT FROM OLD.full_name OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url) THEN RAISE EXCEPTION 'DENIED_ACCOUNT_BANNED'; END IF;
 IF NEW.full_name IS NOT NULL AND btrim(NEW.full_name)<>'' AND (TG_OP='INSERT' OR NEW.full_name IS DISTINCT FROM OLD.full_name) THEN
  SELECT user_id INTO v_owner FROM public.profiles WHERE user_id<>NEW.user_id AND lower(regexp_replace(btrim(full_name),'[[:space:]]+',' ','g'))=lower(regexp_replace(btrim(NEW.full_name),'[[:space:]]+',' ','g')) AND public.is_verified(user_id) LIMIT 1;
  IF v_owner IS NOT NULL THEN
   IF TG_OP='INSERT' THEN NEW.full_name:=''; END IF;
   IF TG_OP='UPDATE' THEN
    v_result:=public.record_identity_denial(NEW.user_id,v_owner,'NAME',NEW.full_name);
    NEW.full_name:=OLD.full_name;
    IF (v_result->>'banned')::boolean THEN NEW.moderation_banned_at:=coalesce(OLD.moderation_banned_at,now()); NEW.moderation_ban_reason:=coalesce(OLD.moderation_ban_reason,'VERIFIED_IDENTITY_IMPERSONATION'); END IF;
   END IF;
   v_denied:=true;
  END IF;
 END IF;
 IF NEW.avatar_url IS NOT NULL AND btrim(NEW.avatar_url)<>'' AND (TG_OP='INSERT' OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url) THEN
  SELECT user_id INTO v_owner FROM public.profiles WHERE user_id<>NEW.user_id AND avatar_url=NEW.avatar_url AND public.is_verified(user_id) LIMIT 1;
  IF v_owner IS NOT NULL THEN
   IF TG_OP='UPDATE' AND NOT v_denied THEN
    v_result:=public.record_identity_denial(NEW.user_id,v_owner,'PHOTO',NEW.avatar_url);
    IF (v_result->>'banned')::boolean THEN NEW.moderation_banned_at:=coalesce(OLD.moderation_banned_at,now()); NEW.moderation_ban_reason:=coalesce(OLD.moderation_ban_reason,'VERIFIED_IDENTITY_IMPERSONATION'); END IF;
   END IF;
   NEW.avatar_url:=CASE WHEN TG_OP='UPDATE' THEN OLD.avatar_url ELSE NULL END;
  ELSIF NOT EXISTS(SELECT 1 FROM public.identity_photo_reviews WHERE object_path=NEW.avatar_url AND user_id=NEW.user_id AND approved) THEN
   IF TG_OP='INSERT' THEN NEW.avatar_url:=NULL; ELSE RAISE EXCEPTION 'PHOTO_REVIEW_REQUIRED'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_verified_identity() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.restore_identity_access(_uid uuid,_actor text,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.profiles WHERE user_id=_uid FOR UPDATE;
 UPDATE public.identity_restrictions SET restored_at=now(),updated_at=now() WHERE user_id=_uid;
 UPDATE public.profiles SET moderation_banned_at=NULL,moderation_ban_reason=NULL WHERE user_id=_uid AND moderation_ban_reason='VERIFIED_IDENTITY_IMPERSONATION';
 INSERT INTO public.admin_audit_log(actor,action,target_user_id,reason) VALUES(left(_actor,160),'TS_IDENTITY_RESTORE',_uid,left(_reason,500));
END $$;
REVOKE ALL ON FUNCTION public.restore_identity_access(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.restore_identity_access(uuid,text,text) TO service_role;
-- Add identity restrictions to existing member policies without widening any access.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename NOT IN ('profiles','identity_restrictions','identity_photo_reviews') AND 'authenticated'=ANY(roles) LOOP
  IF p.qual IS NOT NULL THEN EXECUTE format('ALTER POLICY %I ON public.%I USING ((%s) AND public.identity_access_allowed(auth.uid()))',p.policyname,p.tablename,p.qual); END IF;
  IF p.with_check IS NOT NULL THEN EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK ((%s) AND public.identity_access_allowed(auth.uid()))',p.policyname,p.tablename,p.with_check); END IF;
 END LOOP;
END $$;
-- Run after the existing profile-column protector so denial bans cannot be stripped.
DROP TRIGGER IF EXISTS guard_verified_identity_trg ON public.profiles;
CREATE TRIGGER z_guard_verified_identity BEFORE INSERT OR UPDATE OF full_name,avatar_url ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_verified_identity();