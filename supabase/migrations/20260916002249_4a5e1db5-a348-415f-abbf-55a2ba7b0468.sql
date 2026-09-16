CREATE TABLE IF NOT EXISTS public.conversation_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  pinned boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, conversation_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_prefs TO authenticated;
GRANT ALL ON public.conversation_prefs TO service_role;

ALTER TABLE public.conversation_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their own chat preferences"
ON public.conversation_prefs
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER conversation_prefs_touch
BEFORE UPDATE ON public.conversation_prefs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS conversation_prefs_user_idx
ON public.conversation_prefs (user_id);

ALTER TABLE public.chat_settings
ADD COLUMN IF NOT EXISTS lock_pin text;