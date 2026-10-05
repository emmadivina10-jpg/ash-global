import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * ASH Flights — live provider integration (Duffel).
 * Never returns invented flights: if DUFFEL_ACCESS_TOKEN is absent,
 * every call returns { available: false }.
 */

export type Place = { code: string; name: string; city: string; country: string; type: string };
export type Segment = {
  airline: string;
  airlineLogo: string | null;
  flightNumber: string;
  aircraft: string | null;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  departAt: string;
  arriveAt: string;
  duration: string | null;
  cabin: string | null;
  baggage: string | null;
};
export type Slice = { from: string; to: string; duration: string | null; segments: Segment[] };
export type Offer = {
  id: string;
  airline: string;
  airlineLogo: string | null;
  totalAmount: string;
  baseAmount: string | null;
  taxAmount: string | null;
  currency: string;
  slices: Slice[];
  refundable: boolean | null;
  changeable: boolean | null;
  conditionsText: string[];
  expiresAt: string | null;
};

type Unavailable = { available: false; reason: string };

async function duffel(path: string, init?: RequestInit) {
  const token = process.env["DUFFEL_ACCESS_TOKEN"];
  if (!token) return null;
  const res = await fetch(`https://api.duffel.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": "v2",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    console.error("Duffel error", res.status, JSON.stringify(json).slice(0, 500));
    throw new Error("The flight provider could not complete this request. Please try again.");
  }
  return json;
}

const notConnected: Unavailable = { available: false, reason: "not_connected" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOffer(o: any): Offer {
  const bag = (seg: any) => {
    const p = seg?.passengers?.[0];
    const bags = (p?.baggages ?? []) as Array<{ type: string; quantity: number }>;
    if (!bags.length) return null;
    return bags.map((b) => `${b.quantity} × ${b.type === "checked" ? "checked" : "carry-on"}`).join(", ");
  };
  const cond = o.conditions ?? {};
  const text: string[] = [];
  if (cond.refund_before_departure) {
    const r = cond.refund_before_departure;
    text.push(r.allowed ? `Refundable${r.penalty_amount ? ` (fee ${r.penalty_currency} ${r.penalty_amount})` : ""}` : "Non-refundable");
  }
  if (cond.change_before_departure) {
    const c = cond.change_before_departure;
    text.push(c.allowed ? `Changes allowed${c.penalty_amount ? ` (fee ${c.penalty_currency} ${c.penalty_amount})` : ""}` : "Changes not allowed");
  }
  return {
    id: o.id,
    airline: o.owner?.name ?? "",
    airlineLogo: o.owner?.logo_symbol_url ?? null,
    totalAmount: o.total_amount,
    baseAmount: o.base_amount ?? null,
    taxAmount: o.tax_amount ?? null,
    currency: o.total_currency,
    refundable: cond.refund_before_departure ? !!cond.refund_before_departure.allowed : null,
    changeable: cond.change_before_departure ? !!cond.change_before_departure.allowed : null,
    conditionsText: text,
    expiresAt: o.expires_at ?? null,
    slices: (o.slices ?? []).map((s: any) => ({
      from: s.origin?.iata_code,
      to: s.destination?.iata_code,
      duration: s.duration ?? null,
      segments: (s.segments ?? []).map((g: any) => ({
        airline: g.marketing_carrier?.name ?? "",
        airlineLogo: g.marketing_carrier?.logo_symbol_url ?? null,
        flightNumber: `${g.marketing_carrier?.iata_code ?? ""}${g.marketing_carrier_flight_number ?? ""}`,
        aircraft: g.aircraft?.name ?? null,
        from: g.origin?.iata_code,
        fromName: g.origin?.city_name ?? g.origin?.name ?? "",
        to: g.destination?.iata_code,
        toName: g.destination?.city_name ?? g.destination?.name ?? "",
        departAt: g.departing_at,
        arriveAt: g.arriving_at,
        duration: g.duration ?? null,
        cabin: g.passengers?.[0]?.cabin_class_marketing_name ?? null,
        baggage: bag(g),
      })),
    })),
  };
}

export const getFlightsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ available: !!process.env["DUFFEL_ACCESS_TOKEN"] }));

export const searchPlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ query: z.string().trim().min(2).max(60) }).parse(d))
  .handler(async ({ data }): Promise<{ available: true; places: Place[] } | Unavailable> => {
    const json = await duffel(`/places/suggestions?query=${encodeURIComponent(data.query)}`);
    if (!json) return notConnected;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const places = ((json.data as any[]) ?? [])
      .filter((p) => p.iata_code)
      .slice(0, 12)
      .map((p) => ({
        code: p.iata_code,
        name: p.name,
        city: p.city_name ?? p.city?.name ?? p.name,
        country: p.iata_country_code ?? "",
        type: p.type,
      }));
    return { available: true, places };
  });

const searchSchema = z.object({
  slices: z
    .array(
      z.object({
        origin: z.string().regex(/^[A-Z]{3}$/),
        destination: z.string().regex(/^[A-Z]{3}$/),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .min(1)
    .max(4),
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(8),
  infants: z.number().int().min(0).max(4),
  cabin: z.enum(["economy", "premium_economy", "business", "first"]),
});

export const searchFlights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => searchSchema.parse(d))
  .handler(async ({ data }): Promise<{ available: true; offers: Offer[] } | Unavailable> => {
    if (data.infants > data.adults) throw new Error("Each infant must travel with an adult.");
    const passengers = [
      ...Array.from({ length: data.adults }, () => ({ type: "adult" })),
      ...Array.from({ length: data.children }, () => ({ type: "child" })),
      ...Array.from({ length: data.infants }, () => ({ type: "infant_without_seat" })),
    ];
    const json = await duffel(`/air/offer_requests?return_offers=true&supplier_timeout=20000`, {
      method: "POST",
      body: JSON.stringify({
        data: {
          slices: data.slices.map((s) => ({ origin: s.origin, destination: s.destination, departure_date: s.date })),
          passengers,
          cabin_class: data.cabin,
        },
      }),
    });
    if (!json) return notConnected;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const offers = (((json.data as any)?.offers as any[]) ?? []).slice(0, 80).map(mapOffer);
    return { available: true, offers };
  });

/** Always re-fetches the latest offer from the provider — displayed prices are never trusted. */
export const getFlightOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().regex(/^off_[A-Za-z0-9]+$/) }).parse(d))
  .handler(async ({ data }): Promise<{ available: true; offer: Offer } | Unavailable> => {
    const json = await duffel(`/air/offers/${data.id}?return_available_services=false`);
    if (!json) return notConnected;
    return { available: true, offer: mapOffer(json.data) };
  });
