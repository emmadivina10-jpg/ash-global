import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const num = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("INVALID_NUMBER");
  return n;
};
const point = (i: { lat: unknown; lng: unknown }) => {
  const lat = num(i.lat);
  const lng = num(i.lng);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error("INVALID_POINT");
  return { lat, lng };
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function logCleanEvent(
  orderId: string,
  status: string,
  note: string | null,
  actor: string,
) {
  const db = await admin();
  await db.from("clean_status_events").insert({ order_id: orderId, status, note, actor });
}

/* ---------------- Maps (authenticated, bounded) ---------------- */

export const cleanSearchPlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { input: string; sessionToken: string }) => ({
    input: String(i?.input ?? "")
      .trim()
      .slice(0, 120),
    sessionToken: String(i?.sessionToken ?? "").slice(0, 64),
  }))
  .handler(async ({ data }) => {
    if (data.input.length < 3) return [];
    const { autocomplete, loadPricing } = await import("./clean.server");
    const { settings } = await loadPricing();
    return autocomplete(data.input, data.sessionToken, {
      lat: settings.facility_lat,
      lng: settings.facility_lng,
    });
  });

export const cleanPlaceDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { placeId: string; sessionToken: string }) => ({
    placeId: String(i?.placeId ?? "").slice(0, 300),
    sessionToken: String(i?.sessionToken ?? "").slice(0, 64),
  }))
  .handler(async ({ data }) => {
    const { placeDetails } = await import("./clean.server");
    return placeDetails(data.placeId, data.sessionToken);
  });

export const cleanReverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(point)
  .handler(async ({ data }) => {
    const { reverseGeocode } = await import("./clean.server");
    return { address: await reverseGeocode(data) };
  });

/** Distance, method (staff/rider), fee and ETA for one address. */
export const cleanQuoteLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { lat: number; lng: number; direction: "PICKUP" | "DELIVERY" }) => ({
    ...point(i),
    direction: i?.direction === "DELIVERY" ? ("DELIVERY" as const) : ("PICKUP" as const),
  }))
  .handler(async ({ data }) => {
    const { quoteLocation } = await import("./clean.server");
    return quoteLocation(data, data.direction);
  });

/* ---------------- Customer ---------------- */

type Addr = { address: string; lat: number; lng: number };
const addr = (a: Addr) => ({
  ...point(a),
  address:
    String(a?.address ?? "")
      .trim()
      .slice(0, 240) || "Pinned location",
});

export const createCleanOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { services: string[]; notes?: string; phone?: string; pickup: Addr; delivery: Addr }) => ({
      services: (Array.isArray(i?.services) ? i.services : [])
        .map((s) => String(s).slice(0, 20))
        .slice(0, 12),
      notes: String(i?.notes ?? "").slice(0, 500),
      phone: String(i?.phone ?? "").slice(0, 20),
      pickup: addr(i.pickup),
      delivery: addr(i.delivery),
    }),
  )
  .handler(async ({ data, context }) => {
    if (data.services.length === 0) return { ok: false as const, error: "CHOOSE_SERVICE" };
    const { quoteLocation } = await import("./clean.server");
    const [p, d] = await Promise.all([
      quoteLocation(data.pickup, "PICKUP"),
      quoteLocation(data.delivery, "DELIVERY"),
    ]);
    const db = await admin();
    const { data: order, error } = await db
      .from("clean_orders")
      .insert({
        customer_id: context.userId,
        services: data.services,
        notes: data.notes || null,
        contact_phone: data.phone || null,
        pickup_address: data.pickup.address,
        pickup_lat: data.pickup.lat,
        pickup_lng: data.pickup.lng,
        pickup_method: p.method,
        pickup_distance_km: p.km,
        pickup_distance_source: p.source,
        pickup_fee: p.fee,
        pickup_eta_min: p.etaMin,
        delivery_address: data.delivery.address,
        delivery_lat: data.delivery.lat,
        delivery_lng: data.delivery.lng,
        delivery_method: d.method,
        delivery_distance_km: d.km,
        delivery_fee: d.fee,
        delivery_eta_min: d.etaMin,
      })
      .select("id, order_no")
      .single();
    if (error || !order) return { ok: false as const, error: error?.message ?? "CREATE_FAILED" };
    await db.from("clean_assignments").insert([
      { order_id: order.id, direction: "PICKUP", method: p.method },
      { order_id: order.id, direction: "DELIVERY", method: d.method },
    ]);
    await logCleanEvent(
      order.id,
      "BOOKED",
      `${p.method === "STAFF" ? "ASH Staff" : "ASH Rider"} pickup, ${p.km} km`,
      "customer",
    );
    return { ok: true as const, id: order.id, orderNo: order.order_no };
  });

