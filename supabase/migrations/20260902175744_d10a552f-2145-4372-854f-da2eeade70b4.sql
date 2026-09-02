ALTER TABLE public.conversations
  ALTER COLUMN provider_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.property_listings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_listing_client_key
  ON public.conversations (listing_id, client_id) WHERE listing_id IS NOT NULL;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_party_present
  CHECK (provider_id IS NOT NULL OR (listing_id IS NOT NULL AND owner_id IS NOT NULL));

DROP POLICY IF EXISTS "Participants read conversations" ON public.conversations;
CREATE POLICY "Participants read conversations" ON public.conversations
FOR SELECT TO authenticated
USING (client_id = auth.uid() OR owner_id = auth.uid() OR public.is_provider_owner(provider_id));

DROP POLICY IF EXISTS "Participants update conversations" ON public.conversations;
CREATE POLICY "Participants update conversations" ON public.conversations
FOR UPDATE TO authenticated
USING (client_id = auth.uid() OR owner_id = auth.uid() OR public.is_provider_owner(provider_id))
WITH CHECK (client_id = auth.uid() OR owner_id = auth.uid() OR public.is_provider_owner(provider_id));

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select auth.uid() is not null and exists (
    select 1 from public.conversations c
    left join public.provider_profiles p on p.id = c.provider_id
    where c.id = _conversation_id
      and (c.client_id = auth.uid() or c.owner_id = auth.uid() or p.user_id = auth.uid())
  )
$function$;

CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conv RECORD;
  recipient uuid;
  sender_name text;
BEGIN
  SELECT c.client_id, c.owner_id, p.user_id AS provider_user_id, p.business_name
    INTO conv
    FROM public.conversations c
    LEFT JOIN public.provider_profiles p ON p.id = c.provider_id
   WHERE c.id = NEW.conversation_id;
  IF conv.client_id IS NULL THEN RETURN NEW; END IF;

  recipient := CASE
    WHEN NEW.sender_id = conv.client_id THEN coalesce(conv.provider_user_id, conv.owner_id)
    ELSE conv.client_id END;
  IF recipient IS NULL OR recipient = NEW.sender_id THEN RETURN NEW; END IF;

  IF conv.provider_user_id IS NOT NULL AND NEW.sender_id = conv.provider_user_id THEN
    sender_name := conv.business_name;
  ELSE
    SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  END IF;

  PERFORM public.notify_user(recipient, 'MESSAGE',
    'New message from ' || coalesce(nullif(sender_name, ''), 'ASH member'),
    left(NEW.body, 140),
    jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id));

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.open_property_conversation(_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _listing public.property_listings;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); END IF;
  SELECT * INTO _listing FROM public.property_listings WHERE id = _listing_id;
  IF _listing.id IS NULL OR _listing.status <> 'ACTIVE' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'LISTING_UNAVAILABLE');
  END IF;
  IF _listing.owner_id = _uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OWN_LISTING');
  END IF;
  IF public.is_blocked_pair(_uid, _listing.owner_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'BLOCKED');
  END IF;

  SELECT id INTO _id FROM public.conversations
   WHERE listing_id = _listing_id AND client_id = _uid LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.conversations (listing_id, owner_id, client_id)
    VALUES (_listing_id, _listing.owner_id, _uid)
    RETURNING id INTO _id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', _id);
END;
$function$;

REVOKE ALL ON FUNCTION public.open_property_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_property_conversation(uuid) TO authenticated;