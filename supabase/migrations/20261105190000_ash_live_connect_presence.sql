ALTER TABLE public.member_presence
  ADD COLUMN IF NOT EXISTS show_online boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vendor_discovery_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.activity_events
  DROP CONSTRAINT IF EXISTS activity_events_surface_ck;
ALTER TABLE public.activity_events
  ADD CONSTRAINT activity_events_surface_ck CHECK (surface IN (
    'feed', 'stories', 'spotlight', 'services', 'marketplace', 'search', 'profile',
    'hashtag', 'jobs', 'property', 'events', 'deals', 'freelance', 'markets',
    'notifications', 'discover', 'messages', 'other'
  )) NOT VALID;

CREATE TABLE IF NOT EXISTS public.member_presence_sessions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS member_presence_sessions_recent_idx
  ON public.member_presence_sessions(last_seen_at DESC);

ALTER TABLE public.member_presence_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_presence_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_presence_sessions TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.member_presence FROM anon, authenticated;
GRANT SELECT ON public.member_presence TO anon, authenticated;

DROP POLICY IF EXISTS "Friends can view presence" ON public.member_presence;
CREATE POLICY "Friends can view presence"
  ON public.member_presence
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (show_online AND public.are_friends(auth.uid(), user_id))
  );

CREATE OR REPLACE FUNCTION app_private.is_public_live_vendor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.provider_profiles pp
    WHERE pp.user_id = _user_id
      AND pp.is_live = true
  );
$$;

