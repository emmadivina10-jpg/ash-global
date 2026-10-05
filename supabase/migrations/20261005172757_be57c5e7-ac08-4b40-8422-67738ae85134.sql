ALTER FUNCTION public.identity_access_allowed(uuid) SET SCHEMA safety;
GRANT USAGE ON SCHEMA safety TO anon,authenticated,service_role;
GRANT SELECT ON public.identity_restrictions TO authenticated;
CREATE POLICY "Members read own identity status" ON public.identity_restrictions FOR SELECT TO authenticated USING(user_id=auth.uid());
ALTER FUNCTION public.my_identity_status() SECURITY INVOKER;
CREATE OR REPLACE FUNCTION public.guard_verified_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid; v_denied boolean:=false; v_result jsonb;
BEGIN
 IF TG_OP='UPDATE' AND NOT safety.identity_access_allowed(OLD.user_id) AND EXISTS(SELECT 1 FROM public.identity_restrictions WHERE user_id=OLD.user_id AND banned_at IS NOT NULL AND restored_at IS NULL) AND (NEW.full_name IS DISTINCT FROM OLD.full_name OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url) THEN RAISE EXCEPTION 'DENIED_ACCOUNT_BANNED'; END IF;
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