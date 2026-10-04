import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Facebook } from "lucide-react";
import { getFacebookStatus, getMyCommandCenter, type DailyPoint } from "@/lib/staff-performance.functions";
import { charterFor } from "@/lib/staff-charters";
import { PerformanceChart } from "./PerformanceChart";
import { cn } from "@/lib/utils";

const sumSince = (s: DailyPoint[], fromIso: string, toIso?: string) =>
  s.filter((p) => p.date >= fromIso.slice(0, 10) && (!toIso || p.date < toIso.slice(0, 10))).reduce((a, p) => a + p.value, 0);
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

export function periodComparison(series: DailyPoint[]) {
  const current = sumSince(series, daysAgo(30));
  const previous = sumSince(series, daysAgo(60), daysAgo(30));
  const change = previous > 0 ? ((current - previous) / previous) * 100 : null;
  const trend = series.length < 14 ? null : change == null ? (current > 0 ? "up" : "flat") : change > 5 ? "up" : change < -5 ? "down" : "flat";
  return { current, previous, change, trend: trend as "up" | "down" | "flat" | null };
}

export function TrendBadge({ trend }: { trend: "up" | "down" | "flat" | null }) {
  if (!trend) return <span className="text-xs text-muted-foreground">Insufficient performance data</span>;
  const map = {
    up: { Icon: ArrowUpRight, text: "Improving", cls: "bg-primary/10 text-primary" },
    flat: { Icon: ArrowRight, text: "Stable", cls: "bg-muted text-foreground" },
    down: { Icon: ArrowDownRight, text: "Needs attention", cls: "bg-destructive/10 text-destructive" },
  }[trend];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", map.cls)}><map.Icon className="size-3.5" aria-hidden />{map.text}</span>;
}

