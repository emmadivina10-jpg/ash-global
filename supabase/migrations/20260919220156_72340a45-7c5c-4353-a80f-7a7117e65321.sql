-- ============================================================
-- ASH Glo — Phase 1: Activity Intelligence + Recommendation Foundation
-- Additive only. No existing table, function or policy is modified.
-- ============================================================

-- ---------- 1. Member personalization preferences ----------
CREATE TABLE public.recommendation_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  personalization_enabled boolean NOT NULL DEFAULT true,
  use_location boolean NOT NULL DEFAULT false,
  use_activity_history boolean NOT NULL DEFAULT true,
  history_cleared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.recommendation_prefs TO authenticated;
GRANT ALL ON public.recommendation_prefs TO service_role;
ALTER TABLE public.recommendation_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own prefs read" ON public.recommendation_prefs
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own prefs insert" ON public.recommendation_prefs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own prefs update" ON public.recommendation_prefs
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------- 2. Activity events ----------
CREATE TABLE public.activity_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  surface text NOT NULL,
  target_type text,
  target_id uuid,
  author_id uuid,
  category text,
  hashtags text[],
  city text,
  country text,
  dwell_ms integer,
  weight numeric(6,2) NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_events_type_ck CHECK (event_type IN (
    'impression','view','click','dwell',
    'like','reaction','comment','reply','repost','save','share','unsave','unlike',
    'story_view','story_reaction','spotlight_view','spotlight_reaction',
    'search','profile_view','provider_view','service_view','category_view',
    'product_view','listing_view','booking','follow','friend_request','hashtag_view','hide','report'
  )),
  CONSTRAINT activity_events_surface_ck CHECK (surface IN (
    'feed','stories','spotlight','services','marketplace','search','profile',
    'hashtag','jobs','property','events','deals','freelance','markets','notifications','other'
  )),
  CONSTRAINT activity_events_dwell_ck CHECK (dwell_ms IS NULL OR (dwell_ms >= 0 AND dwell_ms <= 600000)),
  CONSTRAINT activity_events_weight_ck CHECK (weight >= 0 AND weight <= 25),
  CONSTRAINT activity_events_category_ck CHECK (category IS NULL OR length(category) <= 64),
  CONSTRAINT activity_events_hashtags_ck CHECK (hashtags IS NULL OR array_length(hashtags, 1) <= 12),
  CONSTRAINT activity_events_metadata_ck CHECK (pg_column_size(metadata) <= 2048)
);

GRANT SELECT, INSERT, DELETE ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Members only ever touch their own rows. No cross-member reads at all.
CREATE POLICY "own activity read" ON public.activity_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own activity insert" ON public.activity_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own activity delete" ON public.activity_events
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read activity" ON public.activity_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX activity_events_user_time_idx ON public.activity_events (user_id, created_at DESC);
CREATE INDEX activity_events_user_type_idx ON public.activity_events (user_id, event_type, created_at DESC);
CREATE INDEX activity_events_target_idx ON public.activity_events (target_type, target_id, created_at DESC);
CREATE INDEX activity_events_author_idx ON public.activity_events (author_id, created_at DESC) WHERE author_id IS NOT NULL;
CREATE INDEX activity_events_category_idx ON public.activity_events (category, created_at DESC) WHERE category IS NOT NULL;
CREATE INDEX activity_events_hashtags_idx ON public.activity_events USING gin (hashtags);
CREATE INDEX activity_events_created_idx ON public.activity_events (created_at DESC);

-- ---------- 3. Interest signals ----------
CREATE TABLE public.user_interest_signals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  signal_key text NOT NULL,
  score numeric(12,4) NOT NULL DEFAULT 0,
  event_count integer NOT NULL DEFAULT 0,
  last_event_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, signal_type, signal_key),
  CONSTRAINT interest_signal_type_ck CHECK (signal_type IN (
    'category','hashtag','creator','provider','city','country','content_type','surface','community'
  ))
);

GRANT SELECT ON public.user_interest_signals TO authenticated;
GRANT ALL ON public.user_interest_signals TO service_role;
ALTER TABLE public.user_interest_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own interests read" ON public.user_interest_signals
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX user_interest_signals_lookup_idx
  ON public.user_interest_signals (user_id, signal_type, score DESC);

