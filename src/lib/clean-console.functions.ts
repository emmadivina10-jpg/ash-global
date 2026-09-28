import { createServerFn } from "@tanstack/react-start";

async function ctx(write = false) {
  const { requireConsole, requireDepartment, adminClient } = await import("./console.server");
  const actor = write ? await requireDepartment("MARKETPLACE_OPS", "SUPPORT") : await requireConsole();
  return { actor, db: await adminClient() };
}

async function event(db: Awaited<ReturnType<typeof ctx>>["db"], orderId: string, status: string, note: string | null, actor: string) {
  await db.from("clean_status_events").insert({ order_id: orderId, status, note, actor });
}

async function notify(db: Awaited<ReturnType<typeof ctx>>["db"], userId: string, orderId: string, title: string, body: string) {
  await db.from("notifications").insert({
    user_id: userId,
    category: "ASH_CLEAN",
    title,
    body,
    data: { link: `/clean/orders/${orderId}`, order_id: orderId },
  });
}

export const getCleanConsole = createServerFn({ method: "GET" })
  .inputValidator((i: { status?: string; q?: string } | undefined) => ({
    status: String(i?.status ?? "").slice(0, 30),
    q: String(i?.q ?? "").trim().slice(0, 40),
  }))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    let query = db
      .from("clean_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) query = query.eq("status", data.status);
    if (data.q) query = query.or(`order_no.ilike.%${data.q.replace(/[,%()]/g, "")}%,receipt_no.ilike.%${data.q.replace(/[,%()]/g, "")}%`);
    const [{ data: orders }, { data: all }, { data: settings }, { data: bands }, { data: services }, { data: roles }] =
      await Promise.all([
        query,
        db.from("clean_orders").select("status, payment_status, total"),
        db.from("clean_settings").select("*").eq("id", 1).single(),
        db.from("clean_distance_bands").select("*").order("min_km"),
        db.from("clean_services").select("*").order("sort"),
        db.from("user_roles").select("user_id").eq("role", "clean_worker" as never),
      ]);
    const ids = Array.from(new Set([...(orders ?? []).map((o) => o.customer_id), ...(roles ?? []).map((r) => r.user_id)]));
    const { data: profiles } = ids.length
      ? await db.from("profiles").select("user_id, full_name, email, phone").in("user_id", ids)
      : { data: [] };
    const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const counts: Record<string, number> = {};
    let revenue = 0;
    for (const o of all ?? []) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
      if (o.payment_status === "PAID") revenue += Number(o.total ?? 0);
    }
    return {
      orders: (orders ?? []).map((o) => ({ ...o, customer: byId.get(o.customer_id) ?? null })),
      counts,
      revenue,
      total: all?.length ?? 0,
      settings,
      bands: bands ?? [],
      services: services ?? [],
      workers: (roles ?? []).map((r) => ({ user_id: r.user_id, ...(byId.get(r.user_id) ?? {}) })),
    };
  });

export const getCleanConsoleOrder = createServerFn({ method: "GET" })
  .inputValidator((i: { id: string }) => ({ id: String(i?.id ?? "") }))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const [{ data: order }, { data: events }, { data: quotes }, { data: jobs }] = await Promise.all([
      db.from("clean_orders").select("*").eq("id", data.id).maybeSingle(),
      db.from("clean_status_events").select("*").eq("order_id", data.id).order("created_at"),
      db.from("clean_price_quotes").select("*").eq("order_id", data.id).order("created_at", { ascending: false }),
      db.from("clean_assignments").select("*").eq("order_id", data.id),
    ]);
    return { order, events: events ?? [], quotes: quotes ?? [], jobs: jobs ?? [] };
  });

