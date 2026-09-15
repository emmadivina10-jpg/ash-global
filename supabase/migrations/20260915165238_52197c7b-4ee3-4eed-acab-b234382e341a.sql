ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS allow_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS block_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_audience_check;
ALTER TABLE public.stories ADD CONSTRAINT stories_audience_check CHECK (audience IN ('ALL','SELECT'));

DROP POLICY IF EXISTS "stories readable while live" ON public.stories;
CREATE POLICY "stories readable while live" ON public.stories
FOR SELECT
USING (
  author_id = auth.uid()
  OR (
    expires_at > now()
    AND (
      (audience = 'ALL' AND NOT (auth.uid() = ANY (block_ids)))
      OR (audience = 'SELECT' AND auth.uid() = ANY (allow_ids))
    )
  )
);