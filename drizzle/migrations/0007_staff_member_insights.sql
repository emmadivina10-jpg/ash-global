-- Additive staff insights only. Does not modify financial records, Stripe controls or existing policies.
CREATE TABLE public.member_metric_exclusions (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
 reason text NOT NULL CHECK (reason IN ('DUPLICATE','AUTOMATED')),
 reviewed_by text NOT NULL, reviewed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.member_metric_exclusions TO service_role;
REVOKE ALL ON public.member_metric_exclusions FROM anon, authenticated;
ALTER TABLE public.member_metric_exclusions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_member_ai_threads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
 staff_scope text NOT NULL, messages jsonb NOT NULL DEFAULT '[]'::jsonb,
 version integer NOT NULL DEFAULT 0, busy_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(member_id,staff_scope)
);
GRANT ALL ON public.staff_member_ai_threads TO service_role;
REVOKE ALL ON public.staff_member_ai_threads FROM anon,authenticated;
ALTER TABLE public.staff_member_ai_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_ai_access_blocks (
 scope text PRIMARY KEY, status integer NOT NULL, message text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_ai_access_blocks TO service_role;
REVOKE ALL ON public.staff_ai_access_blocks FROM anon,authenticated;
ALTER TABLE public.staff_ai_access_blocks ENABLE ROW LEVEL SECURITY;

CREATE INDEX member_activity_metrics_idx ON public.activity_events(created_at,user_id);
CREATE OR REPLACE FUNCTION public.staff_member_metrics_v1() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH qualified AS (
  SELECT user_id,created_at FROM activity_events
  WHERE created_at >= now()-interval '30 days' AND created_at <= now()
    AND (event_type IN ('story_view','spotlight_view','service_view','provider_view','product_view','listing_view','booking','comment','reply','repost','share','story_reaction','spotlight_reaction','reaction','like','save','follow')
      OR (event_type='view' AND coalesce(dwell_ms,0)>=1500))
  UNION ALL SELECT sender_id,created_at FROM messages WHERE created_at>=now()-interval '30 days' AND created_at<=now()
  UNION ALL SELECT author_id,created_at FROM social_posts WHERE created_at>=now()-interval '30 days' AND created_at<=now()
  UNION ALL SELECT client_id,created_at FROM bookings WHERE created_at>=now()-interval '30 days' AND created_at<=now()
  UNION ALL SELECT referrer_id,created_at FROM referrals WHERE created_at>=now()-interval '30 days' AND created_at<=now()
  UNION ALL SELECT user_id,created_at FROM transactions WHERE created_at>=now()-interval '30 days' AND created_at<=now() AND status='COMPLETED'
 ), eligible AS (
  SELECT DISTINCT p.user_id FROM profiles p JOIN qualified q ON q.user_id=p.user_id
  WHERE NOT EXISTS (SELECT 1 FROM member_metric_exclusions e WHERE e.user_id=p.user_id)
 ), daily AS (
  SELECT d::date AS day, count(p.user_id) AS registrations
  FROM generate_series((now() AT TIME ZONE 'UTC')::date-29,(now() AT TIME ZONE 'UTC')::date,interval '1 day') d
  LEFT JOIN profiles p ON (p.created_at AT TIME ZONE 'UTC')::date=d::date GROUP BY d
 )
 SELECT jsonb_build_object(
  'total', (SELECT count(DISTINCT user_id) FROM profiles),
  'joinedToday',(SELECT count(*) FROM profiles WHERE created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),
  'active30d',(SELECT count(*) FROM eligible),
  'excluded',(SELECT count(*) FROM member_metric_exclusions),
  'daily',(SELECT jsonb_agg(jsonb_build_object('day',day,'registrations',registrations) ORDER BY day) FROM daily),
  'asOf',now(), 'quality','Recorded qualifying activity; known reviewed duplicate/automated accounts excluded. Unidentified duplicates and automation remain unverified. Activity-history opt-outs can undercount viewing.'
 )
 WHERE current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role';
$$;
REVOKE ALL ON FUNCTION public.staff_member_metrics_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_member_metrics_v1() TO service_role;

-- Atomically claim a per-staff/member chat; versioned finish prevents concurrent overwrites.
CREATE OR REPLACE FUNCTION public.claim_staff_member_ai_v1(_id uuid,_scope text,_version integer)
RETURNS SETOF public.staff_member_ai_threads LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE staff_member_ai_threads SET busy_until=now()+interval '15 minutes',version=version+1
 WHERE id=_id AND staff_scope=_scope AND version=_version AND (busy_until IS NULL OR busy_until<now())
 AND current_setting('request.jwt.claims',true)::jsonb->>'role'='service_role' RETURNING *;
$$;
CREATE OR REPLACE FUNCTION public.finish_staff_member_ai_v1(_id uuid,_scope text,_version integer,_messages jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF coalesce(current_setting('request.jwt.claims',true)::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 UPDATE staff_member_ai_threads SET messages=_messages,version=version+1,busy_until=NULL,updated_at=now()
 WHERE id=_id AND staff_scope=_scope AND version=_version;
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.claim_staff_member_ai_v1(uuid,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_staff_member_ai_v1(uuid,text,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_staff_member_ai_v1(uuid,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_staff_member_ai_v1(uuid,text,integer,jsonb) TO service_role;