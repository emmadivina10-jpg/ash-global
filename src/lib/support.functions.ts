import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { awaitingSupportReply, unreadSupportMessages } from "./support-state";

export type TicketStatus = "OPEN" | "PENDING" | "RESOLVED";

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender: "CUSTOMER" | "ADMIN";
  body: string;
  email_sent: boolean;
  email_error: string | null;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  last_message_at: string;
  member_read_at: string | null;
  admin_read_at: string | null;
  created_at: string;
  messages: SupportMessage[];
};

const CATEGORIES = ["GENERAL", "PAYMENT", "WITHDRAWAL", "BOOKING", "ACCOUNT", "BUG"] as const;

function ref(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Resolves the signed-in user from the bearer token, or null for guests. */
async function optionalUser(): Promise<{ id: string; email: string | null } | null> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const header = request?.headers?.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.getUser(header.slice(7));
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  } catch {
    return null;
  }
}

/** Public: a member or visitor opens a support ticket. Rate limited per IP. */
export const submitSupportTicket = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; email: string; subject: string; category?: string; message: string }) => ({
    name: String(data?.name ?? "").trim().slice(0, 120),
    email: String(data?.email ?? "").trim().toLowerCase().slice(0, 200),
    subject: String(data?.subject ?? "").trim().slice(0, 160),
    category: String(data?.category ?? "GENERAL").toUpperCase(),
    message: String(data?.message ?? "").trim().slice(0, 4000),
  }))
  .handler(async ({ data }) => {
    if (!data.name || !data.subject || !data.message) {
      return { ok: false as const, error: "MISSING_FIELDS" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
      return { ok: false as const, error: "INVALID_EMAIL" };
    }
    const category = (CATEGORIES as readonly string[]).includes(data.category) ? data.category : "GENERAL";

    const { getRequest } = await import("@tanstack/react-start/server");
    const { clientIp, rateLimit } = await import("./rate-limit.server");
    const request = getRequest();
    if (request) {
      const verdict = await rateLimit({
        bucket: "support-ticket",
        ip: clientIp(request),
        limit: 5,
        windowSeconds: 900,
      });
      if (!verdict.allowed) return { ok: false as const, error: "RATE_LIMITED" };
    }

    const user = await optionalUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        user_id: user?.id ?? null,
        name: data.name,
        email: data.email,
        subject: data.subject,
        category,
      })
      .select("id")
      .single();

    if (error || !ticket) return { ok: false as const, error: error?.message ?? "INSERT_FAILED" };

    await supabaseAdmin.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender: "CUSTOMER",
      body: data.message,
    });

    // Acknowledgement email — never blocks the ticket from being recorded.
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      await sendTemplateEmail("support-received", data.email, {
        templateData: {
          name: data.name,
          subject: data.subject,
          message: data.message,
          ticketRef: ref(ticket.id),
        },
        idempotencyKey: `support-received-${ticket.id}`,
      });
    } catch (err) {
      console.error("[support] acknowledgement email failed", err);
    }

    return { ok: true as const, id: ticket.id, reference: ref(ticket.id) };
  });

/** A signed-in member reads their own conversations. */
export const getMySupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: tickets } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .eq("user_id", context.userId)
    .order("last_message_at", { ascending: false })
    .limit(50);
  const ids = (tickets ?? []).map((t) => t.id);
  const { data: messages } = ids.length
    ? await supabaseAdmin
        .from("support_ticket_messages")
        .select("*")
        .in("ticket_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] as SupportMessage[] };
  return (tickets ?? []).map((t) => ({
    ...t,
    messages: (messages ?? []).filter((m) => m.ticket_id === t.id),
  })) as SupportTicket[];
  });

/** A signed-in member continues one of their own support conversations. */
export const sendMySupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ticketId: string; body: string }) => ({
    ticketId: String(data?.ticketId ?? ""),
    body: String(data?.body ?? "").trim().slice(0, 4000),
  }))
  .handler(async ({ data, context }) => {
    if (!data.ticketId || !data.body) return { ok: false as const, error: "MISSING_FIELDS" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ticket } = await supabaseAdmin
      .from("support_tickets")
      .select("id")
      .eq("id", data.ticketId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!ticket) return { ok: false as const, error: "NOT_FOUND" };

    const { error } = await supabaseAdmin.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender: "CUSTOMER",
      body: data.body,
    });
    if (error) return { ok: false as const, error: error.message };
    await supabaseAdmin.from("support_tickets").update({ status: "OPEN" }).eq("id", ticket.id);
    return { ok: true as const };
  });

