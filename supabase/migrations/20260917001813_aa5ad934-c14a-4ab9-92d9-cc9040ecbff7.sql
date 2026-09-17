CREATE OR REPLACE FUNCTION public.sync_social_tokens_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE body_text text;
BEGIN
  IF TG_ARGV[0] = 'comment' THEN
    body_text := NEW.body;
  ELSE
    body_text := NEW.caption;
  END IF;
  PERFORM public.extract_social_tokens(TG_ARGV[0], NEW.id, body_text, NEW.author_id);
  RETURN NULL;
END $function$;