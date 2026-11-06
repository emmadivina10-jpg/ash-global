-- Dedicated business follow relationships. Members follow business accounts;
-- this is separate from friendships and from fx_instructor_follows.
-- NOT applied to production. Review and apply through the approved migration flow.
CREATE TABLE IF NOT EXISTS public.business_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, business_user_id),
  CHECK (follower_id <> business_user_id)
);

CREATE INDEX IF NOT EXISTS business_follows_business_idx ON public.business_follows (business_user_id);

ALTER TABLE public.business_follows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_follows FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.business_follows TO authenticated;
GRANT ALL ON public.business_follows TO service_role;

-- Members see only their own follows; no public follower lists are exposed.
CREATE POLICY business_follows_read_own ON public.business_follows
  FOR SELECT TO authenticated
  USING (follower_id = auth.uid());

CREATE POLICY business_follows_insert_own ON public.business_follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid() AND safety.identity_access_allowed(auth.uid()));

CREATE POLICY business_follows_delete_own ON public.business_follows
  FOR DELETE TO authenticated
  USING (follower_id = auth.uid());