GRANT USAGE ON SCHEMA app_private TO anon, authenticated;
REVOKE ALL ON FUNCTION app_private.is_public_live_vendor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.is_public_live_vendor(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public available vendor presence" ON public.member_presence;
CREATE POLICY "Public available vendor presence"
  ON public.member_presence
  FOR SELECT
  TO anon, authenticated
  USING (
    show_online
    AND vendor_discovery_enabled
    AND last_active_at >= now() - interval '2 minutes'
    AND app_private.is_public_live_vendor(member_presence.user_id)
  );

DROP POLICY IF EXISTS "Conversation partners can view presence" ON public.member_presence;
CREATE POLICY "Conversation partners can view presence"
  ON public.member_presence
  FOR SELECT
  TO authenticated
  USING (
    show_online
    AND safety.identity_access_allowed(auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE (c.owner_id = auth.uid() AND c.client_id = member_presence.user_id)
           OR (c.client_id = auth.uid() AND c.owner_id = member_presence.user_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.conversations c
        JOIN public.provider_profiles pp ON pp.id = c.provider_id
        WHERE (c.client_id = auth.uid() AND pp.user_id = member_presence.user_id)
           OR (pp.user_id = auth.uid() AND c.client_id = member_presence.user_id)
      )
    )
  );

CREATE OR REPLACE FUNCTION public.touch_member_presence(_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _effective_session_id uuid := COALESCE(_session_id, auth.uid());
  _accepted boolean;
BEGIN
  IF _user_id IS NULL OR _effective_session_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  INSERT INTO public.member_presence_sessions (user_id, session_id, last_seen_at)
  VALUES (_user_id, _effective_session_id, now())
  ON CONFLICT (user_id, session_id)
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at
  WHERE public.member_presence_sessions.last_seen_at <= now() - interval '15 seconds'
  RETURNING true INTO _accepted;

  IF NOT COALESCE(_accepted, false) THEN
    RETURN;
  END IF;

  INSERT INTO public.member_presence (user_id, last_active_at, updated_at)
  VALUES (_user_id, now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET last_active_at = EXCLUDED.last_active_at,
                updated_at = EXCLUDED.updated_at;

  DELETE FROM public.member_presence_sessions
  WHERE user_id = _user_id
    AND last_seen_at < now() - interval '1 day';

  DELETE FROM public.member_presence_sessions
  WHERE user_id = _user_id
    AND session_id NOT IN (
      SELECT s.session_id
      FROM public.member_presence_sessions s
      WHERE s.user_id = _user_id
      ORDER BY s.last_seen_at DESC
      LIMIT 8
    );
END;
$$;

REVOKE ALL ON FUNCTION public.touch_member_presence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_member_presence(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.touch_member_presence()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.touch_member_presence(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.touch_member_presence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_member_presence() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_live_connect_preferences(
  _show_online boolean,
  _vendor_discovery_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  INSERT INTO public.member_presence (
    user_id,
    last_active_at,
    updated_at,
    show_online,
    vendor_discovery_enabled
  )
  VALUES (
    _user_id,
    'epoch'::timestamptz,
    now(),
    COALESCE(_show_online, true),
    COALESCE(_show_online, true) AND COALESCE(_vendor_discovery_enabled, false)
  )
  ON CONFLICT (user_id)
  DO UPDATE SET show_online = COALESCE(_show_online, true),
                vendor_discovery_enabled =
                  COALESCE(_show_online, true) AND COALESCE(_vendor_discovery_enabled, false),
                updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_live_connect_preferences(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_live_connect_preferences(boolean, boolean)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_live_connect_vendors(
  _country text DEFAULT NULL,
  _limit integer DEFAULT 60
)
RETURNS TABLE (
  provider_id uuid,
  business_name text,
  slug text,
  city text,
  avatar_url text,
  bio text,
  categories public.service_category[],
  is_verified boolean,
  rating_avg numeric,
  rating_count integer,
  accepting_bookings boolean,
  is_online boolean,
  last_active_at timestamptz,
  services jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    pp.id,
    pp.business_name,
    pp.slug,
    pp.city,
    pp.avatar_url,
    pp.bio,
    pp.categories,
    pp.is_verified,
    pp.rating_avg,
    pp.rating_count,
    pp.accepting_bookings,
    COALESCE(
      mp.show_online
      AND mp.vendor_discovery_enabled
      AND EXISTS (
        SELECT 1
        FROM public.member_presence_sessions s
        WHERE s.user_id = pp.user_id
          AND s.last_seen_at >= now() - interval '2 minutes'
      ),
      false
    ) AS is_online,
    CASE
      WHEN mp.show_online AND mp.vendor_discovery_enabled THEN (
        SELECT max(s.last_seen_at)
        FROM public.member_presence_sessions s
        WHERE s.user_id = pp.user_id
          AND s.last_seen_at >= now() - interval '2 minutes'
      )
      ELSE NULL
    END AS last_active_at,
    COALESCE(service_rows.services, '[]'::jsonb)
  FROM public.provider_profiles pp
  LEFT JOIN public.member_presence mp ON mp.user_id = pp.user_id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', recent.id,
        'title', recent.title,
        'price', recent.price,
        'category', recent.category
      )
      ORDER BY recent.created_at DESC
    ) AS services
    FROM (
      SELECT ps.id, ps.title, ps.price, ps.category, ps.created_at
      FROM public.provider_services ps
      WHERE ps.provider_id = pp.id
        AND ps.is_active = true
      ORDER BY ps.created_at DESC
      LIMIT 3
    ) recent
  ) service_rows ON true
  WHERE pp.is_live = true
    AND (_country IS NULL OR pp.country = _country)
  ORDER BY
    COALESCE(
      mp.show_online
      AND mp.vendor_discovery_enabled
      AND EXISTS (
        SELECT 1
        FROM public.member_presence_sessions s
        WHERE s.user_id = pp.user_id
          AND s.last_seen_at >= now() - interval '2 minutes'
      ),
      false
    ) DESC,
    pp.rating_avg DESC NULLS LAST,
    pp.rating_count DESC NULLS LAST,
    pp.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 60), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.list_live_connect_vendors(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_live_connect_vendors(text, integer) TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'member_presence'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.member_presence';
  END IF;
END
$$;
