DROP POLICY IF EXISTS "Participants read messages" ON public.messages;

CREATE POLICY "Participants read unlocked messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(conversation_id)
  AND NOT EXISTS (
    SELECT 1
    FROM public.conversation_prefs cp
    WHERE cp.user_id = auth.uid()
      AND cp.conversation_id = messages.conversation_id
      AND cp.locked = true
  )
);

CREATE OR REPLACE FUNCTION public.get_locked_chat_messages(
  _conversation_id uuid,
  _pin text
)
RETURNS SETOF public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _stored_hash text;
  _is_locked boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_conversation_participant(_conversation_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT cp.locked
    INTO _is_locked
  FROM public.conversation_prefs cp
  WHERE cp.user_id = auth.uid()
    AND cp.conversation_id = _conversation_id;

  IF COALESCE(_is_locked, false) = false THEN
    RAISE EXCEPTION 'CHAT_NOT_LOCKED';
  END IF;

  SELECT cs.lock_pin
    INTO _stored_hash
  FROM public.chat_settings cs
  WHERE cs.user_id = auth.uid();

  IF _stored_hash IS NULL
     OR encode(digest('ash-chat-lock:' || trim(_pin), 'sha256'), 'hex') <> _stored_hash THEN
    RAISE EXCEPTION 'INVALID_CHAT_PIN';
  END IF;

  RETURN QUERY
  SELECT m.*
  FROM public.messages m
  WHERE m.conversation_id = _conversation_id
  ORDER BY m.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_locked_chat_messages(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_locked_chat_messages(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_locked_chat_messages(uuid, text) TO service_role;