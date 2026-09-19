CREATE OR REPLACE FUNCTION public.open_job_conversation(_job_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _poster uuid;
  _title text;
  _company text;
  _conversation_id uuid;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT poster_id, title, company
    INTO _poster, _title, _company
  FROM public.jobs
  WHERE id = _job_id AND is_open = true;

  IF _poster IS NULL THEN
    RAISE EXCEPTION 'Open job not found';
  END IF;
  IF _poster = _caller THEN
    RAISE EXCEPTION 'You cannot message yourself about your own job';
  END IF;

  SELECT id INTO _conversation_id
  FROM public.conversations
  WHERE job_id = _job_id
    AND client_id = _caller
    AND owner_id = _poster
  LIMIT 1;

  IF _conversation_id IS NULL THEN
    INSERT INTO public.conversations (client_id, owner_id, job_id)
    VALUES (_caller, _poster, _job_id)
    RETURNING id INTO _conversation_id;

    INSERT INTO public.messages (conversation_id, sender_id, body, kind, metadata)
    VALUES (
      _conversation_id,
      _caller,
      format('Hello, I am contacting you regarding the %s role at %s.', _title, _company),
      'SYSTEM',
      jsonb_build_object(
        'source', 'job_contact',
        'job_id', _job_id,
        'job_title', _title,
        'company', _company
      )
    );
  END IF;

  RETURN _conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.open_job_conversation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_job_conversation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.open_job_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_job_conversation(uuid) TO service_role;