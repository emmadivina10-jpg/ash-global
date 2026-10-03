ALTER TABLE public.property_listings ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'APPROVED' CHECK (moderation_status IN ('PENDING','APPROVED','FLAGGED','REMOVED'));
ALTER TABLE public.provider_profiles ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'APPROVED' CHECK (moderation_status IN ('PENDING','APPROVED','FLAGGED','REMOVED'));

CREATE OR REPLACE FUNCTION safety.guard_moderation_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN NEW.moderation_status := 'APPROVED';
  ELSE NEW.moderation_status := OLD.moderation_status; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER guard_moderation_status BEFORE INSERT OR UPDATE ON public.property_listings FOR EACH ROW EXECUTE FUNCTION safety.guard_moderation_status();
CREATE TRIGGER guard_moderation_status BEFORE INSERT OR UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION safety.guard_moderation_status();

CREATE OR REPLACE FUNCTION safety.provider_not_removed(_provider_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = _provider_id
    AND (p.moderation_status <> 'REMOVED' OR p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));
$$;

CREATE POLICY "moderation removed hidden" ON public.property_listings AS RESTRICTIVE FOR SELECT
  USING (moderation_status <> 'REMOVED' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "moderation removed hidden" ON public.provider_profiles AS RESTRICTIVE FOR SELECT
  USING (moderation_status <> 'REMOVED' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "moderation removed hidden" ON public.provider_services AS RESTRICTIVE FOR SELECT
  USING (safety.provider_not_removed(provider_id));