/** Records that the member has opened Support Chat. */
export const markMySupportRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ticketId: string }) => ({ ticketId: String(data?.ticketId ?? "") }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("support_tickets")
      .update({ member_read_at: new Date().toISOString() })
      .eq("id", data.ticketId)
      .eq("user_id", context.userId);
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Console (admin) side                                                */
/* ------------------------------------------------------------------ */

export const getConsoleTickets = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");
  const actor = await requireDepartment("SUPPORT");
  const db = await adminClient();

  const { data: tickets, error: ticketError } = await db
    .from("support_tickets")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(200);
  if (ticketError) throw ticketError;

  const ids = (tickets ?? []).map((t) => t.id);
  const { data: messages, error: messageError } = ids.length
    ? await db
        .from("support_ticket_messages")
        .select("*")
        .in("ticket_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] as SupportMessage[], error: null };
  if (messageError) throw messageError;

  const myReads = new Map<string, string>();
  if (actor.staffId && ids.length) {
    const { data: rows, error } = await db
      .from("support_ticket_reads")
      .select("ticket_id, read_at")
      .eq("staff_id", actor.staffId)
      .in("ticket_id", ids);
    if (error) throw error;
    for (const r of rows ?? []) myReads.set(r.ticket_id, r.read_at);
  }

  const rows = (tickets ?? []).map((t) => ({
    ...t,
    reference: ref(t.id),
    my_read_at: actor.staffId ? myReads.get(t.id) ?? null : t.admin_read_at,
    messages: (messages ?? []).filter((m) => m.ticket_id === t.id),
  })) as (SupportTicket & { reference: string; my_read_at: string | null })[];

  return {
    tickets: rows,
    counts: {
      open: rows.filter((t) => t.status === "OPEN").length,
      pending: rows.filter((t) => t.status === "PENDING").length,
      resolved: rows.filter((t) => t.status === "RESOLVED").length,
      awaitingReply: rows.filter(awaitingSupportReply).length,
    },
  };
});

/** Small polling payload for the Support badge in the console navigation. */
export const getSupportAwaitingCount = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");
  const actor = await requireDepartment("SUPPORT");
  const db = await adminClient();
  const { data: tickets, error: ticketError } = await db
    .from("support_tickets")
    .select("id, status, admin_read_at, support_ticket_messages(sender, created_at)")
    .order("last_message_at", { ascending: false })
    .limit(200);
  if (ticketError) throw ticketError;
  const ids = (tickets ?? []).map((t) => t.id);
  const reads = new Map<string, string>();
  if (actor.staffId && ids.length) {
    const { data: rows, error } = await db
      .from("support_ticket_reads")
      .select("ticket_id, read_at")
      .eq("staff_id", actor.staffId)
      .in("ticket_id", ids);
    if (error) throw error;
    for (const r of rows ?? []) reads.set(r.ticket_id, r.read_at);
  }
  const count = (tickets ?? []).filter((ticket) => {
    const messages = (ticket.support_ticket_messages ?? []) as Array<{ sender: string; created_at: string }>;
    const readAt = actor.staffId ? reads.get(ticket.id) ?? null : ticket.admin_read_at;
    return !["RESOLVED", "CLOSED"].includes(ticket.status) && unreadSupportMessages(messages, readAt) > 0;
  }).length;
  return { count };
});

/** Records that THIS support staff member has opened a customer conversation (per-employee, not shared). */
export const markSupportTicketRead = createServerFn({ method: "POST" })
  .inputValidator((data: { ticketId: string }) => ({ ticketId: String(data?.ticketId ?? "") }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    const actor = await requireDepartment("SUPPORT");
    const db = await adminClient();
    const now = new Date().toISOString();
    if (actor.staffId) {
      const { error } = await db
        .from("support_ticket_reads")
        .upsert({ ticket_id: data.ticketId, staff_id: actor.staffId, read_at: now }, { onConflict: "ticket_id,staff_id" });
      if (error) throw error;
    }
    // Team-level "someone has seen it" marker kept for existing reporting.
    const { error } = await db.from("support_tickets").update({ admin_read_at: now }).eq("id", data.ticketId);
    if (error) throw error;
    return { ok: true as const };
  });

