CREATE TABLE public.spotlight_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotlight_id uuid NOT NULL REFERENCES public.spotlight_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX spotlight_comments_spotlight_idx ON public.spotlight_comments (spotlight_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.spotlight_comments TO authenticated;
GRANT ALL ON public.spotlight_comments TO service_role;
ALTER TABLE public.spotlight_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read comments on live spotlights" ON public.spotlight_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.spotlight_posts s WHERE s.id = spotlight_id AND s.is_published AND s.created_at > now() - interval '30 days'));
CREATE POLICY "Comment on live spotlights" ON public.spotlight_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.spotlight_posts s WHERE s.id = spotlight_id AND s.is_published AND s.created_at > now() - interval '30 days'));
CREATE POLICY "Delete own comments" ON public.spotlight_comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id);