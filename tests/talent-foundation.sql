-- Run only against an isolated local database, after applying the migration
-- within the same transaction. The caller must roll back the transaction.
INSERT INTO auth.users (id, email)
VALUES ('f1e00000-0000-4000-8000-000000000001', 'talent-owner@example.invalid'),
       ('f1e00000-0000-4000-8000-000000000002', 'talent-customer@example.invalid'),
       ('f1e00000-0000-4000-8000-000000000003', 'talent-admin@example.invalid');
INSERT INTO public.user_roles (user_id, role)
VALUES ('f1e00000-0000-4000-8000-000000000003', 'admin');
INSERT INTO public.musician_profiles
  (id, user_id, display_name, instruments, city, country, review_status)
VALUES ('f1e00000-0000-4000-8000-000000000011', 'f1e00000-0000-4000-8000-000000000001',
  'Musician', ARRAY['pianist'], 'Douala', 'CM', 'APPROVED');
INSERT INTO public.musician_contacts (musician_id, email)
VALUES ('f1e00000-0000-4000-8000-000000000011', 'private@example.invalid');
INSERT INTO storage.objects (bucket_id, name)
VALUES ('musician-portfolio', 'f1e00000-0000-4000-8000-000000000001/approved.jpg'),
       ('musician-portfolio', 'f1e00000-0000-4000-8000-000000000001/pending.mp3');
INSERT INTO public.musician_media (musician_id, object_path, media_type, review_status)
VALUES ('f1e00000-0000-4000-8000-000000000011',
  'f1e00000-0000-4000-8000-000000000001/approved.jpg', 'PHOTO', 'APPROVED'),
 ('f1e00000-0000-4000-8000-000000000011',
  'f1e00000-0000-4000-8000-000000000001/pending.mp3', 'AUDIO', 'PENDING');

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.musician_profiles) <> 1 THEN RAISE EXCEPTION 'approved profile missing'; END IF;
  IF (SELECT count(*) FROM public.musician_media) <> 1 THEN RAISE EXCEPTION 'pending media metadata visible'; END IF;
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'musician-portfolio') <> 1 THEN
    RAISE EXCEPTION 'pending storage object visible';
  END IF;
  BEGIN
    PERFORM * FROM public.musician_contacts;
    RAISE EXCEPTION 'contacts visible to anonymous user';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'f1e00000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE enquiry uuid;
BEGIN
  IF (SELECT count(*) FROM public.musician_contacts) <> 0 THEN RAISE EXCEPTION 'contacts leaked'; END IF;
  BEGIN
    PERFORM public.review_musician_content('MEDIA',
      (SELECT id FROM public.musician_media LIMIT 1), 'APPROVED');
    RAISE EXCEPTION 'non-admin reviewed media';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Review not permitted' THEN RAISE; END IF;
  END;
  enquiry := public.submit_musician_enquiry('f1e00000-0000-4000-8000-000000000011', 'Gig enquiry', NULL);
  BEGIN
    PERFORM public.respond_musician_enquiry(enquiry, 'ACCEPTED');
    RAISE EXCEPTION 'customer responded to own enquiry';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Enquiry unavailable' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'f1e00000-0000-4000-8000-000000000003', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE media_id uuid;
BEGIN
  SELECT id INTO media_id FROM public.musician_media WHERE review_status = 'PENDING';
  IF media_id IS NULL THEN RAISE EXCEPTION 'admin cannot inspect pending media'; END IF;
  PERFORM public.review_musician_content('MEDIA', media_id, 'REJECTED');
  IF (SELECT review_status FROM public.musician_media WHERE id = media_id) <> 'REJECTED' THEN
    RAISE EXCEPTION 'review decision not saved';
  END IF;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'f1e00000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE enquiry uuid;
BEGIN
  SELECT id INTO enquiry FROM public.musician_enquiries LIMIT 1;
  PERFORM public.respond_musician_enquiry(enquiry, 'ACCEPTED');
  IF (SELECT status FROM public.musician_enquiries WHERE id = enquiry) <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'owner response not saved';
  END IF;
  BEGIN
    UPDATE public.musician_profiles SET review_status = 'APPROVED';
    RAISE EXCEPTION 'owner can set approval';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.musician_profiles SET biography = 'Changed';
  IF (SELECT review_status FROM public.musician_profiles LIMIT 1) <> 'PENDING' THEN
    RAISE EXCEPTION 'profile change was not sent for review';
  END IF;
  INSERT INTO storage.objects (bucket_id, name) VALUES
    ('musician-portfolio', 'f1e00000-0000-4000-8000-000000000001/new.jpg');
  INSERT INTO public.musician_media (musician_id, object_path, media_type)
  VALUES ('f1e00000-0000-4000-8000-000000000011',
    'f1e00000-0000-4000-8000-000000000001/new.jpg', 'PHOTO');
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects WHERE bucket_id = 'musician-portfolio';
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'musician-portfolio') THEN
    RAISE EXCEPTION 'owner can remove and replace reviewed bytes';
  END IF;
END $$;
RESET ROLE;
