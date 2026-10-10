import { supabase } from "@/integrations/supabase/client";
import { directory } from "@/lib/public-profiles";

export type NotificationActor = {
  id: string;
  name: string;
  avatar_url: string | null;
  verified_tier: string | null;
  verified_until: string | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  verified_tier: string | null;
  verified_until: string | null;
};

/**
 * Booking notifications are written by the system, so they carry no sender.
 * The "person behind" them is the other party on the booking — read through the
 * normal client, so booking privacy rules still apply.
 */
async function otherBookingParty(bookingId: string, me: string): Promise<string | null> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("client_id, provider_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return null;
  if (booking.client_id !== me) return booking.client_id;
  const { data: provider } = await supabase
    .from("provider_profiles")
    .select("user_id")
    .eq("id", booking.provider_id)
    .maybeSingle();
  return provider?.user_id ?? null;
}

/** Works out whose photo a notification should show. */
export async function actorIdFor(
  row: { actor_id?: string | null; data?: Record<string, unknown> | null },
  me: string,
): Promise<string | null> {
  if (row.actor_id) return row.actor_id;
  const bookingId = row.data?.["booking_id"];
  if (typeof bookingId === "string") return otherBookingParty(bookingId, me).catch(() => null);
  return null;
}

export async function loadActors(ids: string[]): Promise<Map<string, NotificationActor>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const { data } = await directory()
    .select("user_id, full_name, avatar_url, verified_tier, verified_until")
    .in("user_id", unique);
  return new Map(
    ((data ?? []) as ProfileRow[]).map((p) => [
      p.user_id,
      {
        id: p.user_id,
        name: p.full_name ?? "ASH member",
        avatar_url: p.avatar_url,
        verified_tier: p.verified_tier,
        verified_until: p.verified_until,
      },
    ]),
  );
}
