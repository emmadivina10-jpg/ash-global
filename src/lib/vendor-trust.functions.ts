import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3.6-flash";

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

export const analyzeVendorTrust = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; lang?: string }) => {
    if (!input?.userId || typeof input.userId !== "string") throw new Error("userId required");
    return { userId: input.userId, lang: input.lang === "fr" ? "fr" : "en" };
  })
  .handler(async ({ data, context }): Promise<VendorTrustResult> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const [{ data: provider }, { data: profile }] = await Promise.all([
      sb
        .from("provider_profiles")
        .select("id, is_verified, rating_avg, rating_count, completed_bookings, created_at")
        .eq("user_id", data.userId)
        .maybeSingle(),
      sb
        .from("public_profiles")
        .select("verified_tier, verified_until, created_at")
        .eq("user_id", data.userId)
        .maybeSingle(),
    ]);
    let comments: string[] = [];
    if (provider?.id) {
      const { data: rows } = await sb
        .from("reviews")
        .select("rating, comment")
        .eq("provider_id", provider.id)
        .order("created_at", { ascending: false })
        .limit(8);
      comments = (rows ?? [])
        .filter((r: { comment: string | null }) => r.comment)
        .map((r: { rating: number; comment: string }) => `${r.rating}/5: ${r.comment.slice(0, 200)}`);
    }
    const tierActive =
      Boolean(profile?.verified_tier) &&
      (!profile?.verified_until || new Date(profile.verified_until) > new Date());
    const created = provider?.created_at ?? profile?.created_at ?? null;
    const reviews = Number(provider?.rating_count ?? 0);
    const facts: VendorTrustFacts = {
      verified: provider?.is_verified === true || tierActive,
      rating: reviews > 0 ? Number(provider?.rating_avg ?? 0) : null,
      reviews,
      completedBookings: Number(provider?.completed_bookings ?? 0),
      accountAgeDays: created
        ? Math.max(0, Math.floor((Date.now() - new Date(created).getTime()) / 86_400_000))
        : null,
      recentComments: comments,
    };
    const level = trustLevel(facts);

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, level, summary: "", facts };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are ASH Intelligence. Using ONLY the facts given, write 2-3 short sentences advising a buyer whether this account looks good to trade with. Never invent numbers. Verified accounts should be clearly recommended. If data is thin, say so and suggest paying only through ASH. Plain text, no markdown.",
            },
            {
              role: "user",
              content: `Language: ${data.lang}. Assessed level: ${level}. Facts: ${JSON.stringify(facts)}`,
            },
          ],
        }),
      });
      if (!res.ok) return { ok: false, level, summary: "", facts };
      const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return { ok: true, level, summary: payload.choices?.[0]?.message?.content?.trim() ?? "", facts };
    } catch {
      return { ok: false, level, summary: "", facts };
    }
  });
