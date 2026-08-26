import { createServerFn } from "@tanstack/react-start";

export type Financials = {
  activation_revenue: number;
  subscription_revenue: number;
  commission_revenue: number;
  booking_cash: number;
  platform_revenue: number;
  provider_owed: number;
  member_owed: number;
  pending_withdrawals: number;
  refund_liability: number;
  paid_out: number;
  cash_in: number;
  cash_on_hand: number;
  total_liabilities: number;
  safe_to_withdraw: number;
  available_to_platform: number;
};

export const consoleStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isUnlocked } = await import("./console.server");
  return { unlocked: await isUnlocked() };
});

export const unlockConsole = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const { passwordMatches, sessionConfig } = await import("./console.server");
    const { useSession } = await import("@tanstack/react-start/server");
    const expected = process.env["CONSOLE_PASSWORD"];
    if (!expected) throw new Error("CONSOLE_PASSWORD is not set");
    if (typeof data.password !== "string" || !passwordMatches(data.password, expected)) {
      return { ok: false as const };
    }
    const session = await useSession<{ unlocked?: boolean }>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockConsole = createServerFn({ method: "POST" }).handler(async () => {
  const { sessionConfig } = await import("./console.server");
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<{ unlocked?: boolean }>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

type Counts = {
  total_users: number;
  active_users: number;
  pending_users: number;
  total_providers: number;
  live_providers: number;
  total_services: number;
  total_bookings: number;
  paid_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  gmv: number;
  completed_gmv: number;
};

export const getConsoleOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();

  // Counts come from the database so they are never capped by API page size.
  const [fin, counts, ledger] = await Promise.all([
    db.rpc("console_financials"),
    db.rpc("console_counts"),
    db
      .from("transactions")
      .select("id, type, amount, reference, description, status, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const c = (counts.data ?? null) as Counts | null;
  const n = (value: number | undefined) => Number(value ?? 0);

  return {
    financials: (fin.data ?? null) as Financials | null,
    financialsError: fin.error?.message ?? null,
    totalUsers: n(c?.total_users),
    activeUsers: n(c?.active_users),
    pendingUsers: n(c?.pending_users),
    totalProviders: n(c?.total_providers),
    liveProviders: n(c?.live_providers),
    totalServices: n(c?.total_services),
    totalBookings: n(c?.total_bookings),
    paidBookings: n(c?.paid_bookings),
    completedBookings: n(c?.completed_bookings),
    pendingBookings: n(c?.pending_bookings),
    gmv: n(c?.gmv),
    completedGmv: n(c?.completed_gmv),
    recent: ledger.data ?? [],
  };
});


export const getConsoleUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const [profiles, roles, wallets] = await Promise.all([
    db
      .from("profiles")
      .select("user_id, full_name, email, phone, referral_code, account_status, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    db.from("user_roles").select("user_id, role"),
    db.from("wallets").select("user_id, available_balance, pending_balance, total_earned"),
  ]);
  const roleMap = new Map<string, string[]>();
  for (const r of roles.data ?? []) {
    roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
  }
  const walletMap = new Map((wallets.data ?? []).map((w) => [w.user_id, w]));
  return (profiles.data ?? []).map((p) => ({
    ...p,
    roles: roleMap.get(p.user_id) ?? [],
    balance: Number(walletMap.get(p.user_id)?.available_balance ?? 0),
    earned: Number(walletMap.get(p.user_id)?.total_earned ?? 0),
  }));
});

export const getConsoleProviders = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const [providers, bookings] = await Promise.all([
    db
      .from("provider_profiles")
      .select(
        "id, business_name, city, slug, is_live, is_verified, verification_status, rating_avg, rating_count, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("bookings").select("provider_id, status, price"),
  ]);
  const bks = bookings.data ?? [];
  return (providers.data ?? []).map((p) => {
    const mine = bks.filter((b) => b.provider_id === p.id);
    const done = mine.filter((b) => b.status === "COMPLETED" || b.status === "SETTLED");
    const revenue = done.reduce((sum, b) => sum + Number(b.price), 0);
    return {
      ...p,
      bookings: mine.length,
      completed: done.length,
      revenue,
      fees: Math.round(revenue * 0.01),
    };
  });
});

export const setProviderVerification = createServerFn({ method: "POST" })
  .inputValidator((data: { providerId: string; approve: boolean }) => ({
    providerId: String(data?.providerId ?? ""),
    approve: Boolean(data?.approve),
  }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    if (!data.providerId) return { ok: false as const, error: "INVALID_PROVIDER" };
    const db = await adminClient();
    const { error } = await db.rpc("console_set_verification", {
      _provider_id: data.providerId,
      _approve: data.approve,
    });
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

export const getConsoleBookings = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const [bookings, providers] = await Promise.all([
    db
      .from("bookings")
      .select("id, provider_id, service_title, price, status, scheduled_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("provider_profiles").select("id, business_name"),
  ]);
  const pMap = new Map((providers.data ?? []).map((p) => [p.id, p]));
  return (bookings.data ?? []).map((b) => ({
    ...b,
    providerName: pMap.get(b.provider_id)?.business_name ?? "—",
    billingMode: "COMMISSION" as const,
    fee: Math.round(Number(b.price) * 0.01),
  }));
});

export const setBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: string }) => data)
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    const allowed = [
      "PENDING",
      "CONFIRMED",
      "IN_PROGRESS",
      "COMPLETED",
      "SETTLED",
      "CANCELLED",
      "DECLINED",
      "NO_SHOW",
      "REFUNDED",
      "DISPUTED",
    ];
    if (!allowed.includes(data.status)) return { ok: false as const, error: "INVALID_STATUS" };
    const db = await adminClient();
    const { error } = await db
      .from("bookings")
      .update({ status: data.status as never })
      .eq("id", data.id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

export const getConsoleWithdrawals = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const { data } = await db
    .from("withdrawals")
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(300);
  return data ?? [];
});

