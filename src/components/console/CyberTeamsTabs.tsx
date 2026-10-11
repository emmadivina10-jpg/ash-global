import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, Laptop, Loader2, ShieldBan, ClipboardCheck, LogOut } from "lucide-react";
import { getEndpoints, getTrustDesk, listTeams, runAudit } from "@/lib/cyber-audit.functions";
import { addIpBlock } from "@/lib/cyber-control.functions";
import { forceLogoutAccount } from "@/lib/cyber-map.functions";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Console pages per department that Cyber can open in view-only audit mode. Never the CEO's pages. */
export const DEPT_PAGES: Record<string, { to: string; label: string }[]> = {
  OPERATIONS: [{ to: "/console/operations", label: "Operations" }, { to: "/console/merchant", label: "Merchants" }],
  SUPPORT: [{ to: "/console/support", label: "Support" }, { to: "/console/outreach", label: "Outreach" }],
  REVENUE: [{ to: "/console/revenue", label: "Revenue" }, { to: "/console/payments", label: "Payments" }, { to: "/console/withdrawals", label: "Withdrawals" }, { to: "/console/ledger", label: "Ledger" }, { to: "/console/finance", label: "Finance" }],
  MARKETPLACE_OPS: [{ to: "/console/marketplace", label: "Marketplace Ops" }, { to: "/console/bookings", label: "Bookings" }, { to: "/console/clean", label: "ASH Clean" }],
  ADVERTISING: [{ to: "/console/advertising", label: "Advertising & Marketing" }],
  TRUST: [{ to: "/console/trust", label: "Verification" }, { to: "/console/reports", label: "Safety & reports" }, { to: "/console/verification", label: "Verified badges" }, { to: "/console/providers", label: "Providers" }],
  GROWTH: [{ to: "/console/growth", label: "Growth" }],
  SALES: [{ to: "/console/sales", label: "Sales" }],
  PARTNERSHIPS: [{ to: "/console/partnerships", label: "Partnerships" }],
  CONTENT: [{ to: "/console/content", label: "Content & Creators" }],
  EXPANSION: [{ to: "/console/expansion", label: "Expansion" }],
};

