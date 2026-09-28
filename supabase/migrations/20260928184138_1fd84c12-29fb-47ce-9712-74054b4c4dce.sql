DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('post_likes','likes readable','user_id'),
    ('comment_likes','comment_likes_read','user_id'),
    ('post_reposts','reposts readable','user_id'),
    ('forum_posts','forum_posts_read','author_id'),
    ('forum_comments','forum_comments_read','author_id'),
    ('forum_likes','forum_likes_read','user_id'),
    ('article_likes','article_likes_read','user_id'),
    ('fx_instructor_follows','Members read FX instructor follows','follower_id')
  ) AS t(tbl,pol,col) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid() OR NOT public.is_blocked_pair(auth.uid(), %I))', r.pol, r.tbl, r.col, r.col);
  END LOOP;
END $$;