export const settleWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: string; providerReference?: string }) => data)
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    const db = await adminClient();
    const { data: result, error } = await db.rpc("console_settle_withdrawal", {
      _withdrawal_id: data.id,
      _status: data.status,
      ...(data.providerReference ? { _provider_reference: data.providerReference } : {}),
    });
    const payload = result as { ok?: boolean; error?: string } | null;
    if (error || !payload?.ok) {
      return { ok: false as const, error: error?.message ?? payload?.error ?? "FAILED" };
    }
    return { ok: true as const };
  });

export const getConsoleLedger = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const [tx, activations, subs] = await Promise.all([
    db
      .from("transactions")
      .select("id, type, amount, reference, description, status, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    db
      .from("activations")
      .select("id, amount, status, payment_reference, provider_transaction_id, created_at, paid_at")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("provider_subscriptions")
      .select("id, amount, status, payment_reference, period_end, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return {
    transactions: tx.data ?? [],
    activations: activations.data ?? [],
    subscriptions: subs.data ?? [],
  };
});

export const getConsoleDeletionRequests = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();

  const { data: requests } = await db
    .from("account_deletion_requests")
    .select("id, user_id, reason, status, admin_note, reviewed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const list = requests ?? [];
  const ids = [...new Set(list.map((r) => r.user_id))];
  const { data: profiles } = ids.length
    ? await db.from("profiles").select("user_id, full_name, email, phone, account_status").in("user_id", ids)
    : { data: [] as { user_id: string; full_name: string; email: string; phone: string; account_status: string }[] };

  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return list.map((r) => ({ ...r, profile: byUser.get(r.user_id) ?? null }));
});

