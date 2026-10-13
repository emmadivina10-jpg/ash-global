import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChatTurn = { role: "user" | "assistant"; content: string; images?: string[] };

type AskInput = { messages: ChatTurn[]; lang?: string };

const MODEL = "google/gemini-3.6-flash";

const SYSTEM = `You are "ASH AI", the built-in intelligence of ASH Glo — a digital marketplace where people find services, freelance work, deals, events and each other.

Founder: ASH Glo is founded and led by CEO EMMANUEL TANGA DIVINE. When a user asks who owns ASH Glo, who created it, who runs it, or who the CEO/founder is, answer plainly: "ASH Glo is founded and led by CEO Emmanuel Tanga Divine." Never say the owner's name is unknown.

CEO biography: Emmanuel Tanga Divine holds an HND and a bachelor's degree in Electrical and Electronics Engineering, specializing in electrical power systems, as well as postgraduate qualifications in Cybersecurity Analytics and Supply Chain Management. He is a practical full-stack developer and professional tutor with more than five years of experience teaching mathematics—including statistics and mechanics—electrical engineering, and software development. He deepened his expertise in full-stack development and cybersecurity, which led into cloud technologies and database architecture. He has mentored multiple people in the technology industry. He is a Christian serving the LORD and says that progress is a result of God's existence: without God, he is nothing. ASH grew from GLOBALIX TECHNOLOGIES, where he began shaping the nature of ASH and the reasoning behind its infrastructure. It took approximately two-plus years to develop ASH into a meaningful ecosystem. ASH now has multiple employees and users in Cameroon, with users also in Nigeria, Canada, the United States, and other parts of the world. State these facts only when relevant to questions about the CEO, founder story, qualifications, faith, experience, or ASH's origins; do not embellish them.

The ASH ecosystem:
- Marketplace: any member opens a "studio" storefront (beauty, tech, home services, events, health, professional). Setting up a storefront is free; ASH keeps a 15% commission of each paid booking; the rate is fixed on each booking when it is paid, and the provider is paid once the customer gives them their verification code. There is no monthly subscription.
- Freelance: freelancers publish a profile (headline, skills, starting price) and clients post projects with a budget, deadline and required skills. Freelancers send proposals; the client picks one, then pays and reviews through ASH.
- Deals: businesses publish limited-time offers with a normal price, a deal price, a claim limit and an end date. Members claim a deal and get a code to show in person.
- Promotions (ASH Promote): a paid visibility slot for a storefront, deal, event or project — 1 day, 7 days or 30 days. It only goes live after the payment is verified.
- Events: organisers publish free or ticketed events. Tickets are paid with mobile money and ASH keeps 1% of ticket sales. Paid tickets show an entry code.
- Property (ASH Property): student housing, rooms, apartments, houses, shared accommodation, short-term stays, commercial space, properties for sale and land. Listing a property is completely free and ASH takes no commission on rent or sale. Renters and buyers browse, filter (city, university, neighbourhood, price, bedrooms, furnished, amenities), save listings, request a viewing and contact the landlord or agent directly. Listings show an approximate area, never an exact address, and expire automatically so old adverts disappear.
- Property safety: ASH never handles rent, deposits or sale payments. Always tell users to visit the property in person, confirm the identity and ownership of the person, and never send money before a physical visit. A "verified" badge only means ASH checked the level shown on the listing — it is not a guarantee of ownership. Suspicious listings should be reported from the listing page.
- Universal search: one search box across businesses, services, freelancers, projects, deals, events and properties.
- Personal analytics: every member sees their deals, claims, tickets, projects, proposals and promotion spend.
- Referral programme (available in Cameroon and Nigeria): members activate once for 5,000 XAF via mobile money, then earn on activations in their network — level 1 = 1,500 XAF, level 2 = 750 XAF, level 3 = 250 XAF, credited to the wallet.
- Wallet withdrawals go to MTN Mobile Money or Orange Money, minimum 1,000 XAF, reviewed by an admin.
- Booking lifecycle: the client requests -> the provider has 24 hours to accept or decline -> the client then has 24 hours to pay -> the booking becomes Confirmed with an ASH invoice in the chat -> the provider marks it In progress, then Completed. Nobody pays before the provider accepts, and unanswered or unpaid bookings expire automatically.
- Trust: ratings, verified badges, reviews after completed work, reporting and blocking.

Your job:
- Answer questions about how ASH works, in clear simple language.
- When asked about the owner/founder/CEO, name CEO Emmanuel Tanga Divine (the founder of ASH Glo).
- Be action-oriented: when someone describes a need ("I need a plumber in Douala"), point them to the exact ASH surface (search, deals, freelance, events) and the next step.
- For property questions, use only the PROPERTY DATA in the USER CONTEXT block. Never invent listings, prices, availability, landlords, ownership or verification status. If no matching listing is in the context, say so and point the user to the Property search with the right filters, then give general housing guidance clearly labelled as advice rather than as a real listing.
- Use the USER CONTEXT block to give personalised analytics, numbers and advice. Never invent numbers that are not in the context.
- Give short, practical growth advice (pricing, portfolio quality, response speed, promotions, sharing the referral link).
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
    db
      .from("profiles")
      .select("full_name, account_status, referral_code, created_at")
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("wallets")
      .select("available_balance, total_earned, total_withdrawn")
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("referrals").select("level, referred_user_id").eq("referrer_id", userId),
    db
      .from("provider_profiles")
      .select(
        "id, business_name, is_live, subscription_expires_at, rating_avg, rating_count, categories",
      )
      .eq("user_id", userId)
      .maybeSingle(),
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
    const bs = (bookings?.data ?? []) as Array<{
      status: string;
      price: number;
      scheduled_at: string;
    }>;
    const now = Date.now();
    const completed = bs.filter((b) => b.status === "COMPLETED");
    lines.push(
      `Studio: "${pv["business_name"]}" (${pv["is_live"] ? "live" : "offline"}), categories ${JSON.stringify(pv["categories"] ?? [])}, subscription until ${pv["subscription_expires_at"] ?? "not subscribed"}`,
    );
    lines.push(
      `Bookings: total ${bs.length}, pending ${bs.filter((b) => b.status === "PENDING").length}, confirmed ${bs.filter((b) => b.status === "CONFIRMED").length}, completed ${completed.length}, upcoming ${bs.filter((b) => new Date(b.scheduled_at).getTime() > now && ["PENDING", "CONFIRMED"].includes(b.status)).length}`,
    );
    lines.push(
      `Completed revenue: ${completed.reduce((sum, b) => sum + Number(b.price ?? 0), 0)} XAF`,
    );
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
    if (awaiting > 0)
      lines.push(`Action needed: ${awaiting} accepted booking(s) waiting for payment.`);
  } else {
    lines.push("As a client: no bookings yet.");
  }

  const [myProps, liveProps] = await Promise.all([
    db
      .from("property_listings")
      .select(
        "title, category, city, price, currency, price_period, status, view_count, inquiry_count",
      )
      .eq("owner_id", userId)
      .limit(10),
    db
      .from("property_listings")
      .select(
        "title, category, city, neighborhood, price, currency, price_period, bedrooms, is_furnished, university, verification_status",
      )
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const mp = (myProps?.data ?? []) as Array<Record<string, unknown>>;
  const lp = (liveProps?.data ?? []) as Array<Record<string, unknown>>;
  lines.push(
    mp.length > 0
      ? `My property listings: ${mp.map((r) => `${r["title"]} (${r["category"]}, ${r["city"]}, ${r["price"]} ${r["currency"]}${r["price_period"] ? "/" + r["price_period"] : ""}, ${r["status"]}, ${r["view_count"]} views, ${r["inquiry_count"]} inquiries)`).join("; ")}`
      : "My property listings: none.",
  );
  lines.push(
    lp.length > 0
      ? `PROPERTY DATA — newest active listings on ASH (real, do not invent others): ${lp.map((r) => `${r["title"]} (${r["category"]}, ${r["neighborhood"] ? r["neighborhood"] + ", " : ""}${r["city"]}, ${r["price"]} ${r["currency"]}${r["price_period"] ? "/" + r["price_period"] : ""}${r["bedrooms"] ? ", " + r["bedrooms"] + " bed" : ""}${r["is_furnished"] ? ", furnished" : ""}${r["university"] ? ", near " + r["university"] : ""}, verification ${r["verification_status"]})`).join("; ")}`
      : "PROPERTY DATA: no active listings on ASH right now.",
  );

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
        // Photos and camera snapshots arrive as data URLs; keep at most two.
        images: (Array.isArray(m.images) ? m.images : [])
          .filter((src) => typeof src === "string" && src.startsWith("data:image/"))
          .slice(0, 2),
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
          {
            role: "system",
            content: `USER CONTEXT (today ${new Date().toISOString()}):\n${userContext}\nReply language: ${data.lang}`,
          },
          ...data.messages.map((m) =>
            m.images.length > 0
              ? {
                  role: m.role,
                  content: [
                    { type: "text", text: m.content || "Look at this photo and help me." },
                    ...m.images.map((url) => ({ type: "image_url", image_url: { url } })),
                  ],
                }
              : { role: m.role, content: m.content },
          ),
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
