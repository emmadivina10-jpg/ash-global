-- RLS calls need an anonymous grant where public policies apply; return no private data.
REVOKE ALL ON FUNCTION public.identity_access_allowed(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.identity_access_allowed(uuid) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.my_identity_status() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 RETURN coalesce((SELECT jsonb_build_object('attempts',attempts,'restricted',restricted_at IS NOT NULL AND restored_at IS NULL,'banned',banned_at IS NOT NULL AND restored_at IS NULL) FROM public.identity_restrictions WHERE user_id=auth.uid()),'{"attempts":0,"restricted":false,"banned":false}'::jsonb);
END $$;
-- Do not recursively update a profile inside its own BEFORE trigger.
CREATE OR REPLACE FUNCTION public.record_identity_denial(_actor uuid,_owner uuid,_kind text,_value text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer;
BEGIN
 IF _actor=_owner OR _kind NOT IN ('NAME','PHOTO') THEN RAISE EXCEPTION 'INVALID_IDENTITY_DENIAL'; END IF;
 PERFORM 1 FROM public.profiles WHERE user_id=_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
 INSERT INTO public.identity_restrictions(user_id) VALUES(_actor) ON CONFLICT DO NOTHING;
 UPDATE public.identity_restrictions SET attempts=CASE WHEN restored_at IS NOT NULL THEN 1 ELSE attempts+1 END,restricted_at=now(),banned_at=CASE WHEN restored_at IS NOT NULL THEN NULL WHEN attempts+1>=4 THEN coalesce(banned_at,now()) ELSE NULL END,restored_at=NULL,updated_at=now() WHERE user_id=_actor RETURNING attempts INTO v_count;
 INSERT INTO public.impersonation_attempts(actor_id,protected_user_id,kind,attempted_value) VALUES(_actor,_owner,_kind,left(_value,200));
 RETURN jsonb_build_object('denied',true,'attempts',v_count,'restricted',true,'banned',v_count>=4);
END $$;
-- Anonymous access cannot probe a different member's restriction status.
CREATE OR REPLACE FUNCTION public.identity_access_allowed(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN _uid IS NULL THEN true WHEN auth.role()='service_role' OR _uid=auth.uid() THEN NOT EXISTS(SELECT 1 FROM public.identity_restrictions WHERE user_id=_uid AND restricted_at IS NOT NULL AND restored_at IS NULL) ELSE false END
$$;
-- Security-definer routines below deliberately expose only the caller's own status/boolean.
COMMENT ON FUNCTION public.identity_access_allowed(uuid) IS 'RLS predicate: caller-scoped boolean only; anonymous NULL is allowed for existing public policies.';
COMMENT ON FUNCTION public.my_identity_status() IS 'Authenticated self-only status; never returns another member or protected identity.';