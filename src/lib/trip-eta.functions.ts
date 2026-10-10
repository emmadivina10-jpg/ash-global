import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export type TripEta = { durationSeconds: number; distanceMeters: number } | { error: string } | null;

/**
 * Driving time from the provider's latest real position to the booking address.
 * Only the booking's customer or provider can read the position (row security), so
 * a caller who isn't part of an active trip gets null and no Google request is made.
 */
export const getTripEta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<TripEta> => {
    const { data: loc } = await context.supabase
      .from("booking_live_locations")
      .select("lat, lng")
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    if (!loc) return null;
    const { data: b } = await context.supabase.from("bookings").select("address").eq("id", data.bookingId).maybeSingle();
    const address = (b?.address ?? "").trim();
    if (!address) return null;

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) return { error: "MAPS_NOT_CONFIGURED" };

    const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: Number(loc.lat), longitude: Number(loc.lng) } } },
        destination: { address: address.slice(0, 300) },
        travelMode: "DRIVE",
      }),
    });
    if (!res.ok) {
      console.error(`Routes request failed [${res.status}]: ${await res.text()}`);
      return { error: res.status === 403 ? "MAPS_KEY_DENIED" : "ROUTE_FAILED" };
    }
    const json = (await res.json()) as { routes?: Array<{ duration?: string; distanceMeters?: number }> };
    const route = json.routes?.[0];
    const secs = route?.duration ? Number.parseFloat(route.duration) : Number.NaN;
    if (!route || !Number.isFinite(secs)) return { error: "ROUTE_NOT_FOUND" };
    return { durationSeconds: secs, distanceMeters: route.distanceMeters ?? 0 };
  });