export const reviewDeletionRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: "APPROVED" | "REJECTED"; note?: string }) => data)
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    if (data.status !== "APPROVED" && data.status !== "REJECTED") throw new Error("INVALID_STATUS");
    const db = await adminClient();

    const { error } = await db
      .from("account_deletion_requests")
      .update({ status: data.status, admin_note: data.note ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.status === "APPROVED") {
      const { data: row } = await db
        .from("account_deletion_requests")
        .select("user_id")
        .eq("id", data.id)
        .maybeSingle();
      if (row?.user_id) {
        await db.from("profiles").update({ account_status: "CLOSED" }).eq("user_id", row.user_id);
      }
    }
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ *
 * Payments & Activations (Phase 2)
 * ------------------------------------------------------------------ */

export type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_reference: string;
  provider_transaction_id: string | null;
  payment_provider: string;
  created_at: string;
  paid_at: string | null;
  user_id: string;
  profile: {
    full_name: string;
    email: string;
    phone: string;
    account_status: string;
    referred_by: string | null;
  } | null;
};

export const getConsolePayments = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();

  const { data: activations } = await db
    .from("activations")
    .select(
      "id, user_id, amount, currency, status, payment_reference, provider_transaction_id, payment_provider, created_at, paid_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = activations ?? [];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = ids.length
    ? await db
        .from("profiles")
        .select("user_id, full_name, email, phone, account_status, referred_by")
        .in("user_id", ids)
    : { data: [] as Array<Record<string, unknown>> };

  const byUser = new Map((profiles ?? []).map((p) => [(p as { user_id: string }).user_id, p]));

  const [{ data: events }, { data: pendingProfiles }] = await Promise.all([
    db
      .from("payment_events")
      .select("id, source, reference, status, signature_verified, outcome, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("profiles")
      .select("user_id, full_name, email, phone, account_status, created_at")
      .neq("account_status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const payments = rows.map((r) => ({
    ...r,
    profile: (byUser.get(r.user_id) as PaymentRow["profile"]) ?? null,
  })) as PaymentRow[];

  const totals = {
    all: payments.length,
    paid: payments.filter((p) => p.status === "PAID").length,
    pending: payments.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").length,
    failed: payments.filter((p) => p.status === "FAILED" || p.status === "CANCELLED").length,
    collected: payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount), 0),
  };

  return {
    payments,
    events: events ?? [],
    unactivated: pendingProfiles ?? [],
    totals,
  };
});

/** Re-checks one activation against the payment provider and completes it when the provider says PAID. */
export const verifyPaymentReference = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string }) => data)
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    const { tchokoPay } = await import("./tchokopay.server");
    const db = await adminClient();

    const verification = await tchokoPay.verifyPayment(data.reference);
    if (!verification.ok) {
      await db.from("payment_events").insert({
        source: "CONSOLE_VERIFY",
        reference: data.reference,
        status: verification.status ?? null,
        outcome: "VERIFY_FAILED",
        detail: { error: verification.error ?? null },
      });
      return { ok: false as const, error: verification.error ?? "VERIFY_FAILED" };
    }

    let outcome = verification.status as string;
    if (verification.status === "PAID") {
      const { error } = await db.rpc("complete_activation", {
        _payment_reference: data.reference,
        _provider_transaction_id: (verification.providerTransactionId ?? null) as unknown as string,
      });
      if (error) outcome = "COMPLETE_FAILED";
    } else if (verification.status === "FAILED" || verification.status === "CANCELLED") {
      await db
        .from("activations")
        .update({ status: verification.status, updated_at: new Date().toISOString() })
        .eq("payment_reference", data.reference)
        .neq("status", "PAID");
    }

    await db.from("payment_events").insert({
      source: "CONSOLE_VERIFY",
      reference: data.reference,
      status: verification.status,
      outcome,
      detail: { provider_transaction_id: verification.providerTransactionId ?? null },
    });

    return { ok: outcome !== "COMPLETE_FAILED", status: verification.status, outcome };
  });