function cleanRef() {
  return `CLN-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

/** Customer approves the weighed price and pays it by Mobile Money. */
export const payCleanOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { orderId: string; provider: string; phone: string }) => ({
    orderId: String(i?.orderId ?? ""),
    provider: String(i?.provider ?? "").slice(0, 40),
    phone: String(i?.phone ?? "").slice(0, 20),
  }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: o } = await db
      .from("clean_orders")
      .select("id, customer_id, order_no, status, total, payment_status, current_quote_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!o || o.customer_id !== context.userId) return { ok: false as const, error: "NOT_FOUND" };
    if (o.payment_status === "PAID") return { ok: false as const, error: "ALREADY_PAID" };
    if (o.status !== "AWAITING_APPROVAL" || !o.total)
      return { ok: false as const, error: "PRICE_NOT_READY" };
    const reference = cleanRef();
    const { tchokoPay } = await import("./tchokopay.server");
    const result = await tchokoPay.createCharge({
      merchantReference: reference,
      amount: Number(o.total),
      currency: "XAF",
      country: "CM",
      provider: data.provider,
      phone: data.phone,
      description: `ASH Clean ${o.order_no}`,
    });
    if (!result.ok)
      return {
        ok: false as const,
        error: result.error ?? "PAYMENT_START_FAILED",
        message: result.message ?? null,
      };
    await db
      .from("clean_orders")
      .update({
        payment_reference: reference,
        payment_status: "PROCESSING",
        provider_transaction_id: result.providerReference ?? null,
      })
      .eq("id", o.id);
    return { ok: true as const, reference };
  });

/** Asks TchokoPay for the real outcome of a pending ASH Clean payment. */
export async function syncCleanOrderPayment(orderId: string) {
  const db = await admin();
  const { data: o } = await db
    .from("clean_orders")
    .select("id, payment_reference, payment_status, provider_transaction_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!o?.payment_reference || o.payment_status !== "PROCESSING")
    return o?.payment_status ?? "UNPAID";
  const { tchokoPay } = await import("./tchokopay.server");
  const ref = o.provider_transaction_id ?? "";
  const c = ref.startsWith("REQ-")
    ? await tchokoPay.getCollection(ref)
    : await tchokoPay.verifyLegacyPayment(o.payment_reference);
  if (!c.ok) return "PROCESSING";
  if (c.status === "PAID") {
    await db.rpc("complete_clean_payment", {
      _payment_reference: o.payment_reference,
      _provider_transaction_id: (c.providerReference ?? ref) || null,
    } as never);
    return "PAID";
  }
  if (c.status === "FAILED" || c.status === "CANCELLED") {
    await db.rpc("fail_clean_payment", {
      _payment_reference: o.payment_reference,
      _status: c.status,
    } as never);
    return "FAILED";
  }
  return "PROCESSING";
}

export const syncCleanPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { orderId: string }) => ({ orderId: String(i?.orderId ?? "") }))
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase
      .from("clean_orders")
      .select("id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!own) return { status: "NOT_FOUND" };
    return { status: await syncCleanOrderPayment(data.orderId) };
  });

export const declineCleanQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { orderId: string }) => ({ orderId: String(i?.orderId ?? "") }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: o } = await db
      .from("clean_orders")
      .select("id, customer_id, status, current_quote_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!o || o.customer_id !== context.userId || o.status !== "AWAITING_APPROVAL")
      return { ok: false as const };
    await db.from("clean_orders").update({ status: "RETURN_REQUESTED" }).eq("id", o.id);
    if (o.current_quote_id)
      await db
        .from("clean_price_quotes")
        .update({ status: "DECLINED", decided_at: new Date().toISOString() })
        .eq("id", o.current_quote_id);
    await logCleanEvent(
      o.id,
      "RETURN_REQUESTED",
      "Customer declined the price and asked for a return",
      "customer",
    );
    return { ok: true as const };
  });

/* ---------------- Workers (ASH Staff / ASH Rider) ---------------- */

async function assertWorker(supabase: { rpc: (...a: never[]) => unknown }, userId: string) {
  const { data } = await (
    supabase.rpc as unknown as (n: string, a: object) => Promise<{ data: boolean }>
  )("has_role", { _user_id: userId, _role: "clean_worker" });
  if (!data) throw new Error("NOT_CLEAN_WORKER");
}

export const amICleanWorker = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertWorker(context.supabase as never, context.userId);
      return { worker: true };
    } catch {
      return { worker: false };
    }
  });

export const getCleanJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertWorker(context.supabase as never, context.userId);
    const db = await admin();
    const { data: open } = await db
      .from("clean_assignments")
      .select(
        "id, order_id, direction, method, worker_id, status, clean_orders!inner(order_no, status, pickup_address, pickup_lat, pickup_lng, delivery_address, delivery_lat, delivery_lng, notes, contact_phone)",
      )
      .or(`worker_id.eq.${context.userId},worker_id.is.null`)
      .in("status", ["OPEN", "ACCEPTED", "ON_THE_WAY", "ARRIVED"])
      .order("created_at", { ascending: true })
      .limit(50);
    // Delivery jobs only open once laundry is packed and ready.
    return (open ?? []).filter((a) => {
      const st = (a.clean_orders as unknown as { status: string }).status;
      if (a.direction === "PICKUP")
        return !["RETURN_REQUESTED", "CANCELLED"].includes(st) || a.worker_id;
      return ["READY", "DELIVERY_ASSIGNED", "DELIVERY_ON_THE_WAY", "RETURN_REQUESTED"].includes(st);
    });
  });

const JOB_FLOW = { ACCEPTED: 1, ON_THE_WAY: 2, ARRIVED: 3, DONE: 4 } as const;

export const updateCleanJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { assignmentId: string; status: keyof typeof JOB_FLOW }) => {
    if (!(i?.status in JOB_FLOW)) throw new Error("BAD_STATUS");
    return { assignmentId: String(i.assignmentId), status: i.status };
  })
  .handler(async ({ data, context }) => {
    await assertWorker(context.supabase as never, context.userId);
    const db = await admin();
    const { data: a } = await db
      .from("clean_assignments")
      .select("*")
      .eq("id", data.assignmentId)
      .maybeSingle();
    if (!a) return { ok: false as const, error: "NOT_FOUND" };
    if (a.worker_id && a.worker_id !== context.userId)
      return { ok: false as const, error: "TAKEN" };
    const { data: prof } = await db
      .from("profiles")
      .select("full_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    const actor = `${a.method === "STAFF" ? "ASH Staff" : "ASH Rider"} · ${prof?.full_name ?? "worker"}`;
    await db
      .from("clean_assignments")
      .update({ status: data.status, worker_id: context.userId })
      .eq("id", a.id);
    const pickup = a.direction === "PICKUP";
    const orderStatus: Record<string, string> = pickup
      ? {
          ACCEPTED: "PICKUP_ASSIGNED",
          ON_THE_WAY: "PICKUP_ON_THE_WAY",
          ARRIVED: "PICKUP_ON_THE_WAY",
          DONE: "COLLECTED",
        }
      : {
          ACCEPTED: "DELIVERY_ASSIGNED",
          ON_THE_WAY: "DELIVERY_ON_THE_WAY",
          ARRIVED: "DELIVERY_ON_THE_WAY",
          DONE: "DELIVERED",
        };
    const next = orderStatus[data.status]!;
    await db.from("clean_orders").update({ status: next }).eq("id", a.order_id);
    await logCleanEvent(
      a.order_id,
      data.status === "ARRIVED" ? `${a.direction}_ARRIVED` : next,
      null,
      actor,
    );
    if (data.status === "ARRIVED" || data.status === "ON_THE_WAY") {
      const { data: ord } = await db
        .from("clean_orders")
        .select("customer_id, order_no")
        .eq("id", a.order_id)
        .maybeSingle();
      if (ord?.customer_id) {
        const arrived = data.status === "ARRIVED";
        await db.from("notifications").insert({
          user_id: ord.customer_id,
          category: "ASH_CLEAN",
          title: arrived ? "Your ASH Clean worker has arrived" : "ASH Clean is on the way",
          body: `${actor} · ${ord.order_no} · ${pickup ? "pickup" : "delivery"}`,
          data: { link: `/clean/orders/${a.order_id}`, order_id: a.order_id },
        });
      }
    }
    // Tracking stops the moment the job is finished.
    if (data.status === "DONE") await db.from("clean_locations").delete().eq("assignment_id", a.id);
    return { ok: true as const };
  });

/** Only accepted while the worker has this job active; otherwise rejected. */
export const pushCleanLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { assignmentId: string; lat: number; lng: number }) => ({
    assignmentId: String(i?.assignmentId ?? ""),
    ...point(i),
  }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: a } = await db
      .from("clean_assignments")
      .select("id, order_id, worker_id, status")
      .eq("id", data.assignmentId)
      .maybeSingle();
    if (
      !a ||
      a.worker_id !== context.userId ||
      !["ACCEPTED", "ON_THE_WAY", "ARRIVED"].includes(a.status)
    )
      return { ok: false as const };
    await db.from("clean_locations").upsert({
      assignment_id: a.id,
      order_id: a.order_id,
      worker_id: context.userId,
      lat: data.lat,
      lng: data.lng,
      updated_at: new Date().toISOString(),
    });
    return { ok: true as const };
  });
