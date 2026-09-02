import { createServerFn } from "@tanstack/react-start";

export type ContactCard = {
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  accountStatus: string | null;
  referralCode: string | null;
  joinedAt: string | null;
  walletAvailable: number;
  totalEarned: number;
  bookingsCount: number;
  providerName: string | null;
  providerVerified: boolean;
  providerId: string | null;
  city: string | null;
};

/** Pulls everything the agent needs about a person from their email or phone. */
export const lookupContact = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string }) => ({
    query: String(data?.query ?? "").trim().toLowerCase().slice(0, 200),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; contact: ContactCard | null }> => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    if (!data.query) return { ok: false, contact: null };
    const db = await adminClient();

    const { data: profile } = await db
      .from("profiles")
      .select("user_id, full_name, email, phone, referral_code, account_status, created_at")
      .or(`email.eq.${data.query},phone.eq.${data.query}`)
      .limit(1)
      .maybeSingle();

    if (!profile) return { ok: true, contact: null };

    const [wallet, bookings, provider] = await Promise.all([
      db
        .from("wallets")
        .select("available_balance, total_earned")
        .eq("user_id", profile.user_id)
        .maybeSingle(),
      db.from("bookings").select("id", { count: "exact", head: true }).eq("client_id", profile.user_id),
      db
        .from("provider_profiles")
        .select("id, business_name, is_verified, city, whatsapp, phone")
        .eq("user_id", profile.user_id)
        .maybeSingle(),
    ]);

    return {
      ok: true,
      contact: {
        userId: profile.user_id,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        whatsapp: provider.data?.whatsapp ?? profile.phone,
        accountStatus: profile.account_status,
        referralCode: profile.referral_code,
        joinedAt: profile.created_at,
        walletAvailable: Number(wallet.data?.available_balance ?? 0),
        totalEarned: Number(wallet.data?.total_earned ?? 0),
        bookingsCount: bookings.count ?? 0,
        providerName: provider.data?.business_name ?? null,
        providerVerified: Boolean(provider.data?.is_verified),
        providerId: provider.data?.id ?? null,
        city: provider.data?.city ?? null,
      },
    };
  });

/** Sends the branded ASH Glo email and records it in the outreach log. */
export const sendOutreachEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      to: string;
      subject: string;
      message: string;
      templateKey?: string;
      userId?: string | null;
      ticketId?: string | null;
      leadId?: string | null;
      department?: string;
    }) => ({
      to: String(data?.to ?? "").trim().toLowerCase().slice(0, 200),
      subject: String(data?.subject ?? "").trim().slice(0, 180),
      message: String(data?.message ?? "").trim().slice(0, 8000),
      templateKey: String(data?.templateKey ?? "custom").slice(0, 60),
      userId: data?.userId ?? null,
      ticketId: data?.ticketId ?? null,
      leadId: data?.leadId ?? null,
      department: String(data?.department ?? "Customer Support").slice(0, 60),
    }),
  )
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.to)) {
      return { ok: false as const, error: "INVALID_EMAIL" };
    }
    if (!data.subject || !data.message) return { ok: false as const, error: "MISSING_FIELDS" };

    let delivered = false;
    let error: string | null = null;
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      const result = await sendTemplateEmail("ash-outreach", data.to, {
        templateData: {
          name: data.to,
          subject: data.subject,
          message: data.message,
          agent: actor.name,
          department: data.department,
        },
      });
      delivered = result.sent;
      if (!result.sent) error = result.reason;
    } catch (err) {
      error = err instanceof Error ? err.message : "SEND_FAILED";
    }

    const db = await adminClient();
    await db.from("outreach_log").insert({
      channel: "EMAIL",
      target_user_id: data.userId,
      ticket_id: data.ticketId,
      lead_id: data.leadId,
      recipient: data.to,
      subject: data.subject,
      body: data.message,
      template_key: data.templateKey,
      staff_id: actor.staffId,
      staff_name: actor.name,
      delivered,
      error,
    });

    if (data.ticketId) {
      await db.from("support_ticket_messages").insert({
        ticket_id: data.ticketId,
        sender: "ADMIN",
        body: data.message,
        email_sent: delivered,
        email_error: error,
      });
      await db
        .from("support_tickets")
        .update({ status: "PENDING", last_message_at: new Date().toISOString() })
        .eq("id", data.ticketId);
    }

    return { ok: delivered, error };
  });

/** WhatsApp is opened in the agent's browser; this records that it happened. */
export const logOutreach = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      channel: "WHATSAPP" | "CALL" | "SMS";
      recipient: string;
      body: string;
      templateKey?: string;
      userId?: string | null;
      leadId?: string | null;
      ticketId?: string | null;
    }) => ({
      channel: (["WHATSAPP", "CALL", "SMS"] as const).includes(data?.channel) ? data.channel : "WHATSAPP",
      recipient: String(data?.recipient ?? "").slice(0, 120),
      body: String(data?.body ?? "").slice(0, 8000),
      templateKey: String(data?.templateKey ?? "custom").slice(0, 60),
      userId: data?.userId ?? null,
      leadId: data?.leadId ?? null,
      ticketId: data?.ticketId ?? null,
    }),
  )
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    const db = await adminClient();
    await db.from("outreach_log").insert({
      channel: data.channel,
      recipient: data.recipient,
      body: data.body,
      template_key: data.templateKey,
      target_user_id: data.userId,
      lead_id: data.leadId,
      ticket_id: data.ticketId,
      staff_id: actor.staffId,
      staff_name: actor.name,
      delivered: true,
    });
    return { ok: true as const };
  });

export const getOutreachLog = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const { data } = await db
    .from("outreach_log")
    .select("id, channel, recipient, subject, template_key, staff_name, delivered, error, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  return data ?? [];
});