/** Enter the verified weight; the server prices it from current settings. */
export const weighCleanOrder = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; weightKg: number; specials: { code: string; qty: number }[] }) => {
    const w = Number(i?.weightKg);
    if (!Number.isFinite(w) || w <= 0 || w > 200) throw new Error("INVALID_WEIGHT");
    return {
      id: String(i.id),
      weightKg: Math.round(w * 100) / 100,
      specials: (i.specials ?? [])
        .map((s) => ({ code: String(s.code).slice(0, 20), qty: Math.max(0, Math.min(50, Math.floor(Number(s.qty) || 0))) }))
        .filter((s) => s.qty > 0),
    };
  })
  .handler(async ({ data }) => {
    const { actor, db } = await ctx(true);
    const [{ data: o }, { data: s }, { data: services }] = await Promise.all([
      db.from("clean_orders").select("*").eq("id", data.id).maybeSingle(),
      db.from("clean_settings").select("price_per_kg").eq("id", 1).single(),
      db.from("clean_services").select("code, name_en, price").eq("kind", "SPECIAL"),
    ]);
    if (!o || !s) throw new Error("NOT_FOUND");
    if (o.payment_status === "PAID") throw new Error("ALREADY_PAID");
    const rate = Number(s.price_per_kg);
    const laundry = Math.round(data.weightKg * rate);
    const items = data.specials.flatMap((sp) => {
      const svc = (services ?? []).find((x) => x.code === sp.code);
      return svc ? [{ code: sp.code, name: svc.name_en, qty: sp.qty, unit: Number(svc.price), amount: sp.qty * Number(svc.price) }] : [];
    });
    const special = items.reduce((a, b) => a + b.amount, 0);
    const total = laundry + special + Number(o.pickup_fee) + Number(o.delivery_fee);
    if (o.current_quote_id) await db.from("clean_price_quotes").update({ status: "SUPERSEDED" }).eq("id", o.current_quote_id);
    const { data: q } = await db
      .from("clean_price_quotes")
      .insert({
        order_id: o.id,
        weight_kg: data.weightKg,
        rate_per_kg: rate,
        laundry_amount: laundry,
        special_items: items,
        special_amount: special,
        pickup_fee: o.pickup_fee,
        delivery_fee: o.delivery_fee,
        total,
        created_by: actor.name,
      })
      .select("id")
      .single();
    await db
      .from("clean_orders")
      .update({ weight_kg: data.weightKg, total, current_quote_id: q?.id ?? null, status: "AWAITING_APPROVAL" })
      .eq("id", o.id);
    await event(db, o.id, "WEIGHED", `${data.weightKg} kg × ${rate} FCFA`, actor.name);
    await event(db, o.id, "AWAITING_APPROVAL", `Total ${total} FCFA sent to customer`, actor.name);
    await notify(db, o.customer_id, o.id, "Your ASH Clean price is ready", `${o.order_no}: ${data.weightKg} kg, total ${total.toLocaleString("fr-FR")} FCFA. Tap to approve and pay.`);
    return { ok: true, total };
  });

const FACILITY_STEPS = ["RECEIVED", "WASHING", "DRYING", "IRONING", "FOLDING", "QUALITY_CHECK", "PACKED", "READY", "CANCELLED"] as const;

export const advanceCleanOrder = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; status: (typeof FACILITY_STEPS)[number]; note?: string }) => {
    if (!FACILITY_STEPS.includes(i?.status)) throw new Error("BAD_STATUS");
    return { id: String(i.id), status: i.status, note: String(i.note ?? "").slice(0, 200) };
  })
  .handler(async ({ data }) => {
    const { actor, db } = await ctx(true);
    const { data: o } = await db.from("clean_orders").select("id, customer_id, order_no, payment_status").eq("id", data.id).maybeSingle();
    if (!o) throw new Error("NOT_FOUND");
    // Washing never starts before the customer has paid the approved price.
    if (["WASHING", "DRYING", "IRONING", "FOLDING", "QUALITY_CHECK", "PACKED", "READY"].includes(data.status) && o.payment_status !== "PAID")
      throw new Error("NOT_PAID");
    await db.from("clean_orders").update({ status: data.status }).eq("id", o.id);
    await event(db, o.id, data.status, data.note || null, actor.name);
    if (data.status === "READY")
      await notify(db, o.customer_id, o.id, "Your laundry is ready", `${o.order_no} is packed and will be delivered soon.`);
    return { ok: true };
  });

