DROP FUNCTION IF EXISTS public.claim_deal(uuid);

CREATE OR REPLACE FUNCTION public.claim_deal(_deal_id uuid, _user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _deal public.deals;
  _code text;
  _existing public.deal_claims;
BEGIN
  IF _user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED'); END IF;
  SELECT * INTO _deal FROM public.deals WHERE id = _deal_id FOR UPDATE;
  IF _deal.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF NOT _deal.is_active OR _deal.ends_at <= now() THEN RETURN jsonb_build_object('ok', false, 'error', 'EXPIRED'); END IF;

  SELECT * INTO _existing FROM public.deal_claims WHERE deal_id = _deal_id AND user_id = _user_id;
  IF _existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'code', _existing.code, 'already', true);
  END IF;

  IF _deal.claimed_count >= _deal.claim_limit THEN RETURN jsonb_build_object('ok', false, 'error', 'SOLD_OUT'); END IF;

  _code := 'ASH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.deal_claims (deal_id, user_id, code) VALUES (_deal_id, _user_id, _code);
  UPDATE public.deals SET claimed_count = claimed_count + 1 WHERE id = _deal_id;

  PERFORM public.notify_user(_deal.owner_id, 'DEAL', 'Deal claimed', 'Someone just claimed "' || _deal.title || '".', jsonb_build_object('deal_id', _deal_id));
  RETURN jsonb_build_object('ok', true, 'code', _code, 'already', false);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_deal(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_deal(uuid, uuid) TO service_role;