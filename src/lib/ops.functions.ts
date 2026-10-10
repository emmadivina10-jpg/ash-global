import { createServerFn } from "@tanstack/react-start";

/* ------------------------------------------------------------------ *
 * Internal operations: staff chat, daily tickets, AI briefing and
 * direct member messaging. Nothing in here touches wallets, payments,
 * withdrawals or the referral ledger.
 * ------------------------------------------------------------------ */

export type StaffMessage = {
  id: string;
  channel: string;
  author_name: string;
  author_department: string;
  author_staff_id?: string | null;
  author_avatar_url?: string | null;
  author_position?: string | null;
  body: string;
  created_at: string;
};

export type DepartmentTask = {
  id: string;
  department: string;
  title: string;
  detail: string | null;
  due_date: string;
  status: string;
  priority: string;
  source: string;
  created_by: string | null;
  completed_at: string | null;
};

export type BriefingSuggestion = {
  department: string;
  title: string;
  detail: string;
  priority: string;
};

const CHANNELS = ["GENERAL", "LEADERSHIP", "SUPPORT", "REVENUE", "GROWTH", "TRUST", "CYBERSECURITY"] as const;

function cleanChannel(value: unknown) {
  const channel = String(value ?? "GENERAL").toUpperCase();
  return (CHANNELS as readonly string[]).includes(channel) ? channel : "GENERAL";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------------------------- staff chat --------------------------- */

export const getStaffChat = createServerFn({ method: "POST" })
  .inputValidator((data: { channel?: string }) => ({ channel: cleanChannel(data?.channel) }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    const db = await adminClient();

    const { data: rows, error } = await db
      .from("staff_channel_messages")
      .select("id, channel, author_name, author_department, author_staff_id, body, created_at")
      .eq("channel", data.channel)
      .order("created_at", { ascending: false })
      .limit(120);

    if (error) throw new Error("Team messages could not be loaded.");
    const messages = (rows ?? []) as StaffMessage[];
    const staffIds = [...new Set(messages.flatMap((message) => message.author_staff_id ? [message.author_staff_id] : []))];
    const profiles = new Map<string, { name: string | null; position: string | null; avatar: string | null }>();
    if (staffIds.length) {
      const { data: staff, error: staffError } = await db.from("staff_accounts")
        .select("id, employee_name, full_name, position, avatar_url")
        .in("id", staffIds);
      if (staffError) throw new Error("Employee profiles could not be loaded.");
      await Promise.all((staff ?? []).map(async (profile) => {
        const avatar = profile.avatar_url
          ? (await db.storage.from("staff-avatars").createSignedUrl(profile.avatar_url, 60 * 60)).data?.signedUrl ?? null
          : null;
        profiles.set(profile.id, {
          name: profile.employee_name || profile.full_name,
          position: profile.position,
          avatar,
        });
      }));
    }
    return {
      channel: data.channel,
      me: actor.name,
      meStaffId: actor.staffId,
      messages: messages.slice().reverse().map((message) => {
        const profile = message.author_staff_id ? profiles.get(message.author_staff_id) : undefined;
        return {
          ...message,
          author_name: profile?.name || message.author_name,
          author_position: profile?.position ?? null,
          author_avatar_url: profile?.avatar ?? null,
        };
      }),
    };
  });

export const postStaffMessage = createServerFn({ method: "POST" })
  .inputValidator((data: { channel?: string; body: string }) => ({
    channel: cleanChannel(data?.channel),
    body: String(data?.body ?? "").trim().slice(0, 4000),
  }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    if (!data.body) return { ok: false as const, error: "EMPTY" };

    const db = await adminClient();
    const { error } = await db.from("staff_channel_messages").insert({
      channel: data.channel,
      author_name: actor.name,
      author_department: actor.department,
      author_staff_id: actor.staffId,
      body: data.body,
    });

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/* --------------------------- daily tickets ------------------------- */

export const getDepartmentTasks = createServerFn({ method: "POST" })
  .inputValidator((data: { department?: string; all?: boolean }) => ({
    department: String(data?.department ?? "").toUpperCase(),
    all: Boolean(data?.all),
  }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    const db = await adminClient();

    const scope = actor.superAdmin && data.all ? null : data.department || actor.department;

    let query = db
      .from("department_tasks")
      .select("id, department, title, detail, due_date, status, priority, source, created_by, completed_at")
      .order("due_date", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(200);

    if (scope) query = query.eq("department", scope);

    const { data: rows } = await query;
    const tasks = (rows ?? []) as DepartmentTask[];

    return {
      tasks,
      today: tasks.filter((t) => t.due_date === today()),
      openCount: tasks.filter((t) => t.status === "OPEN").length,
    };
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { taskId: string; status: string }) => ({
    taskId: String(data?.taskId ?? ""),
    status: String(data?.status ?? "OPEN").toUpperCase() === "DONE" ? "DONE" : "OPEN",
  }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    const db = await adminClient();

    const { data: task } = await db
      .from("department_tasks")
      .select("id, department")
      .eq("id", data.taskId)
      .maybeSingle();

    if (!task) return { ok: false as const, error: "NOT_FOUND" };
    if (!actor.superAdmin && task.department !== actor.department) {
      return { ok: false as const, error: "FORBIDDEN" };
    }

    const { error } = await db
      .from("department_tasks")
      .update({
        status: data.status,
        completed_at: data.status === "DONE" ? new Date().toISOString() : null,
        completed_by: data.status === "DONE" ? actor.name : null,
      })
      .eq("id", data.taskId);

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** Super admin issues tickets — either a hand-written one or a whole AI-suggested set. */
export const issueTickets = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { tasks: { department: string; title: string; detail?: string; priority?: string }[]; source?: string }) => ({
      source: String(data?.source ?? "ADMIN").toUpperCase() === "AI" ? "AI" : "ADMIN",
      tasks: (Array.isArray(data?.tasks) ? data.tasks : [])
        .slice(0, 60)
        .map((task) => ({
          department: String(task?.department ?? "").toUpperCase().slice(0, 40),
          title: String(task?.title ?? "").trim().slice(0, 160),
          detail: String(task?.detail ?? "").trim().slice(0, 1200) || null,
          priority: ["LOW", "NORMAL", "HIGH"].includes(String(task?.priority ?? "").toUpperCase())
            ? String(task.priority).toUpperCase()
            : "NORMAL",
        }))
        .filter((task) => task.department && task.title),
    }),
  )
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient, DEPARTMENTS } = await import("./console.server");
    const actor = await requireSuperAdmin();
    const valid = data.tasks.filter((task) => (DEPARTMENTS as readonly string[]).includes(task.department));
    if (valid.length === 0) return { ok: false as const, error: "NO_TASKS", issued: 0 };

    const db = await adminClient();
    const due = today();

    const { error, count } = await db
      .from("department_tasks")
      .upsert(
        valid.map((task) => ({
          ...task,
          due_date: due,
          status: "OPEN",
          source: data.source,
          created_by: actor.name,
        })),
        { onConflict: "department,due_date,title", ignoreDuplicates: true, count: "exact" },
      );

    if (error) return { ok: false as const, error: error.message, issued: 0 };
    return { ok: true as const, issued: count ?? valid.length };
  });

/* --------------------------- AI briefing --------------------------- */

export const getDailyBriefing = createServerFn({ method: "GET" }).handler(async () => {
  const { requireSuperAdmin, adminClient } = await import("./console.server");
  await requireSuperAdmin();
  const db = await adminClient();

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [counts, fin, withdrawals, tickets, bookings, signups, providers] = await Promise.all([
    db.rpc("console_counts"),
    db.rpc("console_financials"),
    db.from("withdrawals").select("id, status, amount").in("status", ["PENDING", "PROCESSING"]),
    db.from("support_tickets").select("id, status, priority").in("status", ["OPEN", "PENDING"]),
    db.from("bookings").select("id, status").in("status", ["PENDING", "ACCEPTED"]),
    db.from("profiles").select("user_id").gte("created_at", since),
    db.from("provider_profiles").select("id, is_verified").eq("is_verified", false),
  ]);

  const c = (counts.data ?? {}) as Record<string, number>;
  const f = (fin.data ?? {}) as Record<string, number>;

  const metrics = {
    totalUsers: Number(c["total_users"] ?? 0),
    activeUsers: Number(c["active_users"] ?? 0),
    pendingUsers: Number(c["pending_users"] ?? 0),
    liveProviders: Number(c["live_providers"] ?? 0),
    pendingBookings: bookings.data?.length ?? 0,
    signups7d: signups.data?.length ?? 0,
    unverifiedProviders: providers.data?.length ?? 0,
    openTickets: tickets.data?.length ?? 0,
    pendingWithdrawals: withdrawals.data?.length ?? 0,
    pendingWithdrawalValue: (withdrawals.data ?? []).reduce((sum, w) => sum + Number(w.amount ?? 0), 0),
    platformRevenue: Number(f["platform_revenue"] ?? 0),
    safeToWithdraw: Number(f["safe_to_withdraw"] ?? 0),
  };

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { metrics, suggestions: [] as BriefingSuggestion[], error: "AI_UNAVAILABLE" };

  const prompt = `You are the chief of staff for ASH Glo, a Cameroon services + referral marketplace.
Today's live platform numbers (XAF): ${JSON.stringify(metrics)}.
Departments you may assign work to: SUPPORT, GROWTH, SALES, MARKETPLACE_OPS, ADVERTISING, PARTNERSHIPS, CONTENT, MERCHANT, EXPANSION, REVENUE, TRUST, CYBERSECURITY.
Propose between 5 and 9 concrete tasks for TODAY, each tied to a number above.
Reply with JSON only: {"tasks":[{"department":"...","title":"short action","detail":"one or two sentences explaining why, citing the number","priority":"LOW|NORMAL|HIGH"}]}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      return { metrics, suggestions: [] as BriefingSuggestion[], error: `AI_${response.status}`, detail: message.slice(0, 300) };
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { tasks?: BriefingSuggestion[] };

    const suggestions = (parsed.tasks ?? [])
      .slice(0, 12)
      .map((task) => ({
        department: String(task.department ?? "").toUpperCase(),
        title: String(task.title ?? "").slice(0, 160),
        detail: String(task.detail ?? "").slice(0, 600),
        priority: ["LOW", "NORMAL", "HIGH"].includes(String(task.priority ?? "").toUpperCase())
          ? String(task.priority).toUpperCase()
          : "NORMAL",
      }))
      .filter((task) => task.department && task.title);

    return { metrics, suggestions, error: null as string | null };
  } catch (err) {
    return {
      metrics,
      suggestions: [] as BriefingSuggestion[],
      error: err instanceof Error ? err.message : "AI_FAILED",
    };
  }
});

/* ---------------------- direct member messaging -------------------- */

export const searchMembers = createServerFn({ method: "POST" })
  .inputValidator((data: { term: string }) => ({ term: String(data?.term ?? "").trim().slice(0, 80) }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    if (data.term.length < 2) return [];

    const db = await adminClient();
    const like = `%${data.term}%`;

    const { data: rows } = await db
      .from("profiles")
      .select("user_id, full_name, email, phone, account_status")
      .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(15);

    return rows ?? [];
  });

/**
 * Writes to a single member. The message opens (or continues) a support
 * thread the member can reply to, and pings their in-app notifications.
 */
export const messageMember = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; subject: string; body: string; kind?: string }) => ({
    userId: String(data?.userId ?? ""),
    subject: String(data?.subject ?? "").trim().slice(0, 140),
    body: String(data?.body ?? "").trim().slice(0, 4000),
    kind: String(data?.kind ?? "MESSAGE").toUpperCase() === "SECURITY" ? "SECURITY" : "MESSAGE",
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    const actor = await requireDepartment("SUPPORT", "CYBERSECURITY", "TRUST");

    if (!data.userId || !data.subject || !data.body) return { ok: false as const, error: "MISSING_FIELDS" };

    const db = await adminClient();

    const { data: profile } = await db
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("user_id", data.userId)
      .maybeSingle();

    if (!profile) return { ok: false as const, error: "MEMBER_NOT_FOUND" };

    const security = data.kind === "SECURITY";

    const { data: ticket, error: ticketError } = await db
      .from("support_tickets")
      .insert({
        user_id: profile.user_id,
        name: profile.full_name ?? "Member",
        email: profile.email ?? "",
        subject: data.subject,
        category: security ? "SECURITY" : "ACCOUNT",
        priority: security ? "HIGH" : "NORMAL",
        status: "PENDING",
      })
      .select("id")
      .single();

    if (ticketError || !ticket) return { ok: false as const, error: ticketError?.message ?? "TICKET_FAILED" };

    await db.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender: "ADMIN",
      body: data.body,
    });

    await db.rpc("notify_user", {
      _user_id: profile.user_id,
      _category: security ? "SECURITY" : "SUPPORT",
      _title: security ? `Security alert: ${data.subject}` : data.subject,
      _body: data.body.slice(0, 240),
      _data: { ticketId: ticket.id, from: actor.department },
    });

    await db.from("admin_audit_log").insert({
      actor: actor.name,
      action: security ? "SECURITY_ALERT_SENT" : "MEMBER_MESSAGE_SENT",
      new_state: { userId: profile.user_id, subject: data.subject },
    });

    return { ok: true as const, ticketId: ticket.id };
  });

/* ----------------------- member statement (admin) ------------------ */

export const getMemberStatement = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string }) => ({ userId: String(data?.userId ?? "") }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    const { canReviewMember } = await import("./member-insights");
    if (!canReviewMember(actor)) throw new Error("FORBIDDEN_MEMBER_REVIEW");
    const db = await adminClient();

    const [profile, wallet, transactions] = await Promise.all([
      db.from("profiles").select("user_id, full_name, email, phone, referral_code, account_status, created_at").eq("user_id", data.userId).maybeSingle(),
      db.from("wallets").select("available_balance, pending_balance, total_earned, total_withdrawn").eq("user_id", data.userId).maybeSingle(),
      db
        .from("transactions")
        .select("id, type, amount, reference, description, status, created_at")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    return {
      profile: profile.data,
      wallet: wallet.data,
      transactions: transactions.data ?? [],
    };
  });