/** Runs provider-authoritative reconciliation over every activation still awaiting payment. */
export const reconcilePayments = createServerFn({ method: "POST" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const { tchokoPay } = await import("./tchokopay.server");
  const db = await adminClient();

  if (!tchokoPay.isConfigured()) return { ok: false as const, error: "PAYMENT_PROVIDER_NOT_CONFIGURED" };

  const { data: pending } = await db
    .from("activations")
    .select("payment_reference")
    .in("status", ["PENDING", "PROCESSING"])
    .order("created_at", { ascending: false })
    .limit(100);

  let activated = 0;
  for (const row of pending ?? []) {
    const verification = await tchokoPay.verifyPayment(row.payment_reference);
    if (!verification.ok) continue;
    if (verification.status === "PAID") {
      const { error } = await db.rpc("complete_activation", {
        _payment_reference: row.payment_reference,
        _provider_transaction_id: (verification.providerTransactionId ?? null) as unknown as string,
      });
      if (!error) activated += 1;
    } else if (verification.status === "FAILED" || verification.status === "CANCELLED") {
      await db
        .from("activations")
        .update({ status: verification.status, updated_at: new Date().toISOString() })
        .eq("payment_reference", row.payment_reference)
        .neq("status", "PAID");
    }
  }

  await db.from("payment_events").insert({
    source: "CONSOLE_RECONCILE",
    outcome: "RECONCILED",
    detail: { checked: pending?.length ?? 0, activated },
  });

  return { ok: true as const, checked: pending?.length ?? 0, activated };
});

/** Manual activation for a member whose money landed outside the platform. Always audited. */
export const manualActivate = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; reason: string }) => data)
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    if (!data.reason || data.reason.trim().length < 5) {
      return { ok: false as const, error: "REASON_REQUIRED" };
    }
    const db = await adminClient();
    const { data: result, error } = await db.rpc("admin_manual_activate", {
      _user_id: data.userId,
      _reason: data.reason.trim(),
      _actor: "CONSOLE",
    });
    const payload = result as { ok?: boolean; error?: string } | null;
    if (error || !payload?.ok) return { ok: false as const, error: error?.message ?? payload?.error ?? "FAILED" };
    return { ok: true as const };
  });

export const getConsoleAuditLog = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const { data } = await db
    .from("admin_audit_log")
    .select("id, actor, action, target_user_id, target_reference, previous_state, new_state, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const list = data ?? [];
  const ids = [...new Set(list.map((r) => r.target_user_id).filter(Boolean))] as string[];
  const { data: profiles } = ids.length
    ? await db.from("profiles").select("user_id, full_name, email").in("user_id", ids)
    : { data: [] as { user_id: string; full_name: string; email: string }[] };
  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return list.map((r) => ({ ...r, profile: r.target_user_id ? (byUser.get(r.target_user_id) ?? null) : null }));
});

export type DayPoint = {
  day: string;
  activations: number;
  subscriptions: number;
  commission: number;
  bookingVolume: number;
  payouts: number;
  signups: number;
};

export type ConsoleAnalytics = {
  series: DayPoint[];
  range: number;
  totals: {
    activations: number;
    subscriptions: number;
    commission: number;
    bookingVolume: number;
    payouts: number;
    signups: number;
    revenue: number;
  };
  channels: { name: string; value: number }[];
};

