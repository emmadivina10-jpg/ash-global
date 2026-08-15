CREATE OR REPLACE FUNCTION public.get_user_network_tree()
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  level smallint,
  account_status text,
  joined_at timestamp with time zone,
  commission numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE tree AS (
    SELECT p.user_id, p.referred_by, 1::smallint AS level, p.account_status, p.created_at
    FROM public.profiles p
    WHERE p.referred_by = auth.uid()
    UNION ALL
    SELECT p.user_id, p.referred_by, (t.level + 1)::smallint, p.account_status, p.created_at
    FROM public.profiles p
    JOIN tree t ON p.referred_by = t.user_id
    WHERE t.level < 3
  )
  SELECT
    t.user_id AS id,
    t.referred_by AS parent_id,
    t.level,
    t.account_status,
    t.created_at AS joined_at,
    COALESCE((
      SELECT SUM(tx.amount)
      FROM public.transactions tx
      JOIN public.activations act ON tx.reference = 'COM-' || act.payment_reference || '-L' || t.level::text
      WHERE tx.user_id = auth.uid()
        AND tx.type = 'REFERRAL_COMMISSION'
        AND act.user_id = t.user_id
        AND tx.status = 'COMPLETED'
    ), 0) AS commission
  FROM tree t;
$$;

-- Lock down: no public or anonymous execution; only authenticated users can call it.
REVOKE ALL ON FUNCTION public.get_user_network_tree() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_network_tree() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_network_tree() TO authenticated;