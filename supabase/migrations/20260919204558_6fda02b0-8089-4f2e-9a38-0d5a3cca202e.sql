ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS image_path text;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS conversations_job_id_idx
  ON public.conversations(job_id)
  WHERE job_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_job_participants_unique_idx
  ON public.conversations(job_id, client_id, owner_id)
  WHERE job_id IS NOT NULL AND group_id IS NULL;

DROP POLICY IF EXISTS "Job posters upload job images" ON storage.objects;
CREATE POLICY "Job posters upload job images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Members read visible job images" ON storage.objects;
CREATE POLICY "Members read visible job images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-images'
  AND EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.image_path = storage.objects.name
      AND (j.is_open OR j.poster_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Job posters delete job images" ON storage.objects;
CREATE POLICY "Job posters delete job images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_user_network_tree_with_profiles()
RETURNS TABLE(
  id uuid,
  parent_id uuid,
  level smallint,
  account_status text,
  joined_at timestamptz,
  commission numeric,
  member_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    ), 0) AS commission,
    COALESCE(NULLIF(trim(p.full_name), ''), 'ASH Member') AS member_name,
    p.avatar_url
  FROM tree t
  JOIN public.profiles p ON p.user_id = t.user_id;
$$;