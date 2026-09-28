import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  advanceCleanOrder,
  assignCleanJob,
  getCleanConsole,
  getCleanConsoleOrder,
  saveCleanBands,
  saveCleanService,
  saveCleanSettings,
  setCleanWorker,
  weighCleanOrder,
} from "@/lib/clean-console.functions";
import { cleanStatusLabel, fcfa, methodLabel } from "@/lib/clean";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console/clean")({
  head: () => ({
    meta: [
      { title: "ASH Clean operations — Console" },
      { name: "description", content: "Manage ASH Clean laundry orders, weighing, pricing, staff and riders." },
      { property: "og:title", content: "ASH Clean operations" },
      { property: "og:description", content: "Laundry orders, receipts, transport settings and workers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsoleClean,
});

const FILTERS = ["", "BOOKED", "COLLECTED", "RECEIVED", "AWAITING_APPROVAL", "APPROVED", "WASHING", "READY", "DELIVERED", "RETURN_REQUESTED"];
const FACILITY = ["RECEIVED", "WASHING", "DRYING", "IRONING", "FOLDING", "QUALITY_CHECK", "PACKED", "READY", "CANCELLED"] as const;

function ConsoleClean() {
  const [tab, setTab] = useState<"orders" | "settings" | "workers">("orders");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const load = useServerFn(getCleanConsole);
  const { data, refetch } = useQuery({
    queryKey: ["console", "clean", status, q],
    queryFn: () => load({ data: { status, q } }),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">ASH Clean</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} orders · {data?.counts["AWAITING_APPROVAL"] ?? 0} awaiting price approval · paid revenue {fcfa(data?.revenue)}
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {(["orders", "settings", "workers"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold capitalize", tab === t ? "bg-card text-foreground shadow" : "text-muted-foreground")}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "orders" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search / scan order or receipt no." className="max-w-xs" />
            {FILTERS.map((f) => (
              <button key={f || "all"} onClick={() => setStatus(f)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", status === f ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                {f ? `${cleanStatusLabel(f)} (${data?.counts[f] ?? 0})` : "All"}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3">Pickup / delivery</th><th className="p-3">Total</th><th className="p-3">Payment</th></tr>
              </thead>
              <tbody>
                {(data?.orders ?? []).map((o) => (
                  <tr key={o.id} onClick={() => setOpen(o.id)} className="cursor-pointer border-t border-border hover:bg-secondary/50">
                    <td className="p-3"><b className="font-mono">{o.order_no}</b><span className="block text-xs text-muted-foreground">{formatDateTime(o.created_at)}</span></td>
                    <td className="p-3">{o.customer?.full_name ?? "—"}<span className="block text-xs text-muted-foreground">{o.contact_phone ?? o.customer?.phone ?? ""}</span></td>
                    <td className="p-3 font-semibold">{cleanStatusLabel(o.status)}</td>
                    <td className="p-3 text-xs">{methodLabel(o.pickup_method)} {o.pickup_distance_km} km / {methodLabel(o.delivery_method)} {o.delivery_distance_km} km</td>
                    <td className="p-3">{o.total ? fcfa(o.total) : "—"}</td>
                    <td className="p-3 text-xs font-bold">{o.payment_status}{o.receipt_no ? <span className="block font-mono font-normal">{o.receipt_no}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.orders ?? []).length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No orders.</p> : null}
          </div>
          {open ? <OrderPanel id={open} workers={data?.workers ?? []} services={data?.services ?? []} onClose={() => { setOpen(null); void refetch(); }} /> : null}
        </>
      ) : tab === "settings" && data?.settings ? (
        <SettingsPanel settings={data.settings} bands={data.bands} services={data.services} onSaved={() => void refetch()} />
      ) : tab === "workers" ? (
        <WorkersPanel workers={data?.workers ?? []} onSaved={() => void refetch()} />
      ) : null}
    </div>
  );
}

type Worker = { user_id: string; full_name?: string | null; phone?: string | null };
type Svc = { id: string; code: string; kind: string; name_en: string; name_fr: string; price: number; active: boolean };

function OrderPanel({ id, workers, services, onClose }: { id: string; workers: Worker[]; services: Svc[]; onClose: () => void }) {
  const load = useServerFn(getCleanConsoleOrder);
  const weigh = useServerFn(weighCleanOrder);
  const advance = useServerFn(advanceCleanOrder);
  const assign = useServerFn(assignCleanJob);
  const { data, refetch } = useQuery({ queryKey: ["console", "clean-order", id], queryFn: () => load({ data: { id } }) });
  const [kg, setKg] = useState("");
  const [specials, setSpecials] = useState<Record<string, number>>({});
  const o = data?.order;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); void refetch(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="h-full w-full max-w-lg space-y-4 overflow-y-auto bg-background p-5" onClick={(e) => e.stopPropagation()}>
        {!o ? <p>Loading…</p> : (
          <>
            <div className="flex items-start justify-between">
              <div><h2 className="font-mono text-xl font-extrabold">{o.order_no}</h2><p className="text-sm text-muted-foreground">{cleanStatusLabel(o.status)} · {o.payment_status}</p></div>
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
            <div className="space-y-1 rounded-2xl bg-card p-3 text-sm">
              <p><b>Pickup:</b> {methodLabel(o.pickup_method)} · {o.pickup_distance_km} km · {fcfa(o.pickup_fee)}<br /><span className="text-xs text-muted-foreground">{o.pickup_address}</span></p>
              <p><b>Delivery:</b> {methodLabel(o.delivery_method)} · {o.delivery_distance_km} km · {fcfa(o.delivery_fee)}<br /><span className="text-xs text-muted-foreground">{o.delivery_address}</span></p>
              <p><b>Services:</b> {(o.services ?? []).join(", ")}{o.notes ? ` · ${o.notes}` : ""}</p>
            </div>

            {(data?.jobs ?? []).map((j) => (
              <div key={j.id} className="flex items-center gap-2 text-sm">
                <span className="w-24 font-semibold">{j.direction}</span>
                <span className="w-16 text-xs">{j.status}</span>
                <select className="flex-1 rounded-md border border-border bg-background p-1.5" value={j.worker_id ?? ""} onChange={(e) => void run(() => assign({ data: { orderId: id, direction: j.direction as "PICKUP", workerId: e.target.value || null } }), "Assigned")}>
                  <option value="">Open to any {methodLabel(j.method)}</option>
                  {workers.map((w) => <option key={w.user_id} value={w.user_id}>{w.full_name ?? w.user_id.slice(0, 8)}</option>)}
                </select>
              </div>
            ))}

            {o.payment_status !== "PAID" ? (
              <div className="space-y-2 rounded-2xl border border-primary/40 p-3">
                <p className="font-bold">Weigh & send price</p>
                <Label>Verified weight (kg)</Label>
                <Input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder={o.weight_kg ? String(o.weight_kg) : "e.g. 4.5"} />
                {services.filter((s) => s.kind === "SPECIAL" && s.active).map((s) => (
                  <div key={s.code} className="flex items-center justify-between gap-2 text-sm">
                    <span>{s.name_en} ({fcfa(s.price)})</span>
                    <Input className="w-20" type="number" min={0} value={specials[s.code] ?? 0} onChange={(e) => setSpecials({ ...specials, [s.code]: Number(e.target.value) })} />
                  </div>
                ))}
                <Button className="w-full" disabled={!Number(kg)} onClick={() => void run(() => weigh({ data: { id, weightKg: Number(kg), specials: Object.entries(specials).map(([code, qty]) => ({ code, qty })) } }), "Price sent to customer")}>
                  Send price for approval
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="font-bold">Facility status</p>
              <div className="flex flex-wrap gap-1.5">
                {FACILITY.map((s) => (
                  <Button key={s} size="sm" variant={o.status === s ? "default" : "outline"} onClick={() => void run(() => advance({ data: { id, status: s } }), cleanStatusLabel(s))}>{cleanStatusLabel(s)}</Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Washing steps unlock only after the customer has paid.</p>
            </div>

            {(data?.quotes ?? []).map((qt) => (
              <div key={qt.id} className="rounded-xl bg-muted p-2 text-xs">
                {qt.status} · {qt.weight_kg} kg × {fcfa(qt.rate_per_kg)} + specials {fcfa(qt.special_amount)} + transport {fcfa(Number(qt.pickup_fee) + Number(qt.delivery_fee))} = <b>{fcfa(qt.total)}</b> · by {qt.created_by}
              </div>
            ))}
            <ol className="space-y-1 text-xs">
              {(data?.events ?? []).map((e) => <li key={e.id}><b>{cleanStatusLabel(e.status)}</b> · {formatDateTime(e.created_at)} · {e.actor}{e.note ? ` · ${e.note}` : ""}</li>)}
            </ol>
          </>
        )}
      </aside>
    </div>
  );
}

function SettingsPanel({ settings, bands, services, onSaved }: { settings: Record<string, unknown>; bands: { min_km: number; max_km: number | null; fee: number }[]; services: Svc[]; onSaved: () => void }) {
  const save = useServerFn(saveCleanSettings);
  const saveB = useServerFn(saveCleanBands);
  const saveS = useServerFn(saveCleanService);
  const [s, setS] = useState(settings);
  const [b, setB] = useState(bands);
  useEffect(() => setS(settings), [settings]);
  const num = (k: string, label: string) => (
    <div><Label>{label}</Label><Input type="number" value={String(s[k] ?? "")} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>
  );
  const sw = (k: string, label: string) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(s[k])} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />{label}</label>
  );
  const txt = (k: string, label: string) => (
    <div><Label>{label}</Label><Input value={String(s[k] ?? "")} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-2xl bg-card p-4">
        <h2 className="font-bold">Pricing & facility</h2>
        {num("price_per_kg", "Price per kg (FCFA)")}
        {txt("facility_address", "Facility address")}
        <div className="grid grid-cols-2 gap-2">{num("facility_lat", "Latitude")}{num("facility_lng", "Longitude")}</div>
        {txt("facility_hours", "Opening hours")}
        {txt("facility_phone", "Phone")}
        {sw("cash_enabled", "Allow cash payment at office")}
      </section>
      <section className="space-y-3 rounded-2xl bg-card p-4">
        <h2 className="font-bold">Transportation</h2>
        <div className="grid grid-cols-2 gap-2">
          {num("staff_radius_km", "Staff service radius (km)")}{num("max_staff_km", "Max staff distance (km)")}
          {num("min_rider_fee", "Minimum rider fee")}{num("far_fee_per_km", "Extra per km beyond last band")}
          {num("base_pickup_fee", "Base pickup fee")}{num("base_delivery_fee", "Base delivery fee")}
        </div>
        {sw("staff_pickup_enabled", "Staff pickup available")}
        {sw("staff_delivery_enabled", "Staff delivery available")}
        {sw("rider_enabled", "Riders available")}
        <Button onClick={async () => { try { await save({ data: s }); toast.success("Settings saved"); onSaved(); } catch (e) { toast.error(String(e)); } }}>Save settings</Button>
      </section>
      <section className="space-y-2 rounded-2xl bg-card p-4">
        <h2 className="font-bold">Rider distance bands</h2>
        {b.map((band, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input type="number" value={band.min_km} onChange={(e) => setB(b.map((x, j) => j === i ? { ...x, min_km: Number(e.target.value) } : x))} />
            <span>–</span>
            <Input type="number" placeholder="∞" value={band.max_km ?? ""} onChange={(e) => setB(b.map((x, j) => j === i ? { ...x, max_km: e.target.value === "" ? null : Number(e.target.value) } : x))} />
            <span>km</span>
            <Input type="number" value={band.fee} onChange={(e) => setB(b.map((x, j) => j === i ? { ...x, fee: Number(e.target.value) } : x))} />
            <Button variant="ghost" size="sm" onClick={() => setB(b.filter((_, j) => j !== i))}>×</Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setB([...b, { min_km: 0, max_km: null, fee: 0 }])}>Add band</Button>
          <Button onClick={async () => { await saveB({ data: { bands: b } }); toast.success("Bands saved"); onSaved(); }}>Save bands</Button>
        </div>
      </section>
      <section className="space-y-2 rounded-2xl bg-card p-4">
        <h2 className="font-bold">Services & special items</h2>
        {services.map((sv) => <ServiceRow key={sv.id} sv={sv} onSave={async (row) => { await saveS({ data: row }); toast.success("Saved"); onSaved(); }} />)}
        <ServiceRow sv={{ id: "", code: "", kind: "SPECIAL", name_en: "", name_fr: "", price: 0, active: true }} onSave={async (row) => { await saveS({ data: { ...row, id: undefined } }); toast.success("Added"); onSaved(); }} />
      </section>
    </div>
  );
}

function ServiceRow({ sv, onSave }: { sv: Svc; onSave: (r: Svc & { id?: string }) => Promise<void> }) {
  const [r, setR] = useState(sv);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <Input className="w-20" placeholder="CODE" value={r.code} onChange={(e) => setR({ ...r, code: e.target.value })} disabled={Boolean(sv.id)} />
      <Input className="w-28" placeholder="Name EN" value={r.name_en} onChange={(e) => setR({ ...r, name_en: e.target.value })} />
      <Input className="w-28" placeholder="Nom FR" value={r.name_fr} onChange={(e) => setR({ ...r, name_fr: e.target.value })} />
      <select className="rounded-md border border-border bg-background p-1.5" value={r.kind} onChange={(e) => setR({ ...r, kind: e.target.value })}><option>SERVICE</option><option>SPECIAL</option></select>
      <Input className="w-20" type="number" value={r.price} onChange={(e) => setR({ ...r, price: Number(e.target.value) })} />
      <label className="flex items-center gap-1"><input type="checkbox" checked={r.active} onChange={(e) => setR({ ...r, active: e.target.checked })} />on</label>
      <Button size="sm" variant="outline" onClick={() => void onSave({ ...r, id: sv.id || undefined })}>{sv.id ? "Save" : "Add"}</Button>
    </div>
  );
}

function WorkersPanel({ workers, onSaved }: { workers: Worker[]; onSaved: () => void }) {
  const set = useServerFn(setCleanWorker);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const go = async (data: { email?: string; userId?: string; add: boolean }) => {
    try { await set({ data }); toast.success(data.add ? "Worker added" : "Worker removed"); setEmail(""); onSaved(); void qc.invalidateQueries({ queryKey: ["console", "clean"] }); }
    catch (e) { toast.error(e instanceof Error && e.message.includes("MEMBER_NOT_FOUND") ? "No member with that email" : "Failed"); }
  };
  return (
    <section className="max-w-xl space-y-3 rounded-2xl bg-card p-4">
      <h2 className="font-bold">ASH Clean staff & riders</h2>
      <p className="text-xs text-muted-foreground">Workers open the “My ASH Clean jobs” screen from ASH Clean. Their location is shared only during an active job.</p>
      <div className="flex gap-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Member email" />
        <Button onClick={() => void go({ email, add: true })} disabled={!email}>Add</Button>
      </div>
      <ul className="divide-y divide-border">
        {workers.map((w) => (
          <li key={w.user_id} className="flex items-center justify-between py-2 text-sm">
            <span>{w.full_name ?? w.user_id}<span className="block text-xs text-muted-foreground">{w.phone ?? ""}</span></span>
            <Button size="sm" variant="ghost" onClick={() => void go({ userId: w.user_id, add: false })}>Remove</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
