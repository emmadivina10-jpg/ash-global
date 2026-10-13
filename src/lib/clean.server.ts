// Server-only ASH Clean helpers: Google Maps gateway calls and transport pricing.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders(extra: Record<string, string> = {}) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const maps = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovable || !maps) throw new Error("MAPS_NOT_CONFIGURED");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": maps,
    "Content-Type": "application/json",
    ...extra,
  };
}

export type Point = { lat: number; lng: number };

export function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Real road distance through Google Routes; falls back to straight line × 1.3. */
export async function roadDistance(
  from: Point,
  to: Point,
): Promise<{ km: number; etaMin: number; source: "ROAD" | "ESTIMATE" }> {
  try {
    const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: gatewayHeaders({ "X-Goog-FieldMask": "routes.distanceMeters,routes.duration" }),
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: "DRIVE",
      }),
    });
    if (!res.ok) {
      console.error(`Routes failed [${res.status}]: ${await res.text()}`);
      throw new Error("ROUTES_FAILED");
    }
    const json = (await res.json()) as {
      routes?: { distanceMeters?: number; duration?: string }[];
    };
    const route = json.routes?.[0];
    if (!route?.distanceMeters) throw new Error("NO_ROUTE");
    return {
      km: Math.round((route.distanceMeters / 1000) * 10) / 10,
      etaMin: Math.max(1, Math.round(parseInt(route.duration ?? "0", 10) / 60)),
      source: "ROAD",
    };
  } catch {
    const km = Math.round(haversineKm(from, to) * 1.3 * 10) / 10;
    return { km, etaMin: Math.max(3, Math.round((km / 20) * 60)), source: "ESTIMATE" };
  }
}

export async function autocomplete(input: string, sessionToken: string, bias: Point) {
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
    method: "POST",
    headers: gatewayHeaders({
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
    }),
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["cm"],
      locationBias: {
        circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 30000 },
      },
    }),
  });
  if (!res.ok) {
    console.error(`Autocomplete failed [${res.status}]: ${await res.text()}`);
    return [];
  }
  const json = (await res.json()) as {
    suggestions?: { placePrediction?: { placeId: string; text?: { text: string } } }[];
  };
  return (json.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is { placeId: string; text?: { text: string } } => Boolean(p))
    .slice(0, 6)
    .map((p) => ({ placeId: p.placeId, text: p.text?.text ?? "" }));
}

export async function placeDetails(placeId: string, sessionToken: string) {
  const res = await fetch(
    `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    { headers: gatewayHeaders({ "X-Goog-FieldMask": "formattedAddress,location,displayName" }) },
  );
  if (!res.ok) {
    console.error(`Details failed [${res.status}]: ${await res.text()}`);
    return null;
  }
  const json = (await res.json()) as {
    formattedAddress?: string;
    displayName?: { text?: string };
    location?: { latitude: number; longitude: number };
  };
  if (!json.location) return null;
  return {
    address: json.formattedAddress ?? json.displayName?.text ?? "",
    lat: json.location.latitude,
    lng: json.location.longitude,
  };
}

export async function reverseGeocode(p: Point): Promise<string> {
  try {
    const res = await fetch(`${GATEWAY_URL}/maps/api/geocode/json?latlng=${p.lat},${p.lng}`, {
      headers: gatewayHeaders(),
    });
    if (!res.ok) return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
    const json = (await res.json()) as { results?: { formatted_address: string }[] };
    return json.results?.[0]?.formatted_address ?? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
  } catch {
    return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
  }
}

export type CleanSettings = {
  price_per_kg: number;
  facility_lat: number;
  facility_lng: number;
  staff_radius_km: number;
  max_staff_km: number;
  min_rider_fee: number;
  base_pickup_fee: number;
  base_delivery_fee: number;
  far_fee_per_km: number;
  staff_pickup_enabled: boolean;
  staff_delivery_enabled: boolean;
  rider_enabled: boolean;
};
export type Band = { min_km: number; max_km: number | null; fee: number };

/** Decides STAFF vs RIDER and the fee for one direction. */
export function transportQuote(
  km: number,
  direction: "PICKUP" | "DELIVERY",
  s: CleanSettings,
  bands: Band[],
): { method: "STAFF" | "RIDER"; fee: number } {
  const staffOn = direction === "PICKUP" ? s.staff_pickup_enabled : s.staff_delivery_enabled;
  const base = Number(direction === "PICKUP" ? s.base_pickup_fee : s.base_delivery_fee);
  const staffLimit = Math.min(Number(s.staff_radius_km), Number(s.max_staff_km));
  if (staffOn && km <= staffLimit) return { method: "STAFF", fee: base };
  const sorted = [...bands].sort((a, b) => Number(a.min_km) - Number(b.min_km));
  const band = sorted.find(
    (b) => km >= Number(b.min_km) && (b.max_km == null || km < Number(b.max_km)),
  );
  let fee: number;
  if (band) fee = Number(band.fee);
  else {
    const last = sorted[sorted.length - 1];
    const lastMax = Number(last?.max_km ?? 0);
    fee =
      Number(last?.fee ?? s.min_rider_fee) +
      Math.ceil(Math.max(0, km - lastMax)) * Number(s.far_fee_per_km);
  }
  return { method: "RIDER", fee: Math.max(fee, Number(s.min_rider_fee)) + base };
}

export async function loadPricing() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: s }, { data: bands }] = await Promise.all([
    supabaseAdmin.from("clean_settings").select("*").eq("id", 1).single(),
    supabaseAdmin.from("clean_distance_bands").select("min_km, max_km, fee"),
  ]);
  if (!s) throw new Error("CLEAN_SETTINGS_MISSING");
  return {
    settings: s as unknown as CleanSettings & Record<string, unknown>,
    bands: (bands ?? []) as Band[],
  };
}

export async function quoteLocation(p: Point, direction: "PICKUP" | "DELIVERY") {
  const { settings, bands } = await loadPricing();
  const dist = await roadDistance({ lat: settings.facility_lat, lng: settings.facility_lng }, p);
  const t = transportQuote(dist.km, direction, settings, bands);
  return { km: dist.km, etaMin: dist.etaMin, source: dist.source, ...t };
}
