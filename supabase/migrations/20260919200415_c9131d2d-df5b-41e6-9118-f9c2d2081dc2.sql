DROP VIEW IF EXISTS public.profiles_public;

CREATE TABLE IF NOT EXISTS public.public_profiles (
  user_id uuid PRIMARY KEY,
  full_name text,
  username text,
  avatar_url text,
  verified_tier text,
  verified_until timestamptz,
  birthday date,
  city text,
  account_status text,
  created_at timestamptz
);

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read the public directory" ON public.public_profiles;
CREATE POLICY "Members read the public directory"
  ON public.public_profiles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  INSERT INTO public.public_profiles (user_id, full_name, username, avatar_url, verified_tier, verified_until, birthday, city, account_status, created_at)
  VALUES (NEW.user_id, NEW.full_name, NEW.username, NEW.avatar_url, NEW.verified_tier, NEW.verified_until, NEW.birthday, NEW.city, NEW.account_status, NEW.created_at)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    verified_tier = EXCLUDED.verified_tier,
    verified_until = EXCLUDED.verified_until,
    birthday = EXCLUDED.birthday,
    city = EXCLUDED.city,
    account_status = EXCLUDED.account_status,
    created_at = EXCLUDED.created_at;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_public_profile() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS sync_public_profile_trg ON public.profiles;
CREATE TRIGGER sync_public_profile_trg
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

INSERT INTO public.public_profiles (user_id, full_name, username, avatar_url, verified_tier, verified_until, birthday, city, account_status, created_at)
SELECT user_id, full_name, username, avatar_url, verified_tier, verified_until, birthday, city, account_status, created_at FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS public_profiles_full_name_idx ON public.public_profiles (lower(full_name));