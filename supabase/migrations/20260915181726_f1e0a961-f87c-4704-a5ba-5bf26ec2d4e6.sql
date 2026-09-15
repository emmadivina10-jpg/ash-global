ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS city text;

CREATE INDEX IF NOT EXISTS profiles_birthday_idx ON public.profiles (birthday) WHERE birthday IS NOT NULL;