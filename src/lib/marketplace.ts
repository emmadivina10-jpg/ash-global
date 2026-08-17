import { supabase } from "@/integrations/supabase/client";

export const SUBSCRIPTION_FEE = 2000;
export const PORTFOLIO_BUCKET = "portfolio";

export const SERVICE_CATEGORIES = [
  "BRAIDER",
  "HAIR_STYLIST",
  "BARBER",
  "NAIL_TECH",
  "LASH_TECH",
  "MAKEUP",
  "MASSAGE",
  "WEB_DEV",
  "MOBILE_DEV",
  "UIUX",
  "CLOUD",
  "DEVOPS",
  "AI",
  "CYBERSECURITY",
  "IT_CONSULTING",
  "ELECTRICIAN",
  "PLUMBER",
  "CLEANER",
  "HANDYMAN",
  "PRIVATE_CHEF",
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "CATERING",
  "DECORATION",
  "DJ",
  "EVENT_PLANNING",
  "HEALTH_WELLNESS",
  "PROFESSIONAL",
  "OTHER",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

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
