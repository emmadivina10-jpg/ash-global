import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Screens a comment when the post owner turned on "filter inappropriate
 * comments". Returns `{ blocked: true }` for harassment, hate, sexual content,
 * threats or scams. Fails open so the filter can never silence a whole thread
 * because of a temporary AI outage.
 */
export const screenComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) => ({ text: String(input?.text ?? "").slice(0, 1500) }))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key || !data.text.trim()) return { blocked: false as const, reason: null };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            {
              role: "system",
              content:
                'You moderate comments on a community marketplace. Reply with exactly one word: "BLOCK" if the comment contains harassment, insults, hate speech, threats, sexual content, or an obvious scam; otherwise "ALLOW". Nothing else.',
            },
            { role: "user", content: data.text },
          ],
        }),
      });
      if (!res.ok) return { blocked: false as const, reason: null };
      const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const verdict = (payload.choices?.[0]?.message?.content ?? "").trim().toUpperCase();
      return verdict.startsWith("BLOCK")
        ? { blocked: true as const, reason: "INAPPROPRIATE" }
        : { blocked: false as const, reason: null };
    } catch {
      return { blocked: false as const, reason: null };
    }
  });
