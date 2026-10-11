import { lazy, Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Brain, FileText, KeyRound, Loader2, LogOut, Mail, MapPin, Phone, Printer, Search, Send, ShieldAlert, Trash2, X } from "lucide-react";
import {
  askAccountIntelligence, deleteSecurityReport, disputeTransaction, forceLogoutAccount, generateSecurityReport, getCyberMap,
  getLiveTrip, listAccountTransactions, listSecurityReports, releaseTransactionHold, sendAccountRecovery, sendReportToCeo,
  type MapDevice, type MapProvider, type MapTrip,
} from "@/lib/cyber-map.functions";
import { getSecurityAccount, searchSecurityAccounts } from "@/lib/cyber-control.functions";
import type { Layers } from "./CyberWorldMapCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const MapCanvas = lazy(() => import("./CyberWorldMapCanvas"));

function errMsg(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("PROTECTED_ACCOUNT")) return "That is a protected owner/admin account and cannot be touched.";
  if (m.includes("FORBIDDEN")) return "Your login is not allowed to do that.";
  if (m.includes("REASON_REQUIRED")) return "Write a reason first.";
  return m;
}

// ---------------- Ask ASH Intelligence about one account ----------------

export function AccountIntelligence({ userId }: { userId: string }) {
  const ask = useServerFn(askAccountIntelligence);
  const [q, setQ] = useState("");
  const m = useMutation({ mutationFn: (question: string) => ask({ data: { userId, question } }) });
  useEffect(() => { m.reset(); setQ(""); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-muted/40 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold"><Brain className="size-4 text-primary" />Ask ASH Intelligence about this account</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); m.mutate(q); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What's going on here? Is it vulnerable to us?" />
        <Button size="sm" disabled={m.isPending}>{m.isPending ? <Loader2 className="size-4 animate-spin" /> : "Ask"}</Button>
      </form>
      {m.data ? <p className="whitespace-pre-wrap text-xs leading-relaxed">{m.data.answer}</p> : null}
      {m.error ? <p className="text-xs text-destructive">{errMsg(m.error)}</p> : null}
    </div>
  );
}

// ---------------- World map ----------------

type Selection = { kind: "provider"; p: MapProvider } | { kind: "device"; d: MapDevice } | { kind: "trip"; t: MapTrip } | null;

export function WorldMapTab({ onOpenAccount }: { onOpenAccount: (userId: string) => void }) {
  const load = useServerFn(getCyberMap);
  const [first, setFirst] = useState(true);
  const q = useQuery({
    queryKey: ["cyber", "map"],
    queryFn: async () => { const r = await load({ data: { poll: !first } }); setFirst(false); return r; },
    refetchInterval: 15_000,
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [layers, setLayers] = useState<Layers>({ providers: true, devices: true, trips: true, airports: false });
  const [sel, setSel] = useState<Selection>(null);
  const d = q.data;
  const toggles: { key: keyof Layers; label: string; count?: number | undefined }[] = [
    { key: "providers", label: "Providers", count: d?.providers.length },
    { key: "devices", label: "Devices & IPs", count: d?.devices.length },
    { key: "trips", label: "Live trips", count: d?.trips.length },
    { key: "airports", label: "Airports" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {toggles.map((t) => (
          <button key={t.key} type="button" onClick={() => setLayers((l) => ({ ...l, [t.key]: !l[t.key] }))}
            className={cn("rounded-full border px-3 py-1 text-xs font-semibold", layers[t.key] ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
            {t.label}{t.count != null ? ` · ${t.count}` : ""}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">{q.isFetching ? "Refreshing…" : d ? `Live · updated ${formatDateTime(d.generatedAt)}` : ""}</span>
      </div>
      <div className="relative h-[52vh] min-h-[380px] w-full overflow-hidden rounded-3xl border border-border bg-muted">
        {q.isPending || !mounted ? (
          <div className="grid h-full place-items-center"><Loader2 className="size-6 animate-spin" /></div>
        ) : q.error ? (
          <div className="grid h-full place-items-center text-sm text-destructive">{errMsg(q.error)}</div>
        ) : (
          <Suspense fallback={<div className="grid h-full place-items-center"><Loader2 className="size-6 animate-spin" /></div>}>
            <MapCanvas providers={d!.providers} devices={d!.devices} trips={d!.trips} layers={layers}
              onProvider={(p) => setSel({ kind: "provider", p })} onDevice={(x) => setSel({ kind: "device", d: x })} onTrip={(t) => setSel({ kind: "trip", t })} />
          </Suspense>
        )}
        {sel ? <SidePanel sel={sel} onClose={() => setSel(null)} onOpenAccount={onOpenAccount} /> : null}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Provider pins sit at their saved city (gold ring) or their live shared location during a booking (red ring). Device locations come from IP addresses and are approximate. Every map view and session you open is logged.
      </p>
    </div>
  );
}

function SidePanel({ sel, onClose, onOpenAccount }: { sel: NonNullable<Selection>; onClose: () => void; onOpenAccount: (id: string) => void }) {
  const userId = sel.kind === "provider" ? sel.p.userId : sel.kind === "device" ? sel.d.userId : null;
  return (
    <aside className="absolute inset-y-0 right-0 z-[600] flex w-full max-w-sm flex-col overflow-y-auto border-l border-border bg-card p-4 shadow-2xl">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1 hover:bg-muted"><X className="size-4" /></button>
      {sel.kind === "provider" ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            {sel.p.avatar ? <img src={sel.p.avatar} alt={sel.p.name} className="size-14 rounded-full object-cover" /> : <div className="grid size-14 place-items-center rounded-full bg-muted font-bold">{sel.p.name.slice(0, 2)}</div>}
            <div><p className="font-bold">{sel.p.name}</p><p className="text-xs text-muted-foreground">{sel.p.verified ? "Verified" : "Not verified"} · {sel.p.live ? "Live" : "Not live"}</p></div>
          </div>
          <p className="flex items-center gap-1.5 text-xs"><Mail className="size-3.5" />{sel.p.email ?? "Data not available"}</p>
          <p className="flex items-center gap-1.5 text-xs"><Phone className="size-3.5" />{sel.p.phone ?? "Data not available"}</p>
          <p className="flex items-center gap-1.5 text-xs"><MapPin className="size-3.5" />{[sel.p.city, sel.p.country].filter(Boolean).join(", ")} · {sel.p.precision === "live" ? "live location" : sel.p.precision === "city" ? "city centre" : "country centre"}</p>
        </div>
      ) : sel.kind === "device" ? (
        <div className="space-y-1 text-sm">
          <p className="font-bold">{sel.d.name}</p>
          <p className="font-mono text-xs">{sel.d.ip}</p>
          <p className="text-xs">{[sel.d.city, sel.d.country].filter(Boolean).join(", ") || "Location not available"}{sel.d.precise ? "" : " (country only)"}</p>
          <p className="text-xs text-muted-foreground">Last seen {formatDateTime(sel.d.lastSeen)}</p>
          <p className="break-all text-[11px] text-muted-foreground">{sel.d.userAgent}</p>
          {sel.d.suspicious ? <p className="rounded-xl bg-destructive/10 p-2 text-xs font-semibold text-destructive">Suspicious: shared device or many countries</p> : null}
        </div>
      ) : (
        <TripSession bookingId={sel.t.bookingId} />
      )}
      {userId ? (
        <div className="mt-3 space-y-3">
          <AccountSnapshot userId={userId} />
          <AccountIntelligence userId={userId} />
          <Button className="w-full" onClick={() => onOpenAccount(userId)}><ShieldAlert className="size-4" />Open full profile & take action</Button>
        </div>
      ) : null}
    </aside>
  );
}

function AccountSnapshot({ userId }: { userId: string }) {
  const get = useServerFn(getSecurityAccount);
  const q = useQuery({ queryKey: ["cyber", "acc", userId], queryFn: () => get({ data: { userId } }) });
  if (q.isPending) return <Loader2 className="size-4 animate-spin" />;
  if (!q.data) return <p className="text-xs">Data not available</p>;
  const d = q.data;
  return (
    <div className="space-y-1 text-xs">
      {d.protected ? <p className="rounded-xl bg-primary/10 p-2 font-semibold">Protected owner/admin account</p> : null}
      {d.suspicious ? <p className="rounded-xl bg-destructive/10 p-2 font-semibold text-destructive">Needs review</p> : null}
      <ul className="space-y-0.5">{d.compliance.map((c) => <li key={c.label} className={c.ok ? "text-primary" : "text-destructive"}>{c.ok ? "✓" : "✗"} {c.label}</li>)}</ul>
      <p className="text-muted-foreground">{d.fingerprints.length} device/IP records · {d.openReports} open reports</p>
    </div>
  );
}

function TripSession({ bookingId }: { bookingId: string }) {
  const get = useServerFn(getLiveTrip);
  const q = useQuery({ queryKey: ["cyber", "trip", bookingId], queryFn: () => get({ data: { bookingId } }), refetchInterval: 10_000 });
  if (q.isPending) return <Loader2 className="size-4 animate-spin" />;
  if (!q.data) return <p className="text-sm">Data not available</p>;
  const { booking, points } = q.data;
  return (
    <div className="space-y-2 text-sm">
      <p className="font-bold">{booking.service_title}</p>
      <p className="text-xs text-muted-foreground">Status {booking.status} · trip {booking.trip_status} · {formatDateTime(booking.scheduled_at)}</p>
      <p className="text-xs font-semibold">View-only session · refreshes every 10 seconds</p>
      <ul className="space-y-1 text-xs">
        {points.map((p) => <li key={p.party} className="font-mono">{p.party}: {p.lat.toFixed(5)}, {p.lng.toFixed(5)} · {formatDateTime(p.updated_at)}{p.accuracy_m ? ` · ±${Math.round(p.accuracy_m)} m` : ""}</li>)}
      </ul>
    </div>
  );
}

// ---------------- Account control ----------------

export function AccountControlTab({ initialUserId }: { initialUserId?: string | null }) {
  const search = useServerFn(searchSecurityAccounts);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(initialUserId ?? null);
  const results = useMutation({ mutationFn: (x: string) => search({ data: { q: x } }) });
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
      <section className="rounded-3xl border border-border bg-card p-5">
        <h3 className="mb-3 font-display text-base font-bold">Find an account</h3>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); results.mutate(q); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, username or email" />
          <Button size="icon"><Search className="size-4" /></Button>
        </form>
        <ul className="mt-3 divide-y divide-border">
          {(results.data ?? []).map((r) => (
            <li key={r.user_id}><button type="button" onClick={() => setSel(r.user_id)} className={cn("w-full py-2 text-left text-sm", sel === r.user_id && "text-primary")}>
              <b>{r.full_name ?? r.username}</b>{r.protected ? <span className="ml-1 rounded-full bg-primary/15 px-2 text-[10px] font-bold text-primary">PROTECTED</span> : null}
              <span className="block text-xs text-muted-foreground">{r.email}</span>
            </button></li>
          ))}
        </ul>
      </section>
      {sel ? <AccountControls userId={sel} /> : <section className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">Pick an account to force logout, send password recovery, or dispute a transaction.</section>}
    </div>
  );
}

function AccountControls({ userId }: { userId: string }) {
  const get = useServerFn(getSecurityAccount);
  const logout = useServerFn(forceLogoutAccount);
  const recover = useServerFn(sendAccountRecovery);
  const txs = useServerFn(listAccountTransactions);
  const dispute = useServerFn(disputeTransaction);
  const release = useServerFn(releaseTransactionHold);
  const qc = useQueryClient();
  const acc = useQuery({ queryKey: ["cyber", "acc", userId], queryFn: () => get({ data: { userId } }) });
  const tx = useQuery({ queryKey: ["cyber", "tx", userId], queryFn: () => txs({ data: { userId } }) });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    if (!reason.trim() && key !== "release") { toast.error("Write a reason first."); return; }
    setBusy(key);
    try { await fn(); toast.success(ok); await qc.invalidateQueries({ queryKey: ["cyber", "tx", userId] }); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const d = acc.data;
  if (acc.isPending) return <Loader2 className="size-5 animate-spin" />;
  if (!d) return <p className="text-sm">Data not available</p>;
  const held = new Set((tx.data?.holds ?? []).filter((h) => !h.released_at).map((h) => h.ref));
  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-5 text-sm">
      <div>
        <p className="text-base font-bold">{d.profile.full_name}</p>
        <p className="text-xs text-muted-foreground">{d.profile.email} · {d.profile.phone ?? "no phone"}</p>
      </div>
      {d.protected ? <p className="rounded-2xl bg-primary/10 p-3 text-xs font-semibold">Protected owner/admin account. Cyber cannot act on it.</p> : (
        <>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, logged, visible to the CEO)" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="destructive" disabled={busy !== null} onClick={() => void run("logout", () => logout({ data: { userId, reason } }), "All sessions ended. They must sign in again.")}>
              {busy === "logout" ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}Force logout everywhere
            </Button>
            <Button variant="outline" disabled={busy !== null} onClick={() => void run("recover", async () => { const r = await recover({ data: { userId, reason, origin: window.location.origin } }); toast.message(`Recovery email sent to ${r.sentTo}`); }, "Password recovery sent.")}>
              {busy === "recover" ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}Send password recovery
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Cyber never sees or sets member passwords. The member chooses a new one from the email. For a full lock, use Restriction levels in Accounts.</p>
          <div>
            <p className="mb-1 font-semibold">Dispute / hold a transaction</p>
            <p className="mb-2 text-[11px] text-muted-foreground">Opens a high-priority case for Finance and tells them not to settle it. It never moves or changes money.</p>
            {tx.isPending ? <Loader2 className="size-4 animate-spin" /> : (
              <ul className="space-y-1.5 text-xs">
                {[...(tx.data?.withdrawals ?? []).map((w) => ({ kind: "WITHDRAWAL" as const, ref: w.reference, label: `Withdrawal ${w.amount} ${w.currency} · ${w.payment_method} · ${w.status}`, at: w.requested_at })),
                  ...(tx.data?.payments ?? []).map((p) => ({ kind: "PAYMENT" as const, ref: p.reference, label: `${p.purpose} ${p.amount ?? "?"} ${p.currency} · ${p.method} · ${p.status}`, at: p.created_at }))]
                  .map((t) => (
                    <li key={t.kind + t.ref} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2">
                      <span>{t.label}<span className="block text-muted-foreground">{t.ref} · {formatDateTime(t.at)}</span></span>
                      {held.has(t.ref) ? <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">ON HOLD</span> : (
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run(t.ref, () => dispute({ data: { userId, kind: t.kind, ref: t.ref, reason } }), "Dispute opened for Finance.")}>Dispute</Button>
                      )}
                    </li>
                  ))}
                {(tx.data?.withdrawals.length ?? 0) + (tx.data?.payments.length ?? 0) === 0 ? <li className="text-muted-foreground">No transactions.</li> : null}
              </ul>
            )}
          </div>
          {(tx.data?.holds ?? []).filter((h) => !h.released_at).length ? (
            <div>
              <p className="mb-1 font-semibold">Active holds</p>
              <ul className="space-y-1 text-xs">{(tx.data?.holds ?? []).filter((h) => !h.released_at).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2"><span>{h.kind} {h.ref} — {h.reason}</span>
                  <Button size="sm" variant="ghost" onClick={() => void run("release", () => release({ data: { holdId: h.id } }), "Hold released.")}>Release</Button></li>
              ))}</ul>
            </div>
          ) : null}
        </>
      )}
      <AccountIntelligence userId={userId} />
    </section>
  );
}

// ---------------- Reports ----------------

type Finding = { title: string; detail: string; fix: string; priority: string };

export function ReportsTab() {
  const list = useServerFn(listSecurityReports);
  const gen = useServerFn(generateSecurityReport);
  const send = useServerFn(sendReportToCeo);
  const del = useServerFn(deleteSecurityReport);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cyber", "reports"], queryFn: () => list() });
  const [open, setOpen] = useState<string | null>(null);
  const make = useMutation({
    mutationFn: (period: "DAILY" | "WEEKLY") => gen({ data: { period } }),
    onSuccess: async (r) => { await qc.invalidateQueries({ queryKey: ["cyber", "reports"] }); if (r) setOpen(r.id); toast.success("Report generated"); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const reports = q.data ?? [];
  const current = reports.find((r) => r.id === open) ?? null;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
      <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
        <h3 className="font-display text-base font-bold">Security audit reports</h3>
        <p className="text-xs text-muted-foreground">One click builds an audit of everything that happened: attacks, suspicious activity, blocks, actions taken and what needs fixing. Built only from real records.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={make.isPending} onClick={() => make.mutate("DAILY")}>{make.isPending && make.variables === "DAILY" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}Daily report</Button>
          <Button variant="outline" disabled={make.isPending} onClick={() => make.mutate("WEEKLY")}>{make.isPending && make.variables === "WEEKLY" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}Weekly report</Button>
        </div>
        <ul className="divide-y divide-border">
          {q.isPending ? <Loader2 className="size-4 animate-spin" /> : reports.length === 0 ? <li className="py-2 text-xs text-muted-foreground">No reports yet.</li> : reports.map((r) => (
            <li key={r.id}><button type="button" onClick={() => setOpen(r.id)} className={cn("w-full py-2 text-left text-sm", open === r.id && "text-primary")}>
              <b>{r.period === "WEEKLY" ? "Weekly" : "Daily"}</b> · {formatDateTime(r.created_at)}
              <span className="block text-xs text-muted-foreground">by {r.generated_by}{r.sent_to_ceo_at ? " · sent to CEO" : ""}</span>
            </button></li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl border border-border bg-card p-5" id="cyber-report-print">
        {!current ? <p className="text-sm text-muted-foreground">Generate or pick a report.</p> : (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold">ASH Glo {current.period === "WEEKLY" ? "weekly" : "daily"} security report</h3>
                <p className="text-xs text-muted-foreground">{formatDateTime(current.period_start)} → {formatDateTime(current.period_end)} · {current.generated_by}</p>
              </div>
              <div className="flex gap-1 print:hidden">
                <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print / PDF</Button>
                <Button size="sm" variant="outline" onClick={async () => { await send({ data: { id: current.id } }); await qc.invalidateQueries({ queryKey: ["cyber", "reports"] }); toast.success("Sent to the CEO"); }}><Send className="size-4" />CEO</Button>
                <Button size="sm" variant="ghost" aria-label="Delete report" onClick={async () => { await del({ data: { id: current.id } }); setOpen(null); await qc.invalidateQueries({ queryKey: ["cyber", "reports"] }); }}><Trash2 className="size-4" /></Button>
              </div>
            </div>
            <p>{current.summary}</p>
            <ul className="space-y-2">
              {((current.findings ?? []) as Finding[]).map((f, i) => (
                <li key={i} className="rounded-2xl border border-border p-3">
                  <p className="font-semibold"><span className={cn("mr-2 rounded-full px-2 text-[10px] font-bold", f.priority === "HIGH" ? "bg-destructive/15 text-destructive" : f.priority === "MEDIUM" ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground")}>{f.priority}</span>{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.detail}</p>
                  <p className="text-xs"><b>Fix:</b> {f.fix}</p>
                </li>
              ))}
            </ul>
            <details className="text-xs"><summary className="cursor-pointer font-semibold">Raw figures</summary><pre className="mt-2 overflow-x-auto rounded-xl bg-muted p-2">{JSON.stringify(current.metrics, null, 2)}</pre></details>
          </div>
        )}
      </section>
    </div>
  );
}

