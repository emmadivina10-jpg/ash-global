
CREATE OR REPLACE FUNCTION public.is_provider_owner(_provider_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select auth.uid() is not null and exists (
    select 1 from public.provider_profiles p where p.id = _provider_id and p.user_id = auth.uid()
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select auth.uid() is not null and exists (
    select 1 from public.conversations c
    join public.provider_profiles p on p.id = c.provider_id
    where c.id = _conversation_id and (c.client_id = auth.uid() or p.user_id = auth.uid())
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_provider_visible(_provider_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select auth.uid() is not null and exists (
    select 1 from public.provider_profiles p
    where p.id = _provider_id and (p.is_live = true or p.user_id = auth.uid())
  )
$function$;

REVOKE ALL ON FUNCTION public.is_provider_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_conversation_participant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_provider_visible(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_network_tree() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_provider_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider_visible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_network_tree() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated;
