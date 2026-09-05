/**
 * Provider business timezones.
 *
 * Booking availability is stored as minutes-from-midnight in the provider's own
 * local time and expanded into UTC timestamps by `provider_slots()`. Rendering
 * those timestamps with the visitor's device clock is what made a 08:00–18:00
 * Douala day look like "03:00 – 13:00" to anyone travelling or living abroad,
 * so every booking time is formatted in the provider's zone instead.
 */
const ZONE_BY_COUNTRY: Record<string, string> = {
  CM: "Africa/Douala",
  NG: "Africa/Lagos",
  CI: "Africa/Abidjan",
  SN: "Africa/Dakar",
  GA: "Africa/Libreville",
  GH: "Africa/Accra",
  TG: "Africa/Lome",
  BJ: "Africa/Porto-Novo",
  BF: "Africa/Ouagadougou",
  ML: "Africa/Bamako",
  TD: "Africa/Ndjamena",
  CF: "Africa/Bangui",
  CG: "Africa/Brazzaville",
  CD: "Africa/Kinshasa",
  KE: "Africa/Nairobi",
  RW: "Africa/Kigali",
  ZA: "Africa/Johannesburg",
  MA: "Africa/Casablanca",
  EG: "Africa/Cairo",
  FR: "Europe/Paris",
  BE: "Europe/Brussels",
  GB: "Europe/London",
  US: "America/New_York",
  CA: "America/Toronto",
};

export const DEFAULT_PROVIDER_ZONE = "Africa/Douala";

/** IANA timezone a provider's published hours are expressed in. */
export function providerTimeZone(country: string | null | undefined): string {
  const code = String(country ?? "").trim().toUpperCase();
  return ZONE_BY_COUNTRY[code] ?? DEFAULT_PROVIDER_ZONE;
}

/** "9:00 AM" in the provider's own timezone. */
export function formatTimeInZone(iso: string, zone: string, lang: "en" | "fr" = "en"): string {
  return new Date(iso).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US", {
    hour: lang === "fr" ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: lang !== "fr",
    timeZone: zone,
  });
}

/** "Mon 3 Sep, 9:00 AM" in the provider's own timezone. */
export function formatDateTimeInZone(iso: string, zone: string, lang: "en" | "fr" = "en"): string {
  return new Date(iso).toLocaleString(lang === "fr" ? "fr-FR" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: lang === "fr" ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: lang !== "fr",
    timeZone: zone,
  });
}

/** Short zone label shown next to slot times, e.g. "GMT+1". */
export function zoneLabel(zone: string, lang: "en" | "fr" = "en"): string {
  try {
    const parts = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? zone;
  } catch {
    return zone;
  }
}

/** True when the visitor's device clock differs from the provider's zone. */
export function isDifferentZone(zone: string): boolean {
  try {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (local === zone) return false;
    const now = new Date();
    const a = now.toLocaleString("en-US", { timeZone: zone });
    const b = now.toLocaleString("en-US", { timeZone: local });
    return a !== b;
  } catch {
    return false;
  }
}
