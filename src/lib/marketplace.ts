import { supabase } from "@/integrations/supabase/client";
import type { TKey } from "@/lib/i18n";

export const SUBSCRIPTION_FEE = 2000;
export const PORTFOLIO_BUCKET = "portfolio";

export const SERVICE_CATEGORIES = [
  "BRAIDER",
  "NAIL_TECH",
  "LASH_TECH",
  "MAKEUP",
  "BARBER",
  "OTHER",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const CATEGORY_KEY: Record<ServiceCategory, TKey> = {
  BRAIDER: "cat.BRAIDER",
  NAIL_TECH: "cat.NAIL_TECH",
  LASH_TECH: "cat.LASH_TECH",
  MAKEUP: "cat.MAKEUP",
  BARBER: "cat.BARBER",
  OTHER: "cat.OTHER",
};

export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "DECLINED",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_KEY: Record<BookingStatus, TKey> = {
  PENDING: "booking.status.PENDING",
  CONFIRMED: "booking.status.CONFIRMED",
  COMPLETED: "booking.status.COMPLETED",
  CANCELLED: "booking.status.CANCELLED",
  DECLINED: "booking.status.DECLINED",
};

/** Signed URLs for private portfolio objects, keyed by storage path. */
export async function signPortfolioPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(PORTFOLIO_BUCKET)
    .createSignedUrls(unique, 60 * 60);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

export function isSubscriptionActive(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}
