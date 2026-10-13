/** Pure helpers for the Cyber world map, reports and session revocation. */

export type ReportPeriod = "DAILY" | "WEEKLY";

/** Daily = since 00:00 UTC today; Weekly = the last 7 full days up to now. */
export function reportWindow(
  period: ReportPeriod,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const end = new Date(now.getTime());
  if (period === "DAILY") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return { start, end };
  }
  return { start: new Date(now.getTime() - 7 * 86_400_000), end };
}

type City = [name: string, country: string, lat: number, lng: number];
type Countries = Record<string, [number, number, string]>;

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** City centre (or country centre) for a provider that only saved city + country. */
export function placeByCity(
  city: string | null | undefined,
  country: string | null | undefined,
  cities: City[],
  countries: Countries,
): { lat: number; lng: number; precision: "city" | "country" } | null {
  const cc = (country ?? "").trim().toUpperCase();
  const iso =
    cc.length === 2 ? cc : Object.entries(countries).find(([, v]) => norm(v[2]) === norm(cc))?.[0];
  if (city) {
    const n = norm(city);
    const hit =
      cities.find((c) => norm(c[0]) === n && (!iso || c[1] === iso)) ??
      (iso ? undefined : cities.find((c) => norm(c[0]) === n));
    if (hit) return { lat: hit[2], lng: hit[3], precision: "city" };
  }
  if (iso && countries[iso])
    return { lat: countries[iso]![0], lng: countries[iso]![1], precision: "country" };
  return null;
}

/** True when a token's sign-in happened before Cyber revoked the member's sessions. */
export function sessionRevoked(
  signedInAtSec: number | null,
  revokedAtIso: string | null | undefined,
): boolean {
  if (!revokedAtIso || signedInAtSec == null) return false;
  return signedInAtSec * 1000 < new Date(revokedAtIso).getTime();
}

/** Sign-in time from a Supabase access token: latest amr timestamp, else iat. */
export function tokenSignInTime(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as {
      iat?: number;
      amr?: { timestamp?: number }[];
    };
    const amr = (json.amr ?? []).map((a) => a.timestamp ?? 0).filter(Boolean);
    return amr.length ? Math.max(...amr) : (json.iat ?? null);
  } catch {
    return null;
  }
}
