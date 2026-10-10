import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_COMMISSION_RATE, effectiveRate, isAllowedCommissionRate, splitBooking } from "./commission";

const PAID = (b: { invoice_number: string | null; paid_at: string | null }) => Boolean(b.invoice_number || b.paid_at);

/** Current marketplace commission and how it applies to recent bookings. Any console seat can read. */
export const getCommissionOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  const actor = await requireConsole();
  const db = await adminClient();
  const [{ data: setting, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
    db.from("marketplace_settings").select("commission_rate, updated_by, updated_at").eq("id", true).maybeSingle(),
    db
      .from("bookings")
      .select("id, service_title, price, status, commission_rate, platform_fee, provider_amount, invoice_number, paid_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (e1 || e2) throw new Error("COMMISSION_READ_FAILED");
  const current = setting ? Number(setting.commission_rate) : DEFAULT_COMMISSION_RATE;
  const bookings = (rows ?? []).map((b) => {
    const paid = PAID(b);
    const saved = b.commission_rate == null ? null : Number(b.commission_rate);
    const rate = effectiveRate(saved, paid, current);
    const price = Number(b.price ?? 0);
    const split = paid
      ? { commission: Number(b.platform_fee ?? 0), provider: Number(b.provider_amount ?? price - Number(b.platform_fee ?? 0)) }
      : rate == null ? null : splitBooking(price, rate);
    return { id: b.id, service: b.service_title ?? "—", price, status: b.status, paid, rate, split, createdAt: b.created_at };
  });
  const canEdit = actor.superAdmin || actor.elevated || actor.department === "REVENUE" || actor.extraDepartments.includes("REVENUE");
  return { current, updatedBy: setting?.updated_by ?? null, updatedAt: setting?.updated_at ?? null, canEdit, bookings };
});

/** CEO or Finance only. Applies to payments made from now on; paid bookings keep their saved rate. */
export const setCommissionRate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ rate: z.number() }).parse(d))
  .handler(async ({ data }) => {
    if (!isAllowedCommissionRate(data.rate)) throw new Error("RATE_NOT_ALLOWED");
    const { requireDepartment, adminClient } = await import("./console.server");
    const actor = await requireDepartment("REVENUE");
    const db = await adminClient();
    const { data: before } = await db.from("marketplace_settings").select("commission_rate").eq("id", true).maybeSingle();
    const { error } = await db
      .from("marketplace_settings")
      .upsert({ id: true, commission_rate: data.rate, updated_by: actor.name, updated_at: new Date().toISOString() });
    if (error) throw new Error("COMMISSION_SAVE_FAILED");
    await db.from("admin_audit_log").insert({
      actor: actor.name,
      action: "SET_COMMISSION_RATE",
      target_reference: "marketplace_settings",
      previous_state: { commission_rate: before ? Number(before.commission_rate) : null },
      new_state: { commission_rate: data.rate },
    });
    return { ok: true, rate: data.rate };
  });