function errMsg(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("HEAD_ONLY")) return "Only the Head of Cybersecurity can do that.";
  if (m.includes("PROTECTED_ACCOUNT")) return "That is a protected owner/admin account.";
  if (m.includes("FORBIDDEN")) return "Your login is not allowed to do that.";
  return m;
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <h3 className="font-display text-base font-bold">{title}</h3>
      {desc ? <p className="mb-3 text-xs text-muted-foreground">{desc}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

type Report = { id: string; summary: string; findings: unknown; created_at: string } | null;

export function ControlTeamsTab() {
  const load = useServerFn(listTeams);
  const audit = useServerFn(runAudit);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cyber", "teams"], queryFn: () => load() });
  const [last, setLast] = useState<Report>(null);
  const m = useMutation({
    mutationFn: (dept: string | null) => audit({ data: { dept } }),
    onSuccess: (r) => { setLast(r as Report); void qc.invalidateQueries({ queryKey: ["cyber", "reports"] }); toast.success("Audit saved to Reports"); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const findings = ((last?.findings ?? []) as { title: string; detail: string; fix: string; priority: string }[]);
  return (
    <div className="space-y-4">
      <Card title="Control teams" desc="Open any employee dashboard in view-only mode (the CEO's dashboards are excluded). Every view is logged. Nothing can be changed from an audit view.">
        <Button size="sm" onClick={() => m.mutate(null)} disabled={m.isPending}>
          {m.isPending ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />} Run whole-system audit
        </Button>
      </Card>
      {last ? (
        <Card title="Latest audit" desc={formatDateTime(last.created_at)}>
          <p className="text-sm">{last.summary}</p>
          <ul className="mt-3 space-y-2">
            {findings.map((f, i) => (
              <li key={i} className="rounded-2xl border border-border p-3">
                <p className="text-sm font-semibold"><span className={cn("mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold", f.priority === "HIGH" ? "bg-destructive/15 text-destructive" : "bg-muted")}>{f.priority}</span>{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.detail}</p>
                <p className="mt-1 text-xs"><b>Fix:</b> {f.fix}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Saved in the Reports tab, where you can print it or send it to the CEO.</p>
        </Card>
      ) : null}
      {q.isPending ? <Loader2 className="size-5 animate-spin" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {(q.data?.teams ?? []).map((t) => (
            <section key={t.dept} className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-display text-sm font-bold">{t.dept.replace(/_/g, " ")}</h4>
                <Button size="sm" variant="outline" onClick={() => m.mutate(t.dept)} disabled={m.isPending}>Audit team</Button>
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {t.seats.length === 0 ? <li className="text-muted-foreground">No logins in this team.</li> : t.seats.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span className="truncate">{s.name}{s.position ? ` · ${s.position}` : ""} <span className="font-mono text-muted-foreground">@{s.username}</span></span>
                    <span className={cn("shrink-0", !s.active || s.rotation.overdue ? "text-destructive" : "text-muted-foreground")}>
                      {!s.active ? "disabled" : s.rotation.overdue ? "rotation overdue" : s.lastLogin ? formatDateTime(s.lastLogin) : "never signed in"}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(DEPT_PAGES[t.dept] ?? []).map((p) => (
                  <Link key={p.to} to={p.to} search={{ audit: 1 } as never} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground">
                    <Eye className="size-3" /> {p.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function EndpointTab() {
  const load = useServerFn(getEndpoints);
  const block = useServerFn(addIpBlock);
  const logout = useServerFn(forceLogoutAccount);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cyber", "endpoints"], queryFn: () => load() });
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); await qc.invalidateQueries({ queryKey: ["cyber", "endpoints"] }); } catch (e) { toast.error(errMsg(e)); }
  };
  const devices = (q.data?.devices ?? []).filter((d) => !onlyFlagged || d.flags.length);
  const head = q.data?.role === "HEAD";
  return (
    <Card title="Endpoint security" desc="Every device and browser that signs in to ASH (members and staff). The app can't scan or install anything on a device; it only sees devices when they sign in.">
      {q.isPending ? <Loader2 className="size-5 animate-spin" /> : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
            <span>Devices: <b>{q.data?.total ?? 0}</b></span>
            <span>Flagged: <b className="text-destructive">{q.data?.flagged ?? 0}</b></span>
            <label className="ml-auto flex items-center gap-1.5"><input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} /> Flagged only</label>
          </div>
          {devices.length === 0 ? <p className="text-sm text-muted-foreground">{onlyFlagged ? "No flagged devices." : "Data not available"}</p> : (
            <ul className="space-y-2">
              {devices.map((d) => (
                <li key={d.fingerprint} className="rounded-2xl border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold"><Laptop className="size-4" /> {d.device} · {d.os} · {d.browser}{d.version ? ` ${d.version}` : ""}{d.blocked ? <span className="rounded-full bg-destructive/15 px-2 text-[10px] text-destructive">BLOCKED</span> : null}</p>
                      <p className="text-xs text-muted-foreground">{[d.city, d.country].filter(Boolean).join(", ") || "Unknown place"} · {d.ip} · first {formatDateTime(d.firstSeen)} · last {formatDateTime(d.lastSeen)} · {d.hits} visits</p>
                      <p className="text-xs">Accounts: {d.accounts.map((a) => a.name).join(", ")}</p>
                      {d.flags.length ? <p className="mt-1 text-xs font-semibold text-destructive">{d.flags.join(" · ")}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {!d.blocked ? (
                        <Button size="sm" variant="outline" onClick={() => { const reason = prompt("Reason for blocking this device?"); if (reason) void act(() => block({ data: { kind: "FINGERPRINT", value: d.fingerprint, reason, hours: null } }), "Device blocked"); }}>
                          <ShieldBan className="size-3.5" /> Block device
                        </Button>
                      ) : null}
                      {d.accounts.length === 1 ? (
                        <Button size="sm" variant="outline" disabled={!head} title={head ? undefined : "Head of Cybersecurity only"} onClick={() => { const reason = prompt("Reason for signing this account out?"); if (reason) void act(() => logout({ data: { userId: d.accounts[0]!.id, reason } }), "Signed out everywhere"); }}>
                          <LogOut className="size-3.5" /> Sign out
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

export function TrustDeskTab() {
  const load = useServerFn(getTrustDesk);
  const q = useQuery({ queryKey: ["cyber", "trust-desk"], queryFn: () => load() });
  const d = q.data;
  if (q.isPending) return <Loader2 className="size-5 animate-spin" />;
  if (!d) return <p className="text-sm">Data not available</p>;
  return (
    <div className="space-y-4">
      <Card title="Trust & Verification" desc={d.officer ? `Responsible officer: ${d.officer}` : "Responsible officer: not set"}>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <Stat label="Open safety reports" value={d.openReports.length} />
          <Stat label="Pending badge requests" value={d.pendingBadges.length} />
          <Stat label="Photo reviews waiting" value={d.pendingPhotoReviews} />
          <Stat label="Restricted identities" value={d.restricted.length} />
          <Stat label="Copy attempts" value={d.impersonation.length} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {DEPT_PAGES.TRUST!.map((p) => <Link key={p.to} to={p.to} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground">{p.label}</Link>)}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Open safety reports">
          {d.openReports.length === 0 ? <p className="text-sm text-muted-foreground">None open.</p> : (
            <ul className="space-y-1 text-xs">{d.openReports.map((r) => <li key={r.id} className="flex justify-between gap-2"><span className="truncate">{r.target_type} — {r.reason}</span><span className="shrink-0 text-muted-foreground">{formatDateTime(r.created_at)}</span></li>)}</ul>
          )}
        </Card>
        <Card title="Verified-identity copy attempts">
          {d.impersonation.length === 0 ? <p className="text-sm text-muted-foreground">None recorded.</p> : (
            <ul className="space-y-1 text-xs">{d.impersonation.map((r) => <li key={r.id} className="flex justify-between gap-2"><span>{r.kind}</span><span className="text-muted-foreground">{formatDateTime(r.created_at)}</span></li>)}</ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="tabular text-xl font-black">{value}</p></div>;
}