-- ---------- 4. Content popularity / quality cache ----------
CREATE TABLE public.content_popularity (
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  author_id uuid,
  category text,
  city text,
  country text,
  engagement_score numeric(12,4) NOT NULL DEFAULT 0,
  quality_score numeric(12,4) NOT NULL DEFAULT 0,
  freshness_hours numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_type, content_id),
  CONSTRAINT content_popularity_type_ck CHECK (content_type IN ('post','spotlight','provider','story'))
);

GRANT SELECT ON public.content_popularity TO authenticated;
GRANT ALL ON public.content_popularity TO service_role;
ALTER TABLE public.content_popularity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "popularity readable by members" ON public.content_popularity
  FOR SELECT TO authenticated USING (true);

CREATE INDEX content_popularity_rank_idx
  ON public.content_popularity (content_type, quality_score DESC, created_at DESC);
CREATE INDEX content_popularity_author_idx ON public.content_popularity (author_id);

-- ---------- 5. Weight table for event types ----------
CREATE OR REPLACE FUNCTION public.activity_event_weight(_event_type text, _dwell_ms integer DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT LEAST(25, CASE _event_type
    WHEN 'impression' THEN 0.2
    WHEN 'view' THEN 0.5
    WHEN 'story_view' THEN 0.6
    WHEN 'spotlight_view' THEN 0.6
    WHEN 'hashtag_view' THEN 1.0
    WHEN 'category_view' THEN 1.0
    WHEN 'click' THEN 1.5
    WHEN 'search' THEN 1.5
    WHEN 'profile_view' THEN 1.5
    WHEN 'product_view' THEN 2.0
    WHEN 'listing_view' THEN 2.0
    WHEN 'service_view' THEN 2.0
    WHEN 'provider_view' THEN 2.0
    WHEN 'like' THEN 3.0
    WHEN 'reaction' THEN 3.0
    WHEN 'story_reaction' THEN 3.0
    WHEN 'spotlight_reaction' THEN 3.0
    WHEN 'share' THEN 4.0
    WHEN 'save' THEN 4.0
    WHEN 'repost' THEN 4.0
    WHEN 'comment' THEN 4.0
    WHEN 'reply' THEN 3.5
    WHEN 'follow' THEN 5.0
    WHEN 'friend_request' THEN 4.0
    WHEN 'booking' THEN 8.0
    WHEN 'hide' THEN 0
    WHEN 'report' THEN 0
    WHEN 'unlike' THEN 0
    WHEN 'unsave' THEN 0
    WHEN 'dwell' THEN 0
    ELSE 1.0
  END + CASE
    WHEN _dwell_ms IS NULL THEN 0
    -- meaningful viewing time only: capped, sub-linear
    ELSE LEAST(3.0, (_dwell_ms::numeric / 1000.0) * 0.1)
  END);
$$;

-- Negative feedback (hide/report/unlike/unsave) must subtract, not add.
CREATE OR REPLACE FUNCTION public.activity_event_direction(_event_type text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN _event_type IN ('hide','report','unlike','unsave') THEN -1 ELSE 1 END::numeric;
$$;

-- ---------- 6. Event logging (server-validated, never trusts client weights) ----------
CREATE OR REPLACE FUNCTION public.log_activity_events(_events jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _enabled boolean;
  _use_location boolean;
  _inserted integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF jsonb_typeof(_events) <> 'array' OR jsonb_array_length(_events) = 0 THEN
    RETURN 0;
  END IF;
  IF jsonb_array_length(_events) > 50 THEN
    RAISE EXCEPTION 'Too many events in one batch';
  END IF;

  SELECT p.personalization_enabled AND p.use_activity_history, p.use_location
    INTO _enabled, _use_location
  FROM public.recommendation_prefs p WHERE p.user_id = _uid;

  -- No preference row yet = default on.
  _enabled := COALESCE(_enabled, true);
  _use_location := COALESCE(_use_location, false);

  IF NOT _enabled THEN
    RETURN 0;
  END IF;

  INSERT INTO public.activity_events (
    user_id, event_type, surface, target_type, target_id, author_id,
    category, hashtags, city, country, dwell_ms, weight, metadata
  )
  SELECT
    _uid,
    e.event_type,
    e.surface,
    NULLIF(left(e.target_type, 32), ''),
    e.target_id,
    e.author_id,
    NULLIF(left(e.category, 64), ''),
    CASE WHEN e.hashtags IS NULL THEN NULL ELSE e.hashtags[1:12] END,
    -- Coarse location is stored only with explicit permission.
    CASE WHEN _use_location THEN NULLIF(left(e.city, 64), '') ELSE NULL END,
    CASE WHEN _use_location THEN NULLIF(left(e.country, 2), '') ELSE NULL END,
    NULLIF(LEAST(GREATEST(COALESCE(e.dwell_ms, 0), 0), 600000), 0),
    public.activity_event_weight(e.event_type, e.dwell_ms),
    COALESCE(e.metadata, '{}'::jsonb)
  FROM jsonb_to_recordset(_events) AS e(
    event_type text, surface text, target_type text, target_id uuid, author_id uuid,
    category text, hashtags text[], city text, country text, dwell_ms integer, metadata jsonb
  )
  WHERE e.event_type IS NOT NULL AND e.surface IS NOT NULL;

  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_activity_events(jsonb) TO authenticated;

-- ---------- 7. Interest refresh with time decay ----------
CREATE OR REPLACE FUNCTION public.refresh_user_interests(_user_id uuid DEFAULT NULL, _days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := COALESCE(_user_id, auth.uid());
  _rows integer := 0;
  _half_life numeric := 14.0; -- days
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No user';
  END IF;
  -- Callers may only refresh their own interests unless they are admin or the scheduler.
  IF auth.uid() IS NOT NULL AND _uid <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH decayed AS (
    SELECT
      e.event_type, e.category, e.hashtags, e.author_id, e.city, e.country,
      e.target_type, e.surface, e.created_at,
      e.weight
        * public.activity_event_direction(e.event_type)
        * power(0.5, EXTRACT(EPOCH FROM (now() - e.created_at)) / 86400.0 / _half_life) AS w
    FROM public.activity_events e
    WHERE e.user_id = _uid
      AND e.created_at > now() - make_interval(days => GREATEST(_days, 1))
  ),
  signals AS (
    SELECT 'category'::text AS signal_type, category AS signal_key, w, created_at
      FROM decayed WHERE category IS NOT NULL
    UNION ALL
    SELECT 'hashtag', lower(tag), w, created_at
      FROM decayed, unnest(COALESCE(hashtags, '{}')) AS tag WHERE tag <> ''
    UNION ALL
    SELECT 'creator', author_id::text, w, created_at
      FROM decayed WHERE author_id IS NOT NULL
    UNION ALL
    SELECT 'city', lower(city), w, created_at FROM decayed WHERE city IS NOT NULL
    UNION ALL
    SELECT 'country', upper(country), w, created_at FROM decayed WHERE country IS NOT NULL
    UNION ALL
    SELECT 'content_type', target_type, w, created_at FROM decayed WHERE target_type IS NOT NULL
    UNION ALL
    SELECT 'surface', surface, w, created_at FROM decayed WHERE surface IS NOT NULL
  ),
  rolled AS (
    SELECT signal_type, left(signal_key, 128) AS signal_key,
           round(sum(w)::numeric, 4) AS score,
           count(*)::int AS event_count,
           max(created_at) AS last_event_at
    FROM signals
    WHERE signal_key IS NOT NULL AND signal_key <> ''
    GROUP BY 1, 2
  )
  INSERT INTO public.user_interest_signals (user_id, signal_type, signal_key, score, event_count, last_event_at, updated_at)
  SELECT _uid, signal_type, signal_key, score, event_count, last_event_at, now()
  FROM rolled
  ON CONFLICT (user_id, signal_type, signal_key) DO UPDATE
    SET score = EXCLUDED.score,
        event_count = EXCLUDED.event_count,
        last_event_at = EXCLUDED.last_event_at,
        updated_at = now();

  GET DIAGNOSTICS _rows = ROW_COUNT;

  -- Drop signals that decayed away or were cleared.
  DELETE FROM public.user_interest_signals s
  WHERE s.user_id = _uid AND (s.updated_at < now() - interval '1 minute' OR s.score <= 0.05);

  RETURN _rows;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_user_interests(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.refresh_user_interests(uuid, integer) TO authenticated, service_role;

-- Scheduler entry point: refresh only members who were active recently.
CREATE OR REPLACE FUNCTION public.refresh_active_user_interests(_since_minutes integer DEFAULT 45)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; _n integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id FROM public.activity_events
    WHERE created_at > now() - make_interval(mins => GREATEST(_since_minutes, 1))
    LIMIT 2000
  LOOP
    PERFORM public.refresh_user_interests(r.user_id, 90);
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_active_user_interests(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.refresh_active_user_interests(integer) TO service_role;

-- ---------- 8. Content popularity refresh ----------
CREATE OR REPLACE FUNCTION public.refresh_content_popularity()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n integer := 0;
BEGIN
  INSERT INTO public.content_popularity (
    content_type, content_id, author_id, category, city, country,
    engagement_score, quality_score, freshness_hours, created_at, refreshed_at
  )
  SELECT 'post', p.id, p.author_id, NULL, p.city, NULL,
         (COALESCE(p.like_count,0) * 2 + COALESCE(p.comment_count,0) * 3 + COALESCE(p.repost_count,0) * 4)::numeric,
         (COALESCE(p.like_count,0) * 2 + COALESCE(p.comment_count,0) * 3 + COALESCE(p.repost_count,0) * 4)::numeric
           - (EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0) * 1.5,
         EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0,
         p.created_at, now()
  FROM public.social_posts p
  WHERE p.created_at > now() - interval '30 days'
  ON CONFLICT (content_type, content_id) DO UPDATE
    SET engagement_score = EXCLUDED.engagement_score,
        quality_score = EXCLUDED.quality_score,
        freshness_hours = EXCLUDED.freshness_hours,
        author_id = EXCLUDED.author_id,
        city = EXCLUDED.city,
        refreshed_at = now();
  GET DIAGNOSTICS _n = ROW_COUNT;

  INSERT INTO public.content_popularity (
    content_type, content_id, author_id, category, city, country,
    engagement_score, quality_score, freshness_hours, created_at, refreshed_at
  )
  SELECT 'spotlight', s.id, s.author_id, NULL, NULL, NULL,
         COALESCE(rc.reactions, 0)::numeric * 2,
         COALESCE(rc.reactions, 0)::numeric * 2
           - (EXTRACT(EPOCH FROM (now() - s.created_at)) / 3600.0) * 1.5,
         EXTRACT(EPOCH FROM (now() - s.created_at)) / 3600.0,
         s.created_at, now()
  FROM public.spotlight_posts s
  LEFT JOIN (
    SELECT spotlight_id, count(*) AS reactions FROM public.spotlight_reactions GROUP BY spotlight_id
  ) rc ON rc.spotlight_id = s.id
  WHERE s.created_at > now() - interval '30 days'
  ON CONFLICT (content_type, content_id) DO UPDATE
    SET engagement_score = EXCLUDED.engagement_score,
        quality_score = EXCLUDED.quality_score,
        freshness_hours = EXCLUDED.freshness_hours,
        refreshed_at = now();

  INSERT INTO public.content_popularity (
    content_type, content_id, author_id, category, city, country,
    engagement_score, quality_score, freshness_hours, created_at, refreshed_at
  )
  SELECT 'provider', pr.id, pr.user_id,
         CASE WHEN array_length(pr.categories, 1) > 0 THEN pr.categories[1]::text ELSE NULL END,
         pr.city, pr.country,
         (COALESCE(pr.rating_avg,0) * 4 + COALESCE(pr.rating_count,0) * 0.5 + COALESCE(pr.completed_bookings,0))::numeric,
         (COALESCE(pr.rating_avg,0) * 4 + COALESCE(pr.rating_count,0) * 0.5 + COALESCE(pr.completed_bookings,0))::numeric,
         EXTRACT(EPOCH FROM (now() - pr.created_at)) / 3600.0,
         pr.created_at, now()
  FROM public.provider_profiles pr
  WHERE pr.is_live = true
  ON CONFLICT (content_type, content_id) DO UPDATE
    SET engagement_score = EXCLUDED.engagement_score,
        quality_score = EXCLUDED.quality_score,
        category = EXCLUDED.category,
        city = EXCLUDED.city,
        country = EXCLUDED.country,
        refreshed_at = now();

  DELETE FROM public.content_popularity
  WHERE content_type IN ('post','spotlight')
    AND created_at IS NOT NULL
    AND created_at < now() - interval '45 days';

  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_content_popularity() FROM public;
GRANT EXECUTE ON FUNCTION public.refresh_content_popularity() TO service_role;

-- ---------- 9. Reusable recommendation scoring layer ----------
-- Returns ranked candidates with the individual score components exposed so
-- Phase 2 surfaces can blend them. Does NOT replace social_feed.
CREATE OR REPLACE FUNCTION public.recommend_content(
  _content_type text DEFAULT 'post',
  _limit integer DEFAULT 30,
  _offset integer DEFAULT 0,
  _city text DEFAULT NULL,
  _category text DEFAULT NULL
)
RETURNS TABLE (
  content_id uuid,
  author_id uuid,
  category text,
  city text,
  personal_score double precision,
  closeness_score double precision,
  engagement_score double precision,
  freshness_score double precision,
  location_score double precision,
  quality_score double precision,
  seen_penalty double precision,
  diversity_penalty double precision,
  total_score double precision,
  cold_start boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _lim integer := LEAST(GREATEST(COALESCE(_limit, 30), 1), 60);
  _off integer := GREATEST(COALESCE(_offset, 0), 0);
  _signal_total numeric := 0;
  _personalize boolean := true;
  _cold boolean := true;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _content_type NOT IN ('post','spotlight','provider') THEN
    RAISE EXCEPTION 'Unsupported content type';
  END IF;

  SELECT COALESCE(p.personalization_enabled, true) INTO _personalize
  FROM public.recommendation_prefs p WHERE p.user_id = _uid;
  _personalize := COALESCE(_personalize, true);

  SELECT COALESCE(sum(s.score), 0) INTO _signal_total
  FROM public.user_interest_signals s WHERE s.user_id = _uid AND s.score > 0;

  -- Cold start: not enough behavioural data yet, or personalization is off.
  _cold := (NOT _personalize) OR _signal_total < 10;

  RETURN QUERY
  WITH prefs AS (
    SELECT COALESCE(p.use_location, false) AS use_location
    FROM public.recommendation_prefs p WHERE p.user_id = _uid
  ),
  friends AS (
    SELECT CASE WHEN f.requester_id = _uid THEN f.addressee_id ELSE f.requester_id END AS friend_id
    FROM public.friendships f
    WHERE f.status = 'ACCEPTED' AND (f.requester_id = _uid OR f.addressee_id = _uid)
  ),
  creator_affinity AS (
    SELECT signal_key, score FROM public.user_interest_signals
    WHERE user_id = _uid AND signal_type = 'creator'
  ),
  category_affinity AS (
    SELECT signal_key, score FROM public.user_interest_signals
    WHERE user_id = _uid AND signal_type = 'category'
  ),
  city_affinity AS (
    SELECT signal_key, score FROM public.user_interest_signals
    WHERE user_id = _uid AND signal_type = 'city'
  ),
  seen AS (
    SELECT e.target_id, count(*) AS times
    FROM public.activity_events e
    WHERE e.user_id = _uid
      AND e.target_id IS NOT NULL
      AND e.created_at > now() - interval '14 days'
    GROUP BY e.target_id
  ),
  base AS (
    SELECT
      cp.content_id, cp.author_id, cp.category, cp.city, cp.created_at,
      cp.engagement_score, cp.quality_score, cp.freshness_hours,
      COALESCE(
        CASE WHEN _cold THEN 0 ELSE
          COALESCE((SELECT ca.score FROM creator_affinity ca WHERE ca.signal_key = cp.author_id::text), 0) * 1.2
          + COALESCE((SELECT cat.score FROM category_affinity cat WHERE cat.signal_key = cp.category), 0)
        END, 0)::double precision AS personal_score,
      CASE WHEN cp.author_id IN (SELECT friend_id FROM friends) THEN 25.0 ELSE 0.0 END::double precision AS closeness_score,
      CASE
        WHEN _city IS NOT NULL AND lower(COALESCE(cp.city, '')) = lower(_city) THEN 12.0
        WHEN NOT _cold AND (SELECT use_location FROM prefs)
          THEN COALESCE((SELECT ci.score FROM city_affinity ci WHERE ci.signal_key = lower(COALESCE(cp.city, ''))), 0)::double precision
        ELSE 0.0
      END::double precision AS location_score,
      GREATEST(0, 40 - cp.freshness_hours * 1.5)::double precision AS freshness_score,
      COALESCE((SELECT LEAST(s.times, 6) * 6.0 FROM seen s WHERE s.target_id = cp.content_id), 0)::double precision AS seen_penalty
    FROM public.content_popularity cp
    WHERE cp.content_type = _content_type
      AND (_category IS NULL OR cp.category = _category)
      AND (cp.author_id IS NULL OR NOT public.is_blocked_pair(_uid, cp.author_id))
  ),
  diversified AS (
    SELECT b.*,
      -- diversity: repeat creators and repeat categories get progressively demoted
      ((row_number() OVER (PARTITION BY b.author_id ORDER BY
          b.personal_score + b.closeness_score + b.engagement_score + b.freshness_score
          + b.location_score - b.seen_penalty DESC) - 1) * 8.0
       + (row_number() OVER (PARTITION BY COALESCE(b.category, '~') ORDER BY
          b.personal_score + b.closeness_score + b.engagement_score + b.freshness_score
          + b.location_score - b.seen_penalty DESC) - 1) * 2.0)::double precision AS diversity_penalty
    FROM base b
  )
  SELECT
    d.content_id, d.author_id, d.category, d.city,
    d.personal_score, d.closeness_score,
    d.engagement_score::double precision,
    d.freshness_score, d.location_score,
    d.quality_score::double precision,
    d.seen_penalty, d.diversity_penalty,
    (d.personal_score + d.closeness_score + d.engagement_score::double precision
      + d.freshness_score + d.location_score - d.seen_penalty - d.diversity_penalty)::double precision AS total_score,
    _cold
  FROM diversified d
  ORDER BY 13 DESC, d.created_at DESC NULLS LAST
  LIMIT _lim OFFSET _off;
END;
$$;

REVOKE ALL ON FUNCTION public.recommend_content(text, integer, integer, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.recommend_content(text, integer, integer, text, text) TO authenticated;

-- ---------- 10. Member-facing privacy control ----------
CREATE OR REPLACE FUNCTION public.clear_my_activity_history()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.activity_events WHERE user_id = _uid;
  DELETE FROM public.user_interest_signals WHERE user_id = _uid;
  INSERT INTO public.recommendation_prefs (user_id, history_cleared_at)
  VALUES (_uid, now())
  ON CONFLICT (user_id) DO UPDATE SET history_cleared_at = now(), updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_my_activity_history() TO authenticated;

-- ---------- 11. Retention ----------
CREATE OR REPLACE FUNCTION public.purge_old_activity_events(_days integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  DELETE FROM public.activity_events
  WHERE created_at < now() - make_interval(days => GREATEST(_days, 30));
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_activity_events(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.purge_old_activity_events(integer) TO service_role;

-- updated_at trigger for prefs
CREATE OR REPLACE FUNCTION public.touch_recommendation_prefs()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

CREATE TRIGGER recommendation_prefs_touch
  BEFORE UPDATE ON public.recommendation_prefs
  FOR EACH ROW EXECUTE FUNCTION public.touch_recommendation_prefs();

-- ---------- 12. Scheduled processing ----------
SELECT cron.schedule('ash-refresh-interests', '7 * * * *',
  $cron$SELECT public.refresh_active_user_interests(45);$cron$);
SELECT cron.schedule('ash-refresh-content-popularity', '22 * * * *',
  $cron$SELECT public.refresh_content_popularity();$cron$);
SELECT cron.schedule('ash-purge-activity-events', '20 3 * * *',
  $cron$SELECT public.purge_old_activity_events(180);$cron$);

-- Prime the popularity cache once so Phase 2 has data immediately.
SELECT public.refresh_content_popularity();
