import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MediaSafetyInput = {
  contentType: string;
  originalName: string;
  mediaType: string;
  previewDataUrl: string;
};

type SafetyVerdict = "SAFE" | "EXPLICIT" | "UNCERTAIN";

function parseVerdict(raw: string): { verdict: SafetyVerdict; confidence: number; reason: string } {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const value = JSON.parse(cleaned) as { verdict?: unknown; confidence?: unknown; reason?: unknown };
    const candidate = String(value.verdict ?? "UNCERTAIN").toUpperCase();
    const verdict: SafetyVerdict = candidate === "SAFE" || candidate === "EXPLICIT" ? candidate : "UNCERTAIN";
    const confidence = Math.max(0, Math.min(1, Number(value.confidence) || 0));
    return { verdict, confidence, reason: String(value.reason ?? "Automated media safety review").slice(0, 500) };
  } catch {
    return { verdict: "UNCERTAIN", confidence: 0, reason: "The automated safety check could not reach a reliable decision." };
  }
}

/** Checks a small image preview before the original file can be published. */
export const moderateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MediaSafetyInput) => {
    const previewDataUrl = String(input?.previewDataUrl ?? "");
    if (!previewDataUrl.startsWith("data:image/") || previewDataUrl.length > 2_000_000) {
      throw new Error("INVALID_MEDIA_PREVIEW");
    }
    return {
      contentType: String(input?.contentType ?? "UPLOAD").slice(0, 80),
      originalName: String(input?.originalName ?? "media").slice(0, 240),
      mediaType: String(input?.mediaType ?? "application/octet-stream").slice(0, 120),
      previewDataUrl,
    };
  })
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, verdict: "UNAVAILABLE" as const };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are the media safety classifier for an 18+ commerce and social platform. Classify only visible nudity or sexually explicit imagery. EXPLICIT means exposed genitals, exposed female nipples, explicit sexual acts, or pornographic imagery. SAFE includes ordinary people, swimwear, breastfeeding, art without explicit detail, products, property, documents, and screenshots. UNCERTAIN means the image is unclear or confidence is below 0.92. Return only compact JSON: {\"verdict\":\"SAFE|EXPLICIT|UNCERTAIN\",\"confidence\":0.0,\"reason\":\"short factual reason\"}.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Review this ${data.contentType} media before publication.` },
              { type: "image_url", image_url: { url: data.previewDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) return { ok: false as const, verdict: "UNAVAILABLE" as const };
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = parseVerdict(payload.choices?.[0]?.message?.content ?? "");
    const verdict: SafetyVerdict =
      parsed.verdict === "EXPLICIT" && parsed.confidence < 0.92 ? "UNCERTAIN" : parsed.verdict;

    if (verdict !== "SAFE") {
      const bytes = new TextEncoder().encode(data.previewDataUrl);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const mediaHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.rpc("record_media_moderation", {
        _user_id: context.userId,
        _content_type: data.contentType,
        _original_name: data.originalName,
        _media_type: data.mediaType,
        _media_hash: mediaHash,
        _verdict: verdict,
        _confidence: parsed.confidence,
        _reason: parsed.reason,
      });
      if (error) throw new Error("MODERATION_RECORD_FAILED");
    }

    return { ok: true as const, verdict, reason: parsed.reason };
  });