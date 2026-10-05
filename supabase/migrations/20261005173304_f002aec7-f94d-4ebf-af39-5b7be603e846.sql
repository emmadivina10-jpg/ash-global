DO $$
DECLARE v_actor uuid; owner_id uuid; n integer; status jsonb; original_name text;
BEGIN
 SELECT user_id INTO v_actor FROM public.profiles ORDER BY user_id LIMIT 1;
 SELECT user_id INTO owner_id FROM public.profiles WHERE user_id<>v_actor ORDER BY user_id LIMIT 1;
 IF v_actor IS NULL OR owner_id IS NULL THEN RAISE EXCEPTION 'TEST_REQUIRES_TWO_PROFILES'; END IF;
 BEGIN
  UPDATE public.profiles SET verified_tier='INDIVIDUAL',verified_until=now()+interval '1 day',full_name='ASH Identity Rollback Test Owner' WHERE user_id=owner_id;
  SELECT full_name INTO original_name FROM public.profiles WHERE user_id=v_actor;
  FOR n IN 1..4 LOOP
   UPDATE public.profiles SET full_name='ASH Identity Rollback Test Owner' WHERE user_id=v_actor;
   SELECT jsonb_build_object('attempts',attempts,'banned',banned_at IS NOT NULL) INTO status FROM public.identity_restrictions WHERE user_id=v_actor;
   IF (status->>'attempts')::integer<>n THEN RAISE EXCEPTION 'STRIKE_TEST_FAILED_%',n; END IF;
   IF (SELECT full_name FROM public.profiles WHERE user_id=v_actor) IS DISTINCT FROM original_name THEN RAISE EXCEPTION 'PROTECTED_NAME_SAVED'; END IF;
   IF n=4 AND NOT (status->>'banned')::boolean THEN RAISE EXCEPTION 'FOURTH_STRIKE_BAN_FAILED'; END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.impersonation_attempts WHERE actor_id=v_actor AND protected_user_id=owner_id) < 4 THEN RAISE EXCEPTION 'AUDIT_TEST_FAILED'; END IF;
  PERFORM public.restore_identity_access(v_actor,'Rollback test','Rollback-only authorized restoration test');
  IF EXISTS(SELECT 1 FROM public.identity_restrictions WHERE user_id=v_actor AND restored_at IS NULL) THEN RAISE EXCEPTION 'RESTORE_TEST_FAILED'; END IF;
  RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='ROLLBACK_IDENTITY_TEST';
 EXCEPTION WHEN no_data_found THEN
  IF SQLERRM<>'ROLLBACK_IDENTITY_TEST' THEN RAISE; END IF;
  RAISE NOTICE 'PASS: protected name unchanged, strikes 1-4 durable, fourth strike banned, authorized restoration; test rows rolled back';
 END;
END $$;