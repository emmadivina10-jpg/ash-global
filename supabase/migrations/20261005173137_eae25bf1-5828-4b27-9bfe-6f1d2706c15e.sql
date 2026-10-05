DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename NOT IN ('profiles','identity_restrictions','identity_photo_reviews') AND 'public'=ANY(roles) LOOP
  IF p.qual IS NOT NULL THEN EXECUTE format('ALTER POLICY %I ON public.%I USING ((%s) AND safety.identity_access_allowed(auth.uid()))',p.policyname,p.tablename,p.qual); END IF;
  IF p.with_check IS NOT NULL THEN EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK ((%s) AND safety.identity_access_allowed(auth.uid()))',p.policyname,p.tablename,p.with_check); END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION safety.avatar_write_allowed(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT safety.identity_access_allowed(auth.uid()) AND NOT EXISTS(SELECT 1 FROM public.identity_photo_reviews WHERE object_path=_path)
$$;
REVOKE ALL ON FUNCTION safety.avatar_write_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION safety.avatar_write_allowed(text) TO anon,authenticated,service_role;
CREATE POLICY "Reviewed avatars cannot be replaced" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id<>'avatars' OR safety.avatar_write_allowed(name)) WITH CHECK(bucket_id<>'avatars' OR safety.avatar_write_allowed(name));
CREATE OR REPLACE FUNCTION public.record_signup_identity_denial() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_name text; v_owner uuid;
BEGIN
 IF btrim(coalesce(NEW.full_name,''))<>'' THEN RETURN NEW; END IF;
 -- The existing auth trigger cannot be changed; read only the new account metadata.
 SELECT raw_user_meta_data->>'full_name' INTO v_name FROM auth.users WHERE id=NEW.user_id;
 IF coalesce(btrim(v_name),'')='' THEN RETURN NEW; END IF;
 SELECT user_id INTO v_owner FROM public.profiles WHERE user_id<>NEW.user_id AND lower(regexp_replace(btrim(full_name),'[[:space:]]+',' ','g'))=lower(regexp_replace(btrim(v_name),'[[:space:]]+',' ','g')) AND public.is_verified(user_id) LIMIT 1;
 IF v_owner IS NOT NULL THEN PERFORM public.record_identity_denial(NEW.user_id,v_owner,'NAME',v_name); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_signup_identity_denial() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER signup_identity_denial AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.record_signup_identity_denial();