export function DepartmentCommandCenter() {
  const fn = useServerFn(getMyCommandCenter);
  const fbFn = useServerFn(getFacebookStatus);
  const { data } = useQuery({ queryKey: ["console", "command-center"], queryFn: fn });
  const { data: fb } = useQuery({ queryKey: ["console", "facebook"], queryFn: fbFn });
  if (!data) return null;
  const { identity, performance, target } = data;
  const charter = charterFor(identity.department);
  const cmp = periodComparison(performance.series);
  const today = sumSince(performance.series, new Date().toISOString());
  const week = sumSince(performance.series, daysAgo(7));
  const month = sumSince(performance.series, data.monthStart);
  const firstName = identity.name?.split(" ")[0]?.replace(/\(.*\)/, "").trim();

  return (
    <div className="space-y-4">
      {/* Identity header */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-gold/10 p-5 sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-gold">ASH GLO</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-wide text-foreground sm:text-3xl">{charter.label}</h2>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-foreground">{identity.name ?? (identity.teamSeat ? `${charter.label} Team` : "No employee assigned")}</p>
            <p className="text-sm text-muted-foreground">{identity.position ?? (identity.teamSeat ? "Shared team login" : "")}</p>
          </div>
          <p className="rounded-lg border border-border bg-background/70 px-3 py-1.5 font-mono text-xs font-bold text-foreground">
            Employee ID: {identity.employeeId ?? "Not assigned"}
          </p>
        </div>
        {identity.extraDepartments.includes("GROWTH") ? (
          <p className="mt-3 text-xs font-semibold text-primary">Also responsible for: Growth & Acquisition / Lead Generation</p>
        ) : null}
      </section>

      {/* Role charter */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <p className="font-display text-sm font-extrabold uppercase tracking-[0.2em] text-foreground">Your Role</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">ASH Global Technologies · Role charter</p>
        </div>
        {firstName ? <p className="mt-4 text-sm text-foreground">Dear {firstName},</p> : null}
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-[10px] font-bold uppercase tracking-widest text-gold">Role</dt><dd className="mt-1 text-sm text-foreground">{identity.position ?? `${charter.label} team`}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-widest text-gold">Mission</dt><dd className="mt-1 text-sm text-foreground">{charter.mission}</dd></div>
          {charter.responsibilities.length ? (
            <div><dt className="text-[10px] font-bold uppercase tracking-widest text-gold">Key responsibilities</dt>
              <dd><ul className="mt-1 space-y-1 text-sm text-foreground">{charter.responsibilities.map((r) => <li key={r}>• {r}</li>)}</ul></dd></div>
          ) : null}
          {charter.kpis.length ? (
            <div><dt className="text-[10px] font-bold uppercase tracking-widest text-gold">Key performance indicators</dt>
              <dd><ul className="mt-1 space-y-1 text-sm text-foreground">{charter.kpis.map((r) => <li key={r}>• {r}</li>)}</ul></dd></div>
          ) : null}
        </dl>
        {charter.extraNote ? <p className="mt-4 text-xs text-muted-foreground">{charter.extraNote}</p> : null}
        <p className="mt-4 text-xs italic text-muted-foreground">Your work is reflected in the measurable activity recorded in this dashboard.</p>
      </section>

      {/* My performance */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-sm font-extrabold uppercase tracking-[0.2em] text-foreground">My Performance</p>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {performance.scope === "personal" ? "Your own activity" : "Team activity"} · {performance.seriesUnit}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[["Today", today], ["This week", week], ["This month", month]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-muted/60 p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</p><p className="mt-1 text-xl font-extrabold text-foreground">{Number(v).toLocaleString()}</p></div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {performance.kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</p>
              <p className={cn("mt-1 font-bold", k.value == null ? "text-xs text-muted-foreground" : "text-lg text-foreground")}>{k.value ?? "Data not available"}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Figures cover the last 400 days of recorded activity.</p>
      </section>

      <PerformanceChart title={charter.chartTitle} subtitle={charter.chartSubtitle} series={performance.series} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="font-display text-sm font-extrabold uppercase tracking-[0.2em] text-foreground">Target vs Actual</p>
          {target ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] uppercase text-muted-foreground">Target</p><p className="text-lg font-extrabold">{target.target.toLocaleString()}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Actual</p><p className="text-lg font-extrabold">{month.toLocaleString()}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Variance</p><p className={cn("text-lg font-extrabold", month >= target.target ? "text-primary" : "text-destructive")}>{(month - target.target).toLocaleString()}</p></div>
              <p className="col-span-3 text-xs text-muted-foreground">{target.label} · Achievement {target.target > 0 ? `${Math.round((month / target.target) * 100)}%` : "—"}</p>
            </div>
          ) : <p className="mt-3 text-sm text-muted-foreground">No target configured</p>}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between"><p className="font-display text-sm font-extrabold uppercase tracking-[0.2em] text-foreground">Performance Trend</p><TrendBadge trend={cmp.trend} /></div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] uppercase text-muted-foreground">Last 30 days</p><p className="text-lg font-extrabold">{cmp.current.toLocaleString()}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Previous 30</p><p className="text-lg font-extrabold">{cmp.previous.toLocaleString()}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Change</p><p className="text-lg font-extrabold">{cmp.change == null ? "—" : `${cmp.change > 0 ? "+" : ""}${cmp.change.toFixed(1)}%`}</p></div>
          </div>
        </section>
      </div>

      {fb?.allowed ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2"><Facebook className="size-4 text-primary" aria-hidden /><p className="font-display text-sm font-extrabold uppercase tracking-[0.2em] text-foreground">Facebook Performance</p></div>
          <p className="mt-2 text-sm text-muted-foreground">
            {fb.configured
              ? "The Meta app is configured. Page connection is being finalised — no Facebook figures are shown until the official ASH Page is authorised."
              : "Facebook Page not connected. The CEO must first add ASH's Meta app details; the Page is then connected through Meta's official authorisation. No Facebook password is ever requested."}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["Followers", "Reach", "Impressions", "Engagement"].map((m) => (
              <div key={m} className="rounded-xl border border-dashed border-border p-3"><p className="text-[10px] uppercase text-muted-foreground">{m}</p><p className="mt-1 text-xs text-muted-foreground">Data unavailable</p></div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
