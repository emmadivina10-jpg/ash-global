import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDepartmentsOverview, setStaffTarget } from "@/lib/staff-performance.functions";
import { charterFor } from "@/lib/staff-charters";
import { PerformanceChart } from "@/components/console/PerformanceChart";
import { TrendBadge, periodComparison } from "@/components/console/DepartmentCommandCenter";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console/departments")({
  ssr: false,
  head: () => ({ meta: [{ title: "Departments — ASH Console" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: DepartmentsPage,
});

function TargetEditor({ staffId, current }: { staffId: string; current: { kpi_label: string | null; kpi_target: number | null } | null }) {
  const save = useServerFn(setStaffTarget);
  const qc = useQueryClient();
  const [label, setLabel] = useState(current?.kpi_label ?? "");
  const [value, setValue] = useState(current?.kpi_target?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Input className="h-8 w-36 text-xs" placeholder="Target name" value={label} onChange={(e) => setLabel(e.target.value)} />
      <Input className="h-8 w-20 text-xs" type="number" min={0} placeholder="Monthly" value={value} onChange={(e) => setValue(e.target.value)} />
      <Button size="sm" variant="outline" disabled={busy} onClick={async () => {
        setBusy(true);
        await save({ data: { staffId, label, target: value === "" ? null : Number(value) } });
        await qc.invalidateQueries({ queryKey: ["console"] });
        setBusy(false);
      }}>Save</Button>
    </div>
  );
}

function DepartmentsPage() {
  const fn = useServerFn(getDepartmentsOverview);
  const { data, isLoading, error } = useQuery({ queryKey: ["console", "departments"], queryFn: fn });
  const [open, setOpen] = useState<string | null>(null);
  if (isLoading) return <LoadingState label="Loading departments…" />;
  if (error || !data) return <p className="text-sm text-muted-foreground">Department oversight is available to the CEO only.</p>;
  const active = data.departments.find((d) => d.department === open);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.departments.map((d) => {
          const c = charterFor(d.department);
          const cmp = periodComparison(d.performance.series);
          return (
            <button key={d.department} type="button" onClick={() => setOpen(d.department)}
              className={cn("rounded-2xl border bg-card p-4 text-left transition-colors", open === d.department ? "border-primary" : "border-border hover:border-primary/50")}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">{c.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-foreground">{cmp.current.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{d.performance.seriesUnit} · last 30 days (previous {cmp.previous.toLocaleString()})</p>
              <div className="mt-3 flex items-center justify-between">
                <TrendBadge trend={cmp.trend} />
                <span className="text-xs text-muted-foreground">{d.members.filter((m) => m.name).length} employees · {d.openTasks.length} open tasks</span>
              </div>
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="space-y-4">
          <PerformanceChart title={charterFor(active.department).chartTitle} subtitle={charterFor(active.department).chartSubtitle} series={active.performance.series} />
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-sm font-extrabold uppercase tracking-[0.2em]">KPIs</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {active.performance.kpis.map((k) => (
                <div key={k.label} className="rounded-xl border border-border p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</p>
                  <p className={cn("mt-1 font-bold", k.value == null ? "text-xs text-muted-foreground" : "text-lg")}>{k.value ?? "Data not available"}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-sm font-extrabold uppercase tracking-[0.2em]">Employees, targets & leaderboard</p>
            {active.leaderMetric ? <p className="mt-1 text-xs text-muted-foreground">Ranking: {active.leaderMetric}</p> : null}
            <div className="mt-3 divide-y divide-border">
              {active.members.length === 0 ? <p className="py-2 text-sm text-muted-foreground">No logins in this department.</p> : null}
              {[...active.members].sort((a, b) => {
                const va = active.leaderboard.find((l) => l.staffId === a.id)?.value ?? -1;
                const vb = active.leaderboard.find((l) => l.staffId === b.id)?.value ?? -1;
                return vb - va;
              }).map((m) => {
                const lb = active.leaderboard.find((l) => l.staffId === m.id);
                return (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-bold">{m.name ?? `${m.username} (shared team login)`}</p>
                      <p className="text-xs text-muted-foreground">{[m.position, m.employeeId].filter(Boolean).join(" · ") || "No employee assigned"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {active.leaderMetric ? <span className="text-sm font-extrabold">{lb?.value ?? "—"}</span> : null}
                      <TargetEditor staffId={m.id} current={m.target} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-sm font-extrabold uppercase tracking-[0.2em]">Issues requiring attention</p>
            {active.openTasks.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No open tasks.</p> : (
              <ul className="mt-2 space-y-1 text-sm">{active.openTasks.slice(0, 20).map((t, i) => <li key={i}>• {t.title} <span className="text-xs text-muted-foreground">({t.priority}, due {t.due_date})</span></li>)}</ul>
            )}
          </section>
        </div>
      ) : <p className="text-sm text-muted-foreground">Select a department to see its employees, targets and trends.</p>}
    </div>
  );
}