/** Admin replies to a ticket; the reply is emailed to the customer. */
export const replyToTicket = createServerFn({ method: "POST" })
  .inputValidator((data: { ticketId: string; body: string; resolve?: boolean }) => ({
    ticketId: String(data?.ticketId ?? ""),
    body: String(data?.body ?? "").trim().slice(0, 6000),
    resolve: Boolean(data?.resolve),
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    const replier = await requireDepartment("SUPPORT");
    if (!data.ticketId || !data.body) return { ok: false as const, error: "MISSING_FIELDS" };
    const db = await adminClient();

    const { data: ticket, error: readError } = await db
      .from("support_tickets")
      .select("id, name, email, subject")
      .eq("id", data.ticketId)
      .single();
    if (readError || !ticket) return { ok: false as const, error: readError?.message ?? "NOT_FOUND" };

    const { data: first } = await db
      .from("support_ticket_messages")
      .select("body")
      .eq("ticket_id", ticket.id)
      .eq("sender", "CUSTOMER")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: saved, error: insertError } = await db
      .from("support_ticket_messages")
      .insert({ ticket_id: ticket.id, sender: "ADMIN", body: data.body, staff_id: replier.staffId })
      .select("id")
      .single();
    if (insertError || !saved) return { ok: false as const, error: insertError?.message ?? "INSERT_FAILED" };

    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      const result = await sendTemplateEmail("support-reply", ticket.email, {
        templateData: {
          name: ticket.name,
          subject: ticket.subject,
          reply: data.body,
          original: first?.body ?? "",
          ticketRef: ref(ticket.id),
        },
        idempotencyKey: `support-reply-${saved.id}`,
      });
      emailSent = result.sent;
      if (!result.sent) emailError = result.reason;
    } catch (err) {
      emailError = err instanceof Error ? err.message : "SEND_FAILED";
    }

    await db
      .from("support_ticket_messages")
      .update({ email_sent: emailSent, email_error: emailError })
      .eq("id", saved.id);

    await db
      .from("support_tickets")
      .update({
        status: data.resolve ? "RESOLVED" : "PENDING",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);

    return { ok: true as const, emailSent, emailError };
  });

export const setTicketStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { ticketId: string; status: TicketStatus }) => ({
    ticketId: String(data?.ticketId ?? ""),
    status: String(data?.status ?? "OPEN") as TicketStatus,
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    await requireDepartment("SUPPORT");
    if (!["OPEN", "PENDING", "RESOLVED"].includes(data.status)) {
      return { ok: false as const, error: "INVALID_STATUS" };
    }
    const db = await adminClient();
    const { error } = await db
      .from("support_tickets")
      .update({ status: data.status })
      .eq("id", data.ticketId);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

export const setTicketPriority = createServerFn({ method: "POST" })
  .inputValidator((data: { ticketId: string; priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" }) => ({
    ticketId: String(data?.ticketId ?? ""),
    priority: data?.priority ?? "NORMAL",
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    await requireDepartment("SUPPORT");
    const db = await adminClient();
    const { error } = await db
      .from("support_tickets")
      .update({ priority: data.priority })
      .eq("id", data.ticketId);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

/** Recent delivery events from Lovable's managed email API. */
export const getEmailDeliveryLogs = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment } = await import("./console.server");
  await requireDepartment("SUPPORT");
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false as const, error: "EMAIL_API_KEY_MISSING", logs: [] as { timestamp: string; recipient: string; event_type: string; status?: string }[] };
  try {
    const { listEmailLogs } = await import("@lovable.dev/email-js");
    const result = await listEmailLogs({ limit: 50 }, { apiKey });
    return { ok: true as const, error: null, logs: result.data ?? [] };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "LOG_FETCH_FAILED",
      logs: [] as { timestamp: string; recipient: string; event_type: string; status?: string }[],
    };
  }
});