function dayKey(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

/** Daily platform analytics for the console graphs. Real-time (no cache). */
export const getConsoleAnalytics = createServerFn({ method: "GET" })
  .inputValidator((input: { days?: number } | undefined) => ({
    days: Math.min(Math.max(Number(input?.days ?? 30), 7), 90),
  }))
  .handler(async ({ data }): Promise<ConsoleAnalytics> => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    const db = await adminClient();

    const since = new Date(Date.now() - data.days * 86400000);
    const sinceIso = since.toISOString();

    const [activations, subs, bookings, payouts, signups] = await Promise.all([
      db.from("activations").select("amount, paid_at").eq("status", "PAID").gte("paid_at", sinceIso),
      db
        .from("provider_subscriptions")
        .select("amount, created_at")
        .eq("status", "ACTIVE")
        .gte("created_at", sinceIso),
      db
        .from("bookings")
        .select("price, platform_fee, paid_at")
        .not("paid_at", "is", null)
        .gte("paid_at", sinceIso),
      db.from("withdrawals").select("amount, processed_at").eq("status", "PAID").gte("processed_at", sinceIso),
      db.from("profiles").select("created_at").gte("created_at", sinceIso),
    ]);

    const buckets = new Map<string, DayPoint>();
    for (let i = data.days - 1; i >= 0; i -= 1) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      buckets.set(day, {
        day,
        activations: 0,
        subscriptions: 0,
        commission: 0,
        bookingVolume: 0,
        payouts: 0,
        signups: 0,
      });
    }
    const add = (key: string | null, field: keyof Omit<DayPoint, "day">, amount: number) => {
      if (!key) return;
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket[field] += amount;
    };

    for (const row of activations.data ?? []) add(dayKey(row.paid_at), "activations", Number(row.amount ?? 0));
    for (const row of subs.data ?? []) add(dayKey(row.created_at), "subscriptions", Number(row.amount ?? 0));
    for (const row of bookings.data ?? []) {
      const key = dayKey(row.paid_at);
      add(key, "commission", Number(row.platform_fee ?? 0));
      add(key, "bookingVolume", Number(row.price ?? 0));
    }
    for (const row of payouts.data ?? []) add(dayKey(row.processed_at), "payouts", Number(row.amount ?? 0));
    for (const row of signups.data ?? []) add(dayKey(row.created_at), "signups", 1);

    const series = [...buckets.values()];
    const sum = (field: keyof Omit<DayPoint, "day">) => series.reduce((acc, p) => acc + p[field], 0);
    const totals = {
      activations: sum("activations"),
      subscriptions: sum("subscriptions"),
      commission: sum("commission"),
      bookingVolume: sum("bookingVolume"),
      payouts: sum("payouts"),
      signups: sum("signups"),
      revenue: sum("activations") + sum("subscriptions") + sum("commission"),
    };

    return {
      series,
      range: data.days,
      totals,
      channels: [
        { name: "Activations", value: totals.activations },
        { name: "Subscriptions", value: totals.subscriptions },
        { name: "Booking commission", value: totals.commission },
      ].filter((c) => c.value > 0),
    };
  });

export type SecurityEvent = {
  id: string;
  kind: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  subject: string | null;
  actor_user_id: string | null;
  route: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};

export type SecurityOverview = {
  since: string;
  total: number;
  critical: number;
  warn: number;
  by_kind: { kind: string; count: number }[];
  top_subjects: { subject: string; count: number; kinds: string[] }[];
  last_selfcheck: { severity: string; detail: Record<string, unknown>; created_at: string } | null;
};

/** Security audit log + suspicious-activity summary for the console. */
export const getSecurityAudit = createServerFn({ method: "GET" })
  .inputValidator((input: { hours?: number } | undefined) => ({
    hours: Math.min(Math.max(Number(input?.hours ?? 24), 1), 720),
  }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    const db = await adminClient();

    const [overview, events] = await Promise.all([
      db.rpc("security_overview", { _hours: data.hours }),
      db
        .from("security_events")
        .select("id, kind, severity, subject, actor_user_id, route, detail, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    return {
      overview: (overview.data ?? null) as SecurityOverview | null,
      overviewError: overview.error?.message ?? null,
      events: (events.data ?? []) as SecurityEvent[],
    };
  });

/** Runs the database security self-check on demand from the console. */
export const runSecuritySelfCheck = createServerFn({ method: "POST" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const { data, error } = await db.rpc("security_selfcheck");
  if (error) return { ok: false as const, error: error.message };
  return {
    ok: true as const,
    report: data as { ok: boolean; critical: number; warn: number; findings: { code: string; severity: string; object: string; detail: string }[] },
  };
});
