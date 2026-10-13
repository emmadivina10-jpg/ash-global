export type VendorTrustFacts = {
  verified: boolean;
  rating: number | null;
  reviews: number;
  completedBookings: number;
  accountAgeDays: number | null;
  recentComments: string[];
};

export type VendorTrustResult = {
  ok: boolean;
  level: "recommended" | "good" | "caution" | "unknown";
  summary: string;
  facts: VendorTrustFacts | null;
};

/** Deterministic level from real facts; verified accounts are strongly recommended. */
export function trustLevel(f: VendorTrustFacts): VendorTrustResult["level"] {
  if (f.verified && (f.rating === null || f.rating >= 3.5)) return "recommended";
  if (f.rating !== null && f.rating < 3) return "caution";
  if (f.reviews >= 3 || f.completedBookings >= 3) return "good";
  return "unknown";
}

