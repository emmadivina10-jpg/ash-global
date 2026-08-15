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

export const getConsoleOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();

  const [fin, profiles, providers, bookings, ledger] = await Promise.all([
    db.rpc("console_financials"),
    db.from("profiles").select("account_status"),
    db.from("provider_profiles").select("billing_mode, is_live"),
    db.from("bookings").select("status, price"),
    db
      .from("transactions")
      .select("id, type, amount, reference, description, status, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const users = profiles.data ?? [];
  const provs = providers.data ?? [];
  const bks = bookings.data ?? [];

  return {
    financials: (fin.data ?? null) as Financials | null,
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.account_status === "ACTIVE").length,
    pendingUsers: users.filter((u) => u.account_status !== "ACTIVE").length,
    totalProviders: provs.length,
    liveProviders: provs.filter((p) => p.is_live).length,
    subscriptionProviders: provs.filter((p) => p.billing_mode === "SUBSCRIPTION").length,
    commissionProviders: provs.filter((p) => p.billing_mode === "COMMISSION").length,
    totalBookings: bks.length,
    completedBookings: bks.filter((b) => b.status === "COMPLETED" || b.status === "SETTLED").length,
    gmv: bks
      .filter((b) => b.status === "COMPLETED" || b.status === "SETTLED")
      .reduce((sum, b) => sum + Number(b.price), 0),
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
        "id, business_name, city, billing_mode, is_live, subscription_expires_at, rating_avg, rating_count, created_at",
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
      fees: p.billing_mode === "COMMISSION" ? Math.round(revenue * 0.01) : 0,
    };
  });
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
    db.from("provider_profiles").select("id, business_name, billing_mode"),
  ]);
  const pMap = new Map((providers.data ?? []).map((p) => [p.id, p]));
  return (bookings.data ?? []).map((b) => ({
    ...b,
    providerName: pMap.get(b.provider_id)?.business_name ?? "—",
    billingMode: pMap.get(b.provider_id)?.billing_mode ?? "SUBSCRIPTION",
    fee: pMap.get(b.provider_id)?.billing_mode === "COMMISSION" ? Math.round(Number(b.price) * 0.01) : 0,
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
