import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MediaSafetyInput = {
  contentType: string;
  originalName: string;
  mediaType: string;
  previewDataUrl: string;
};

export type SafetyVerdict = "SAFE" | "EXPLICIT" | "UNCERTAIN";

type ParsedVerdict = {
  verdict: SafetyVerdict;
  confidence: number;
  reason: string;
};

function parseVerdict(raw: string): ParsedVerdict {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const value = JSON.parse(cleaned) as {
      verdict?: unknown;
      confidence?: unknown;
      reason?: unknown;
    };

    const candidate = String(value.verdict ?? "UNCERTAIN").toUpperCase();
    const verdict: SafetyVerdict =
      candidate === "SAFE" || candidate === "EXPLICIT"
        ? candidate
        : "UNCERTAIN";

    const numericConfidence = Number(value.confidence);
    const confidence = Number.isFinite(numericConfidence)
      ? Math.max(0, Math.min(1, numericConfidence))
      : 0;

    return {
      verdict,
      confidence,
      reason: String(
        value.reason ?? "Automated media safety review",
      ).slice(0, 500),
    };
  } catch {
    return {
      verdict: "UNCERTAIN",
      confidence: 0,
      reason: "The automated safety check returned an invalid response.",
    };
  }
}

/**
 * Server-side image moderation.
 *
 * The client only sends a small preview, never the original upload.
 */
export const moderateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MediaSafetyInput) => {
    const previewDataUrl = String(input?.previewDataUrl ?? "");

    if (
      !previewDataUrl.startsWith("data:image/") ||
      previewDataUrl.length > 2_000_000
    ) {
      throw new Error("INVALID_MEDIA_PREVIEW");
    }

    return {
      contentType: String(input?.contentType ?? "UPLOAD").slice(0, 80),
      originalName: String(input?.originalName ?? "media").slice(0, 240),
      mediaType: String(
        input?.mediaType ?? "application/octet-stream",
      ).slice(0, 120),
      previewDataUrl,
    };
  })
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];

    // Do not block publishing forever if the moderation provider is
    // unavailable. The caller treats unavailable moderation as non-blocking.
    if (!key) {
      return {
        ok: false as const,
        verdict: "UNAVAILABLE" as const,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
          },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            temperature: 0,
            messages: [
              {
                role: "system",
                content:
                  "You are the media safety classifier for a commerce and social platform for users aged 13 and older. Classify only visible nudity or sexually explicit imagery. EXPLICIT means exposed genitals, exposed female nipples, explicit sexual acts, or pornographic imagery. SAFE includes ordinary people, swimwear, breastfeeding, art without explicit detail, products, property, documents, and screenshots. UNCERTAIN means the image is unclear or confidence is below 0.92. Return only compact JSON: {\"verdict\":\"SAFE|EXPLICIT|UNCERTAIN\",\"confidence\":0.0,\"reason\":\"short factual reason\"}.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Review this ${data.contentType} media before publication.`,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: data.previewDataUrl,
                    },
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        return {
          ok: false as const,
          verdict: "UNAVAILABLE" as const,
        };
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      const parsed = parseVerdict(
        payload.choices?.[0]?.message?.content ?? "",
      );

      const verdict: SafetyVerdict =
        parsed.verdict === "EXPLICIT" && parsed.confidence < 0.92
          ? "UNCERTAIN"
          : parsed.verdict;

      if (verdict !== "SAFE") {
        const bytes = new TextEncoder().encode(data.previewDataUrl);
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const mediaHash = Array.from(
          new Uint8Array(digest),
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join("");

        const { supabaseAdmin } =
          await import("@/integrations/supabase/client.server");

        const { error } = await supabaseAdmin.rpc(
          "record_media_moderation",
          {
            _user_id: context.userId,
            _content_type: data.contentType,
            _original_name: data.originalName,
            _media_type: data.mediaType,
            _media_hash: mediaHash,
            _verdict: verdict,
            _confidence: parsed.confidence,
            _reason: parsed.reason,
          },
        );

        if (error) {
          throw new Error("MODERATION_RECORD_FAILED");
        }
      }

      return {
        ok: true as const,
        verdict,
        reason: parsed.reason,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return {
          ok: false as const,
          verdict: "UNAVAILABLE" as const,
        };
      }

      return {
        ok: false as const,
        verdict: "UNAVAILABLE" as const,
      };
    } finally {
      clearTimeout(timeout);
    }
  });

/**
 * Creates a small client-side preview for moderation.
 * The original file is never converted to a data URL or sent to the
 * moderation service.
 */
async function createModerationPreview(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be published.");
  }

  const bitmap = await createImageBitmap(file);

  try {
    const maxDimension = 1280;
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare the image for safety checking.");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    // Keep the preview comfortably below the server's 2 MB input limit.
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);

    if (dataUrl.length > 1_900_000) {
      const smaller = canvas.toDataURL("image/jpeg", 0.62);

      if (smaller.length > 1_900_000) {
        throw new Error("The image could not be prepared for upload.");
      }

      return smaller;
    }

    return dataUrl;
  } finally {
    bitmap.close();
  }
}

/**
 * Client-side entry point used by social.queries.ts.
 *
 * It performs a bounded safety check for each image and, importantly,
 * never leaves the caller waiting forever if the moderation service is
 * unavailable.
 */
export async function verifyMediaFiles(
  files: File[],
  contentType: "SOCIAL_POST" | "STORY" | string,
): Promise<void> {
  const selected = files.slice(0, 4);

  for (const file of selected) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only photos can be shared right now.");
    }

    if (file.size > 12 * 1024 * 1024) {
      throw new Error(`${file.name} is larger than 12 MB.`);
    }

    let previewDataUrl: string;

    try {
      previewDataUrl = await Promise.race([
        createModerationPreview(file),
        new Promise<string>((_, reject) => {
          setTimeout(
            () => reject(new Error("MEDIA_PREVIEW_TIMEOUT")),
            10_000,
          );
        }),
      ]);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "MEDIA_PREVIEW_TIMEOUT"
      ) {
        // Do not trap a user in an endless loading state just because
        // client-side preview generation failed.
        continue;
      }

      throw error;
    }

    try {
      const result = await Promise.race([
        moderateMedia({
          data: {
            contentType,
            originalName: file.name,
            mediaType: file.type,
            previewDataUrl,
          },
        }),
        new Promise<{
          ok: false;
          verdict: "UNAVAILABLE";
        }>((resolve) => {
          setTimeout(
            () => resolve({ ok: false, verdict: "UNAVAILABLE" }),
            20_000,
          );
        }),
      ]);

      // Explicit content is blocked. An unavailable moderation service
      // does not permanently trap the publishing UI.
      if (
        result.ok &&
        result.verdict === "EXPLICIT"
      ) {
        throw new Error(
          "This photo cannot be published because it contains explicit content.",
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "MEDIA_PREVIEW_TIMEOUT"
      ) {
        continue;
      }

      // Only actual moderation decisions should block the user.
      if (
        error instanceof Error &&
        /explicit content/i.test(error.message)
      ) {
        throw error;
      }

      // Network/provider failures are treated as unavailable rather than
      // causing an infinite Post spinner.
      console.warn("Media safety check unavailable:", error);
    }
  }
}
