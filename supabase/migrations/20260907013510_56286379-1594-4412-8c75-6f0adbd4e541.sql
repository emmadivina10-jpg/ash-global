CREATE OR REPLACE FUNCTION public.provider_zone(_country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE upper(trim(coalesce(_country,'')))
    WHEN 'CM' THEN 'Africa/Douala'
    WHEN 'NG' THEN 'Africa/Lagos'
    WHEN 'CI' THEN 'Africa/Abidjan'
    WHEN 'SN' THEN 'Africa/Dakar'
    WHEN 'GA' THEN 'Africa/Libreville'
    WHEN 'GH' THEN 'Africa/Accra'
    WHEN 'TG' THEN 'Africa/Lome'
    WHEN 'BJ' THEN 'Africa/Porto-Novo'
    WHEN 'BF' THEN 'Africa/Ouagadougou'
    WHEN 'ML' THEN 'Africa/Bamako'
    WHEN 'TD' THEN 'Africa/Ndjamena'
    WHEN 'CF' THEN 'Africa/Bangui'
    WHEN 'CG' THEN 'Africa/Brazzaville'
    WHEN 'CD' THEN 'Africa/Kinshasa'
    WHEN 'KE' THEN 'Africa/Nairobi'
    WHEN 'RW' THEN 'Africa/Kigali'
    WHEN 'ZA' THEN 'Africa/Johannesburg'
    WHEN 'MA' THEN 'Africa/Casablanca'
    WHEN 'EG' THEN 'Africa/Cairo'
    WHEN 'FR' THEN 'Europe/Paris'
    WHEN 'BE' THEN 'Europe/Brussels'
    WHEN 'GB' THEN 'Europe/London'
    WHEN 'US' THEN 'America/New_York'
    WHEN 'CA' THEN 'America/Toronto'
    ELSE 'Africa/Douala'
  END;
$$;

REVOKE ALL ON FUNCTION public.provider_zone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_zone(text) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.provider_slots(_provider_id uuid, _date date, _duration integer DEFAULT 60)
 RETURNS timestamp with time zone[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prov RECORD;
  win RECORD;
  cursor_min integer;
  step integer;
  slot_ts timestamptz;
  zone text;
  out_slots timestamptz[] := '{}';
  dur integer := greatest(15, least(480, coalesce(_duration, 60)));
BEGIN
  SELECT id, is_live, accepting_bookings, slot_minutes, booking_lead_hours, country INTO prov
    FROM public.provider_profiles WHERE id = _provider_id;
  IF prov.id IS NULL OR NOT prov.is_live OR NOT prov.accepting_bookings THEN RETURN out_slots; END IF;
  step := greatest(15, coalesce(prov.slot_minutes, 30));
  zone := public.provider_zone(prov.country);

  FOR win IN
    SELECT start_minute, end_minute FROM public.provider_availability
     WHERE provider_id = _provider_id AND weekday = extract(dow from _date)::int
     ORDER BY start_minute
  LOOP
    cursor_min := win.start_minute;
    WHILE cursor_min + dur <= win.end_minute LOOP
      slot_ts := (_date::timestamp + make_interval(mins => cursor_min)) AT TIME ZONE zone;
      IF slot_ts > now() + make_interval(hours => coalesce(prov.booking_lead_hours, 2))
         AND NOT EXISTS (
            SELECT 1 FROM public.bookings b
             WHERE b.provider_id = _provider_id
               AND b.status::text NOT IN ('CANCELLED','DECLINED','EXPIRED','PAYMENT_FAILED')
               AND b.scheduled_at < slot_ts + make_interval(mins => dur)
               AND b.scheduled_at + make_interval(mins => dur) > slot_ts)
      THEN
        out_slots := out_slots || slot_ts;
      END IF;
      cursor_min := cursor_min + step;
    END LOOP;
  END LOOP;

  RETURN out_slots;
END $function$;