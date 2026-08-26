import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChatTurn = { role: "user" | "assistant"; content: string };

type AskInput = { messages: ChatTurn[]; lang?: string };

const MODEL = "google/gemini-3.6-flash";

const SYSTEM = `You are "ASH Assistant", the built-in AI guide of ASH Glo — a Cameroonian platform that combines a 3-level referral earnings programme with a beauty-services marketplace.

How the platform works:
- Members activate their account once for 5,000 XAF via TchokoPay (mobile money). Activation unlocks earning.
- Referral commissions are paid when a referred member activates: level 1 = 1,500 XAF, level 2 = 750 XAF, level 3 = 250 XAF. Commissions land in the member's wallet available balance.
- Wallet withdrawals go to MTN Mobile Money or Orange Money, minimum 1,000 XAF, reviewed by an admin.
- The services marketplace lets any member open a "studio" profile as a braider, nail tech, lash tech, makeup artist or barber. Providers pay 2,000 XAF per month to go live and be discoverable.
- Providers list services (title, price in XAF, duration), upload portfolio photos of their work, and receive booking requests with a date/time, address and notes.
- Booking lifecycle: the client sends a request (status Requested) -> the provider has 24 hours to accept or decline -> once accepted the client has 24 hours to pay through mobile money -> after payment the booking is Confirmed and an ASH invoice appears in the booking chat -> the provider marks it In progress then Completed.
- If the provider does not answer in 24 hours, or the client does not pay in 24 hours, the booking expires automatically. Nobody pays anything before the provider accepts.
- Platform fee: providers on commission billing pay 1% of the booking price; providers on the 2,000 XAF monthly subscription keep 100%.
- Clients browse verified providers in Discover (Beauty, Tech, Home, Events and more), filter by city, price and rating, chat live with the provider in Messages, and can leave a 1-5 star review after a booking is completed. Reviews set the provider's public rating.

Your job:
- Answer questions about how the platform works, in clear simple language.
- Use the USER CONTEXT block to give personalised analytics, numbers and advice. Never invent numbers that are not in the context.
- Give short, practical growth advice (pricing, portfolio quality, response speed, sharing the referral link, keeping the subscription active).
- Amounts are in XAF. Be concise (max ~180 words) and use short markdown-free bullets when listing.
- Reply in the user's language: French if the requested language is "fr", otherwise English.
- Never reveal API keys, internal table names or technical implementation details.`;