export const assignCleanJob = createServerFn({ method: "POST" })
  .inputValidator((i: { orderId: string; direction: "PICKUP" | "DELIVERY"; workerId: string | null }) => ({
    orderId: String(i.orderId),
    direction: i.direction === "DELIVERY" ? ("DELIVERY" as const) : ("PICKUP" as const),
    workerId: i.workerId ? String(i.workerId) : null,
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await ctx(true);
    await db
      .from("clean_assignments")
      .update({ worker_id: data.workerId, status: data.workerId ? "ACCEPTED" : "OPEN" })
      .eq("order_id", data.orderId)
      .eq("direction", data.direction);
    if (data.workerId) {
      await db.from("clean_orders").update({ status: data.direction === "PICKUP" ? "PICKUP_ASSIGNED" : "DELIVERY_ASSIGNED" }).eq("id", data.orderId);
      await event(db, data.orderId, data.direction === "PICKUP" ? "PICKUP_ASSIGNED" : "DELIVERY_ASSIGNED", null, actor.name);
    }
    return { ok: true };
  });

export const saveCleanSettings = createServerFn({ method: "POST" })
  .inputValidator((i: Record<string, unknown>) => {
    const n = (k: string) => {
      const v = Number(i[k]);
      if (!Number.isFinite(v) || v < 0) throw new Error(`INVALID_${k}`);
      return v;
    };
    return {
      price_per_kg: n("price_per_kg"),
      facility_address: String(i['facility_address'] ?? "").slice(0, 200),
      facility_lat: n("facility_lat"),
      facility_lng: Number(i['facility_lng']),
      facility_phone: String(i['facility_phone'] ?? "").slice(0, 30) || null,
      facility_hours: String(i['facility_hours'] ?? "").slice(0, 100),
      staff_radius_km: n("staff_radius_km"),
      max_staff_km: n("max_staff_km"),
      min_rider_fee: n("min_rider_fee"),
      base_pickup_fee: n("base_pickup_fee"),
      base_delivery_fee: n("base_delivery_fee"),
      far_fee_per_km: n("far_fee_per_km"),
      staff_pickup_enabled: Boolean(i['staff_pickup_enabled']),
      staff_delivery_enabled: Boolean(i['staff_delivery_enabled']),
      rider_enabled: Boolean(i['rider_enabled']),
      cash_enabled: Boolean(i['cash_enabled']),
    };
  })
  .handler(async ({ data }) => {
    const { db } = await ctx(true);
    const { error } = await db.from("clean_settings").update({ ...data, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveCleanBands = createServerFn({ method: "POST" })
  .inputValidator((i: { bands: { min_km: number; max_km: number | null; fee: number }[] }) => ({
    bands: (i.bands ?? []).slice(0, 20).map((b) => ({
      min_km: Math.max(0, Number(b.min_km) || 0),
      max_km: b.max_km === null || b.max_km === undefined || String(b.max_km) === "" ? null : Number(b.max_km),
      fee: Math.max(0, Number(b.fee) || 0),
    })),
  }))
  .handler(async ({ data }) => {
    const { db } = await ctx(true);
    await db.from("clean_distance_bands").delete().gte("min_km", 0);
    if (data.bands.length) await db.from("clean_distance_bands").insert(data.bands);
    return { ok: true };
  });

export const saveCleanService = createServerFn({ method: "POST" })
  .inputValidator((i: { id?: string; code: string; kind: string; name_en: string; name_fr: string; price: number; active: boolean }) => ({
    id: i.id ? String(i.id) : undefined,
    code: String(i.code).toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 20),
    kind: i.kind === "SPECIAL" ? "SPECIAL" : "SERVICE",
    name_en: String(i.name_en).slice(0, 60),
    name_fr: String(i.name_fr || i.name_en).slice(0, 60),
    price: Math.max(0, Number(i.price) || 0),
    active: Boolean(i.active),
  }))
  .handler(async ({ data }) => {
    const { db } = await ctx(true);
    if (!data.code || !data.name_en) throw new Error("MISSING_FIELDS");
    const { id, ...row } = data;
    const { error } = id
      ? await db.from("clean_services").update(row).eq("id", id)
      : await db.from("clean_services").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCleanWorker = createServerFn({ method: "POST" })
  .inputValidator((i: { email?: string; userId?: string; add: boolean }) => ({
    email: String(i.email ?? "").trim().toLowerCase().slice(0, 200),
    userId: i.userId ? String(i.userId) : "",
    add: Boolean(i.add),
  }))
  .handler(async ({ data }) => {
    const { db } = await ctx(true);
    let userId = data.userId;
    if (!userId && data.email) {
      const { data: p } = await db.from("profiles").select("user_id").ilike("email", data.email).maybeSingle();
      userId = p?.user_id ?? "";
    }
    if (!userId) throw new Error("MEMBER_NOT_FOUND");
    if (data.add) await db.from("user_roles").upsert({ user_id: userId, role: "clean_worker" as never }, { onConflict: "user_id,role" });
    else await db.from("user_roles").delete().eq("user_id", userId).eq("role", "clean_worker" as never);
    return { ok: true };
  });
