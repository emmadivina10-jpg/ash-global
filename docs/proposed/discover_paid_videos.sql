-- PROPOSED ONLY — not applied. Paid Discover videos, purchases and star reviews.
-- Purchases are written only by the server after a settled MTN / Orange Money payment.

CREATE TABLE public.discover_videos (
  post_id uuid PRIMARY KEY REFERENCES public.social_posts(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL,
  price_xaf integer NOT NULL DEFAULT 0 CHECK (price_xaf = 0 OR price_xaf >= 100),
  preview_seconds integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.discover_videos TO authenticated;
GRANT SELECT ON public.discover_videos TO anon;
GRANT ALL ON public.discover_videos TO service_role;
ALTER TABLE public.discover_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos readable" ON public.discover_videos FOR SELECT USING (true);
CREATE POLICY "instructor manages own" ON public.discover_videos FOR ALL TO authenticated
  USING (instructor_id = auth.uid()) WITH CHECK (instructor_id = auth.uid());

CREATE TABLE public.video_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.discover_videos(post_id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL,
  payment_transaction_id uuid NOT NULL UNIQUE,
  amount_xaf integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, buyer_id)
);
GRANT SELECT ON public.video_purchases TO authenticated;
GRANT ALL ON public.video_purchases TO service_role;
ALTER TABLE public.video_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer reads own" ON public.video_purchases FOR SELECT TO authenticated USING (buyer_id = auth.uid());

CREATE TABLE public.video_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.discover_videos(post_id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reviewer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_reviews TO authenticated;
GRANT SELECT ON public.video_reviews TO anon;
GRANT ALL ON public.video_reviews TO service_role;
ALTER TABLE public.video_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews readable" ON public.video_reviews FOR SELECT USING (true);
CREATE POLICY "reviewer writes own" ON public.video_reviews FOR ALL TO authenticated
  USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());

-- Rollback: DROP TABLE public.video_reviews, public.video_purchases, public.discover_videos;
