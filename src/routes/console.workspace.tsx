import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Inbox,
  ListTodo,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react";
import {
  addTaskComment,
  createTask,
  getExecutiveDailySummary,
  getMyTasks,
  getMyWorkspace,
  getTaskComments,
  setAvailability,
  submitDailyReport,
  updateTask,
} from "@/lib/workspace.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getMyCommandCenter } from "@/lib/staff-performance.functions";
import { charterFor } from "@/lib/staff-charters";
import { PerformanceChart } from "@/components/console/PerformanceChart";

export const Route = createFileRoute("/console/workspace")({
  head: () => ({
    meta: [
      { title: "My Workspace — ASH Console" },
      {
        name: "description",
        content: "Your ASH employee workspace, recorded performance, tasks and team updates.",
      },
      { property: "og:title", content: "My Workspace — ASH Console" },
      {
        property: "og:description",
        content: "Your ASH employee workspace, recorded performance, tasks and team updates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: WorkspacePage,
});

const AVAIL = [
  { v: "AVAILABLE", label: "Available", dot: "bg-primary" },
  { v: "AWAY", label: "Away", dot: "bg-gold" },
  { v: "BUSY", label: "Busy", dot: "bg-destructive" },
  { v: "OFFLINE", label: "Offline", dot: "bg-muted-foreground" },
];

const card = "rounded-3xl border border-border/60 bg-card/70 p-5 shadow-lg backdrop-blur-xl";

function remaining(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  return ms < 0 ? `${h}h ${m}m overdue` : `${h}h ${m}m remaining`;
}

function WorkspacePage() {
  const qc = useQueryClient();
  const load = useServerFn(getMyWorkspace);
  const setAv = useServerFn(setAvailability);
  const { data, isLoading } = useQuery({
    queryKey: ["console", "workspace"],
    queryFn: () => load(),
    refetchInterval: 60_000,
  });
  const av = useMutation({
    mutationFn: (status: string) => setAv({ data: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["console", "workspace"] }),
  });

  if (isLoading || !data)
    return <Loader2 className="mx-auto mt-10 size-6 animate-spin text-muted-foreground" />;
  const me = data.me;
  const name = me?.employee_name ?? me?.full_name ?? data.actor.name;
  const d = data.myDay;

  return (
    <div className="space-y-5">
      <section className={cn(card, "bg-gradient-to-br from-primary/10 via-card/70 to-gold/10")}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-gold text-2xl font-bold text-primary-foreground">
            {me?.avatarSignedUrl ? (
              <img
                src={me.avatarSignedUrl}
                alt={`${name} profile photo`}
                className="size-full object-cover"
              />
            ) : (
              name.slice(0, 1)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <h1 className="text-2xl font-bold">Welcome back, {name}</h1>
            <p className="text-sm text-muted-foreground">
              {me?.position ?? "—"} · {data.actor.department} ·{" "}
              {me?.employee_id ?? "No employee ID"}
            </p>
          </div>
          {me ? (
            <div className="flex flex-wrap gap-1.5">
              {AVAIL.map((a) => (
                <button
                  key={a.v}
                  onClick={() => av.mutate(a.v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                    me.availability === a.v
                      ? "border-primary bg-primary/15"
                      : "border-border/60 hover:bg-muted",
                  )}
                >
                  <span className={cn("size-2 rounded-full", a.dot)} />
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">My Day</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={CalendarDays} label="Tasks due today" value={d.dueToday} />
          <Stat icon={AlertTriangle} label="Overdue tasks" value={d.overdue} warn={d.overdue > 0} />
          <Stat icon={Inbox} label="Tickets awaiting" value={d.ticketsAwaiting} />
          <Stat
            icon={AlertTriangle}
            label="Escalations"
            value={d.escalations}
            warn={d.escalations > 0}
          />
          <Stat icon={MessageSquare} label="Unread messages" value={d.unreadMessages} />
          <Stat icon={Inbox} label="Unread notifications" value={d.unreadNotifications} />
          <Stat icon={CheckCircle2} label="Completed today" value={d.completedToday} />
          <Stat icon={CheckCircle2} label="Completed this week" value={d.completedWeek} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Daily/weekly targets:{" "}
          {d.pendingTasks + d.completedWeek === 0
            ? "Insufficient performance data"
            : `${d.completedWeek} of ${d.pendingTasks + d.completedWeek} tasks completed this week`}
        </p>
      </section>

      <WorkspaceAnalytics />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 font-bold">Today's priorities</h2>
          {data.priorities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing due today.</p>
          ) : (
            <ul className="space-y-2">
              {data.priorities.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-background/60 px-3 py-2 text-sm"
                >
                  <span className="truncate">{t.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={card}>
          <h2 className="mb-3 font-bold">Tickets & SLA</h2>
          {data.tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tickets for you.</p>
          ) : (
            <ul className="space-y-2">
              {data.tickets.map((t) => (
                <li key={t.id} className="rounded-2xl bg-background/60 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{t.subject}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        t.sla_state === "BREACHED" && "bg-destructive/15 text-destructive",
                        t.sla_state === "AT_RISK" && "bg-gold/20 text-gold",
                        t.sla_state === "ON_TIME" && "bg-primary/15 text-primary",
                      )}
                    >
                      {t.sla_state.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> Resolution: {remaining(t.resolution_due)} ·{" "}
                    {t.priority} · {t.name}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <MyTasks />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 font-bold">Team availability</h2>
          <ul className="space-y-1.5">
            {data.team.map((m) => {
              const a = AVAIL.find((x) => x.v === m.availability) ?? {
                v: "OFFLINE",
                label: "Offline",
                dot: "bg-muted-foreground",
              };
              return (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">
                    {m.name} <span className="text-xs text-muted-foreground">· {m.department}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn("size-2 rounded-full", a.dot)} />
                    {a.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        {me ? <DailyReport existing={data.myReport} /> : <ExecutiveSummary />}
      </div>
      {me && data.actor.superAdmin ? <ExecutiveSummary /> : null}
    </div>
  );
}

function WorkspaceAnalytics() {
  const load = useServerFn(getMyCommandCenter);
  const { data, error, isPending } = useQuery({
    queryKey: ["console", "command-center"],
    queryFn: () => load(),
    refetchInterval: 60_000,
  });
  const charter = data ? charterFor(data.identity.department) : null;
  return (
    <section aria-label="Employee analytics" className="space-y-3">
      <h2 className="text-lg font-bold">Performance analytics</h2>
      {data && charter ? (
        <PerformanceChart
          title={charter.chartTitle}
          subtitle={`${data.performance.scope === "personal" ? "Your activity" : "Department activity"} · ${data.performance.seriesUnit}`}
          series={data.performance.series}
        />
      ) : (
        <div
          className="grid h-64 place-items-center rounded-2xl border border-border bg-card text-sm text-muted-foreground"
          role={error ? "alert" : "status"}
        >
          {isPending ? (
            <Loader2 className="size-5 animate-spin" aria-label="Loading analytics" />
          ) : (
            "Data not available"
          )}
        </div>
      )}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  warn,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className={cn(card, "p-4")}>
      <Icon className={cn("size-4", warn ? "text-destructive" : "text-primary")} />
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const TABS = [
  "Assigned to me",
  "Due today",
  "Upcoming",
  "Overdue",
  "Completed",
  "Recurring",
] as const;

function MyTasks() {
  const qc = useQueryClient();
  const load = useServerFn(getMyTasks);
  const create = useServerFn(createTask);
  const update = useServerFn(updateTask);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Assigned to me");
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    due_date: "",
    priority: "NORMAL",
    assigned_staff_id: "",
    related_customer: "",
    recurrence: "NONE",
  });
  const { data } = useQuery({ queryKey: ["console", "my-tasks"], queryFn: () => load() });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["console", "my-tasks"] });
    qc.invalidateQueries({ queryKey: ["console", "workspace"] });
  };
  const add = useMutation({
    mutationFn: () =>
      create({ data: { ...form, assigned_staff_id: form.assigned_staff_id || null } }),
    onSuccess: () => {
      setForm({ ...form, title: "", related_customer: "" });
      refresh();
    },
  });
  const upd = useMutation({
    mutationFn: (v: { id: string; progress?: number; status?: string }) => update({ data: v }),
    onSuccess: refresh,
  });

  if (!data) return null;
  const t0 = data.today;
  const filtered = data.tasks.filter((t) => {
    const done = t.status === "DONE";
    if (tab === "Completed") return done;
    if (done) return false;
    if (tab === "Assigned to me") return t.assigned_staff_id === data.me;
    if (tab === "Due today") return t.due_date === t0;
    if (tab === "Upcoming") return t.due_date > t0;
    if (tab === "Overdue") return t.due_date < t0;
    return t.recurrence !== "NONE";
  });
  const staffName = (id: string | null) => data.staff.find((s) => s.id === id)?.name;

  return (
    <section className={card}>
      <h2 className="mb-3 flex items-center gap-2 font-bold">
        <ListTodo className="size-4" /> My Tasks
      </h2>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((x) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              tab === x ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="mb-4 grid gap-2 rounded-2xl bg-background/60 p-3 sm:grid-cols-6">
        <Input
          className="sm:col-span-2"
          placeholder="New task"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input
          type="date"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
        />
        <select
          className="rounded-md border bg-background px-2 text-sm"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background px-2 text-sm"
          value={form.recurrence}
          onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
        >
          {["NONE", "DAILY", "WEEKLY", "MONTHLY"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        {data.canAssign ? (
          <select
            className="rounded-md border bg-background px-2 text-sm"
            value={form.assigned_staff_id}
            onChange={(e) => setForm({ ...form, assigned_staff_id: e.target.value })}
          >
            <option value="">Assign to…</option>
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.department})
              </option>
            ))}
          </select>
        ) : null}
        <Input
          className="sm:col-span-3"
          placeholder="Related customer (optional)"
          value={form.related_customer}
          onChange={(e) => setForm({ ...form, related_customer: e.target.value })}
        />
        <Button disabled={!form.title || add.isPending} onClick={() => add.mutate()}>
          Add task
        </Button>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks here.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => (
            <li key={t.id} className="rounded-2xl bg-background/60 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  className="min-w-0 flex-1 truncate text-left font-medium"
                  onClick={() => setOpen(open === t.id ? null : t.id)}
                >
                  {t.title}
                </button>
                <span className="text-xs text-muted-foreground">
                  {t.priority} · due {t.due_date}
                  {t.recurrence !== "NONE" ? ` · ${t.recurrence}` : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.department}
                {staffName(t.assigned_staff_id) ? ` · ${staffName(t.assigned_staff_id)}` : ""}
                {t.related_customer ? ` · Customer: ${t.related_customer}` : ""}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-gold"
                    style={{ width: `${t.progress}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs tabular-nums">{t.progress}%</span>
                {t.status !== "DONE" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        upd.mutate({ id: t.id, progress: Math.min(100, t.progress + 25) })
                      }
                    >
                      +25%
                    </Button>
                    <Button size="sm" onClick={() => upd.mutate({ id: t.id, status: "DONE" })}>
                      Done
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => upd.mutate({ id: t.id, status: "OPEN", progress: 0 })}
                  >
                    Reopen
                  </Button>
                )}
              </div>
              {open === t.id ? <TaskComments taskId={t.id} detail={t.detail} /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskComments({ taskId, detail }: { taskId: string; detail: string | null }) {
  const qc = useQueryClient();
  const load = useServerFn(getTaskComments);
  const add = useServerFn(addTaskComment);
  const [body, setBody] = useState("");
  const key = ["console", "task-comments", taskId];
  const { data } = useQuery({ queryKey: key, queryFn: () => load({ data: { taskId } }) });
  const send = useMutation({
    mutationFn: () => add({ data: { taskId, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      {(data ?? []).map((c) => (
        <p key={c.id} className="text-xs">
          <span className="font-semibold">{c.staff_name}:</span> {c.body}
        </p>
      ))}
      <div className="flex gap-2">
        <Input placeholder="Comment…" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button size="icon" disabled={!body.trim()} onClick={() => send.mutate()}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

const FIELDS = [
  ["accomplished", "What I accomplished"],
  ["problems", "Problems encountered"],
  ["unfinished", "Unfinished work"],
  ["help_needed", "Help required"],
  ["management_info", "Important management information"],
] as const;

function DailyReport({ existing }: { existing: Record<string, unknown> | null }) {
  const qc = useQueryClient();
  const submit = useServerFn(submitDailyReport);
  const [f, setF] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map(([k]) => [k, String(existing?.[k] ?? "")])),
  );
  const save = useMutation({
    mutationFn: () => submit({ data: f }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["console", "workspace"] }),
  });
  return (
    <section className={card}>
      <h2 className="mb-3 font-bold">Daily work report</h2>
      <div className="space-y-2">
        {FIELDS.map(([k, label]) => (
          <Textarea
            key={k}
            rows={2}
            placeholder={label}
            value={f[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
          />
        ))}
      </div>
      <Button className="mt-3 w-full" disabled={save.isPending} onClick={() => save.mutate()}>
        {existing ? "Update today's report" : "Submit today's report"}
      </Button>
      {save.isSuccess ? <p className="mt-2 text-center text-xs text-primary">Saved.</p> : null}
    </section>
  );
}

function ExecutiveSummary() {
  const load = useServerFn(getExecutiveDailySummary);
  const { data, error } = useQuery({
    queryKey: ["console", "exec-summary"],
    queryFn: () => load({ data: {} }),
    retry: false,
  });
  if (error || !data) return null;
  return (
    <section className={card}>
      <h2 className="mb-1 font-bold">Executive daily summary</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {data.submitted} of {data.expected} employees submitted today ({data.date}).
      </p>
      {data.submitted === 0 ? (
        <p className="text-sm text-muted-foreground">No reports submitted yet.</p>
      ) : (
        <div className="space-y-3 text-sm">
          {(
            [
              ["Help requested", data.helpRequests],
              ["Problems", data.problems],
              ["For management", data.management],
            ] as const
          ).map(([label, rows]) =>
            rows.length ? (
              <div key={label}>
                <p className="font-semibold">{label}</p>
                {rows.map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{r.name}</span> ({r.department}):{" "}
                    {r.text}
                  </p>
                ))}
              </div>
            ) : null,
          )}
        </div>
      )}
    </section>
  );
}
