CREATE OR REPLACE FUNCTION public.complete_clean_payment(_payment_reference text, _provider_transaction_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.clean_orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.clean_orders WHERE payment_reference = _payment_reference FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF o.payment_status = 'PAID' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  UPDATE public.clean_orders SET payment_status = 'PAID', paid_at = now(), status = 'APPROVED',
    provider_transaction_id = COALESCE(_provider_transaction_id, provider_transaction_id),
    receipt_no = COALESCE(receipt_no, 'RC-' || substr(order_no, 4))
  WHERE id = o.id;
  UPDATE public.clean_price_quotes SET status = 'APPROVED', decided_at = now() WHERE id = o.current_quote_id;
  INSERT INTO public.clean_status_events (order_id, status, note, actor) VALUES (o.id, 'APPROVED', 'Payment received', 'system');
  INSERT INTO public.notifications (user_id, category, title, body, data)
    VALUES (o.customer_id, 'ASH_CLEAN', 'ASH Clean payment received',
      'Order ' || o.order_no || ' is paid. Washing starts now.',
      jsonb_build_object('link', '/clean/orders/' || o.id, 'order_id', o.id));
  RETURN jsonb_build_object('ok', true);
END; $$;
REVOKE EXECUTE ON FUNCTION public.complete_clean_payment(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_clean_worker_on(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clean_worker_on(uuid, uuid) TO authenticated;