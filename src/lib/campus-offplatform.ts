/**
 * Off-platform protection for ASH Campus.
 *
 * Bookings, payments and the 10% ASH commission only work when the session is
 * arranged inside ASH, so obvious attempts to move a learner off the platform
 * are warned about once and flagged for the review team when they repeat.
 * This intentionally stays narrow: normal lesson talk must never be blocked,
 * and nothing here bans anyone — decisions stay with the review team.
 */
import { supabase } from "@/integrations/supabase/client";

export type OffPlatformMatch = { rule: string; en: string; fr: string };

const RULES: { rule: string; test: RegExp; en: string; fr: string }[] = [
  {
    rule: "MESSAGING_APP",
    test: /\b(whats\s?app|wattsapp|telegram|signal app|viber)\b/i,
    en: "Keep the conversation in ASH so your booking, payment and review stay protected.",
    fr: "Gardez la conversation dans ASH pour protéger votre réservation, votre paiement et votre avis.",
  },
  {
    rule: "PHONE_NUMBER",
    test: /(?:\+?\d[\s.-]?){8,}/,
    en: "Sharing phone numbers before a booking is discouraged — ASH cannot protect sessions arranged outside the app.",
    fr: "Partager un numéro avant la réservation est déconseillé — ASH ne peut pas protéger les séances organisées hors de l'application.",
  },
  {
    rule: "DIRECT_PAYMENT",
    test: /\b(pay me directly|send.{0,12}(momo|mobile money|orange money|mtn money)|western union|direct transfer|cash only)\b/i,
    en: "Payments must go through ASH so your session, refund rights and earnings are recorded.",
    fr: "Les paiements doivent passer par ASH pour enregistrer la séance, les droits de remboursement et les gains.",
  },
  {
    rule: "OFF_PLATFORM_BOOKING",
    test: /\b(book(ing)? (outside|off) ash|don'?t book through ash|avoid ash fee|outside the app)\b/i,
    en: "Sessions arranged outside ASH are not covered by ASH booking protection.",
    fr: "Les séances organisées hors ASH ne sont pas couvertes par la protection des réservations ASH.",
  },
  {
    rule: "EXTERNAL_LINK",
    test: /\b(calendly\.com|paypal\.me|buy\s?me\s?a\s?coffee|stripe\.com\/pay|wa\.me)\b/i,
    en: "External booking or payment links are not allowed in ASH Campus conversations.",
    fr: "Les liens de réservation ou de paiement externes ne sont pas autorisés dans les conversations ASH Campus.",
  },
];

/** First matching rule, or null when the message looks like ordinary lesson talk. */
export function detectOffPlatform(text: string): OffPlatformMatch | null {
  const value = String(text ?? "");
  if (value.trim().length < 6) return null;
  for (const rule of RULES) {
    if (rule.test.test(value)) return { rule: rule.rule, en: rule.en, fr: rule.fr };
  }
  return null;
}

/**
 * Records the attempt for the review team. Returns the number of flags raised
 * for this member in the last 30 days so the UI can escalate its wording.
 */
export async function flagOffPlatform(
  conversationId: string | null,
  rule: string,
  excerpt: string,
) {
  const { data, error } = await (
    supabase as unknown as {
      rpc: (fn: string, args: unknown) => Promise<{ data: number | null; error: unknown }>;
    }
  ).rpc("flag_offplatform_attempt", {
    _conversation_id: conversationId,
    _rule: rule,
    _excerpt: excerpt.slice(0, 240),
  });
  if (error) return 0;
  return Number(data ?? 0);
}
