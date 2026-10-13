import { createServerFn } from "@tanstack/react-start";
import { placeByCity } from "./cyber-map-rules";

/**
 * Investor world map: provider counts per city/country only. No names,
 * contacts, devices, trips or any security data — investors see where the
 * provider network is, never who is in it.
 */

export type InvestorMapPoint = {
  city: string | null;
  country: string;
  lat: number;
  lng: number;
  count: number;
};

export const getInvestorProviderMap = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");
  await requireDepartment("INVESTOR");
  const db = await adminClient();
  const [{ default: cities }, { default: countries }] = await Promise.all([
    import("./geo/cities.json"),
    import("./geo/countries.json"),
  ]);
  const cityList = cities as unknown as [string, string, number, number][];
  const countryMap = countries as unknown as Record<string, [number, number, string]>;

  const { data: providers } = await db
    .from("provider_profiles")
    .select("city, country")
    .limit(5000);

  const buckets = new Map<string, InvestorMapPoint>();
  let unmapped = 0;
  for (const p of providers ?? []) {
    const place = placeByCity(p.city, p.country, cityList, countryMap);
    if (!place) {
      unmapped += 1;
      continue;
    }
    const key = `${place.lat.toFixed(2)},${place.lng.toFixed(2)}`;
    const hit = buckets.get(key);
    if (hit) hit.count += 1;
    else
      buckets.set(key, {
        city: p.city ?? null,
        country: p.country,
        lat: place.lat,
        lng: place.lng,
        count: 1,
      });
  }

  const points = [...buckets.values()].sort((a, b) => b.count - a.count);
  return { points, total: (providers ?? []).length, unmapped };
});