async function buildContext(supabase: unknown, userId: string): Promise<string> {
  const db = supabase as {
    from: (t: string) => {
      select: (s: string, o?: unknown) => any;
    };
  };

  const [profile, wallet, referrals, provider] = await Promise.all([
    db.from("profiles").select("full_name, account_status, referral_code, created_at").eq("user_id", userId).maybeSingle(),
    db.from("wallets").select("available_balance, total_earned, total_withdrawn").eq("user_id", userId).maybeSingle(),
    db.from("referrals").select("level, referred_user_id").eq("referrer_id", userId),
    db.from("provider_profiles").select("id, business_name, is_live, subscription_expires_at, rating_avg, rating_count, categories").eq("user_id", userId).maybeSingle(),
  ]);

  const lines: string[] = [];
  const p = profile?.data as Record<string, unknown> | null;
  const w = wallet?.data as Record<string, unknown> | null;
  const refs = (referrals?.data ?? []) as Array<{ level: number }>;
  const pv = provider?.data as Record<string, unknown> | null;

  lines.push(`Name: ${p?.["full_name"] ?? "member"}`);
  lines.push(`Account status: ${p?.["account_status"] ?? "PENDING"}`);
  lines.push(`Referral code: ${p?.["referral_code"] ?? "-"}`);
  lines.push(
    `Wallet: available ${Number(w?.["available_balance"] ?? 0)} XAF, total earned ${Number(w?.["total_earned"] ?? 0)} XAF, withdrawn ${Number(w?.["total_withdrawn"] ?? 0)} XAF`,
  );
  lines.push(
    `Referrals: L1 ${refs.filter((r) => r.level === 1).length}, L2 ${refs.filter((r) => r.level === 2).length}, L3 ${refs.filter((r) => r.level === 3).length}`,
  );

  if (pv?.["id"]) {
    const providerId = String(pv["id"]);
    const [bookings, reviews] = await Promise.all([
      db.from("bookings").select("status, price, scheduled_at").eq("provider_id", providerId),
      db.from("reviews").select("rating").eq("provider_id", providerId),
    ]);
    const bs = (bookings?.data ?? []) as Array<{ status: string; price: number; scheduled_at: string }>;
    const now = Date.now();
    const completed = bs.filter((b) => b.status === "COMPLETED");
    lines.push(
      `Studio: "${pv["business_name"]}" (${pv["is_live"] ? "live" : "offline"}), categories ${JSON.stringify(pv["categories"] ?? [])}, subscription until ${pv["subscription_expires_at"] ?? "not subscribed"}`,
    );
    lines.push(
      `Bookings: total ${bs.length}, pending ${bs.filter((b) => b.status === "PENDING").length}, confirmed ${bs.filter((b) => b.status === "CONFIRMED").length}, completed ${completed.length}, upcoming ${bs.filter((b) => new Date(b.scheduled_at).getTime() > now && ["PENDING", "CONFIRMED"].includes(b.status)).length}`,
    );
    lines.push(`Completed revenue: ${completed.reduce((sum, b) => sum + Number(b.price ?? 0), 0)} XAF`);
    lines.push(
      `Rating: ${Number(pv["rating_avg"] ?? 0)} from ${Number(pv["rating_count"] ?? 0)} reviews (${(reviews?.data ?? []).length} recorded)`,
    );
  } else {
    lines.push("Studio: none yet (user is not a provider).");
  }

  const clientBookings = await db
    .from("bookings")
    .select("status, price, service_title, scheduled_at, pay_by, invoice_number")
    .eq("client_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  const cb = (clientBookings?.data ?? []) as Array<{
    status: string;
    price: number;
    service_title: string;
    scheduled_at: string;
    pay_by: string | null;
    invoice_number: string | null;
  }>;
  if (cb.length > 0) {
    lines.push(
      `As a client: ${cb.length} recent bookings — ` +
        cb
          .map(
            (b) =>
              `${b.service_title} (${b.status}, ${Number(b.price)} XAF, ${b.scheduled_at}${
                b.status === "ACCEPTED" && b.pay_by ? `, must pay before ${b.pay_by}` : ""
              })`,
          )
          .join("; "),
    );
    const awaiting = cb.filter((b) => b.status === "ACCEPTED").length;
    if (awaiting > 0) lines.push(`Action needed: ${awaiting} accepted booking(s) waiting for payment.`);
  } else {
    lines.push("As a client: no bookings yet.");
  }

  return lines.join("\n");
}

/** Answers a question about the platform, personalised with the caller's own data. */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AskInput) => {
    const messages = Array.isArray(input?.messages) ? input.messages.slice(-12) : [];
    if (messages.length === 0) throw new Error("messages required");
    return {
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(m.content ?? "").slice(0, 4000),
      })),
      lang: input?.lang === "fr" ? "fr" : "en",
    };
  })
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, error: "AI_NOT_CONFIGURED", reply: null };

    const userContext = await buildContext(context.supabase, context.userId);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "system", content: `USER CONTEXT (today ${new Date().toISOString()}):\n${userContext}\nReply language: ${data.lang}` },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) return { ok: false as const, error: "RATE_LIMITED", reply: null };
    if (res.status === 402) return { ok: false as const, error: "CREDITS_EXHAUSTED", reply: null };
    if (!res.ok) return { ok: false as const, error: "AI_REQUEST_FAILED", reply: null };

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = payload.choices?.[0]?.message?.content ?? "";
    if (!reply) return { ok: false as const, error: "EMPTY_RESPONSE", reply: null };

    return { ok: true as const, error: null, reply };
  });
