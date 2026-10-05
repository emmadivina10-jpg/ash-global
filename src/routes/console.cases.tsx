import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Clock, GitBranch, Loader2, Plus, Trash2 } from "lucide-react";
import {
  CASE_STATUSES,
  addCaseEvent,
  advanceWorkflow,
  createCase,
  getCase,
  listCases,
  listWorkflows,
  saveWorkflow,
  startWorkflow,
  type WorkflowStep,
} from "@/lib/cases.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console/cases")({
  head: () => ({ meta: [{ title: "Cases & Workflows — ASH Console" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CasesPage,
});

const DEPTS = ["SUPPORT", "REVENUE", "TRUST", "MARKETPLACE_OPS", "ADVERTISING", "GROWTH", "SALES", "PARTNERSHIPS", "CONTENT", "MERCHANT", "EXPANSION", "CYBERSECURITY", "OPERATIONS", "SUPER_ADMIN"];
const card = "rounded-3xl border border-border/60 bg-card/70 p-5 shadow-lg backdrop-blur-xl";
const sel = "h-9 rounded-md border bg-background px-2 text-sm";
const caseNo = (n: number) => `#ASH-CASE-${String(n).padStart(4, "0")}`;
const label = (s: string) => s.replace(/_/g, " ");

function CasesPage() {
  const [tab, setTab] = useState<"cases" | "workflows">("cases");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={tab === "cases" ? "default" : "outline"} onClick={() => setTab("cases")}><Briefcase className="mr-2 size-4" />Cases</Button>
        <Button variant={tab === "workflows" ? "default" : "outline"} onClick={() => setTab("workflows")}><GitBranch className="mr-2 size-4" />Workflows</Button>
      </div>
      {tab === "cases" ? <Cases /> : <Workflows />}
    </div>
  );
}

function Cases() {
  const qc = useQueryClient();
  const load = useServerFn(listCases);
  const create = useServerFn(createCase);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("ACTIVE");
  const [form, setForm] = useState({ title: "", customer_name: "", priority: "NORMAL", dept: "" });
  const { data } = useQuery({ queryKey: ["console", "cases"], queryFn: () => load() });
  const add = useMutation({
    mutationFn: () => create({ data: { title: form.title, customer_name: form.customer_name, priority: form.priority, departments: form.dept ? [form.dept] : [] } }),
    onSuccess: (r) => { setForm({ title: "", customer_name: "", priority: "NORMAL", dept: "" }); qc.invalidateQueries({ queryKey: ["console", "cases"] }); setOpenId(r.id); },
  });
  if (!data) return <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />;
  const list = data.cases.filter((c) => filter === "ALL" || (filter === "ACTIVE" ? !["RESOLVED", "CLOSED"].includes(c.status) : c.status === filter));

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <section className={card}>
          <h2 className="mb-3 font-bold">Open a case</h2>
          <div className="space-y-2">
            <Input placeholder="Case title, e.g. Potential fraudulent account" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Customer (optional)" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <div className="flex gap-2">
              <select className={sel} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => <option key={p}>{p}</option>)}</select>
              <select className={cn(sel, "flex-1")} value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })}>
                <option value="">Also involve…</option>{DEPTS.map((d) => <option key={d} value={d}>{label(d)}</option>)}
              </select>
            </div>
            <Button className="w-full" disabled={!form.title || add.isPending} onClick={() => add.mutate()}><Plus className="mr-2 size-4" />Open case</Button>
          </div>
        </section>
        <section className={card}>
          <select className={cn(sel, "mb-3 w-full")} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ACTIVE">Active cases</option><option value="ALL">All cases</option>
            {CASE_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          {list.length === 0 ? <p className="text-sm text-muted-foreground">No cases.</p> : (
            <ul className="space-y-2">
              {list.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setOpenId(c.id)} className={cn("w-full rounded-2xl p-3 text-left text-sm transition", openId === c.id ? "bg-primary/15" : "bg-background/60 hover:bg-muted")}>
                    <p className="text-xs text-muted-foreground">{caseNo(c.case_number)} · {label(c.status)} · {c.priority}</p>
                    <p className="truncate font-medium">{c.title}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {openId ? <CaseDetail id={openId} staff={data.staff} canLinkReports={data.canLinkReports} /> : <section className={cn(card, "text-sm text-muted-foreground")}>Select a case to see its timeline.</section>}
    </div>
  );
}

function CaseDetail({ id, staff, canLinkReports }: { id: string; staff: { id: string; name: string; department: string }[]; canLinkReports: boolean }) {
  const qc = useQueryClient();
  const load = useServerFn(getCase);
  const addEv = useServerFn(addCaseEvent);
  const upd = useServerFn(updateCaseFn());
  const wfLoad = useServerFn(listWorkflows);
  const start = useServerFn(startWorkflow);
  const key = ["console", "case", id];
  const { data, error } = useQuery({ queryKey: key, queryFn: () => load({ data: { id } }) });
  const { data: wf } = useQuery({ queryKey: ["console", "workflows"], queryFn: () => wfLoad() });
  const [entry, setEntry] = useState({ kind: "NOTE", body: "" });
  const [link, setLink] = useState({ ticket: "", report: "" });
  const [resolution, setResolution] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["console", "cases"] }); };
  const ev = useMutation({ mutationFn: () => addEv({ data: { id, ...entry } }), onSuccess: () => { setEntry({ ...entry, body: "" }); refresh(); } });
  const up = useMutation({ mutationFn: (v: Record<string, string>) => upd({ data: { id, ...v } }), onSuccess: () => { setLink({ ticket: "", report: "" }); refresh(); } });
  const st = useMutation({ mutationFn: (workflowId: string) => start({ data: { workflowId, caseId: id } }), onSuccess: refresh });

  if (error) return <section className={card}><p className="text-sm text-destructive">You don't have access to this case.</p></section>;
  if (!data) return <section className={card}><Loader2 className="size-5 animate-spin" /></section>;
  const c = data.case;
  const names = c.staff_ids.map((s) => staff.find((x) => x.id === s)?.name ?? "Former employee");

  return (
    <section className={cn(card, "space-y-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">CASE {caseNo(c.case_number)} · opened by {c.created_by} · {new Date(c.created_at).toLocaleString()}</p>
          <h2 className="text-xl font-bold">{c.title}</h2>
          {c.customer_name ? <p className="text-sm text-muted-foreground">Customer: {c.customer_name}</p> : null}
        </div>
        <select className={sel} value={c.status} onChange={(e) => up.mutate({ status: e.target.value })}>
          {CASE_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      </div>
      {up.error ? <p className="text-xs text-destructive">{(up.error as Error).message}</p> : null}

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-background/60 p-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Departments</p>
          <p>{c.departments.map(label).join(", ")}</p>
          <select className={cn(sel, "mt-2 w-full")} value="" onChange={(e) => e.target.value && up.mutate({ addDepartment: e.target.value })}>
            <option value="">Add department…</option>{DEPTS.filter((d) => !c.departments.includes(d)).map((d) => <option key={d} value={d}>{label(d)}</option>)}
          </select>
        </div>
        <div className="rounded-2xl bg-background/60 p-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Employees involved</p>
          <p>{names.join(", ") || "—"}</p>
          <select className={cn(sel, "mt-2 w-full")} value="" onChange={(e) => e.target.value && up.mutate({ addStaffId: e.target.value })}>
            <option value="">Add employee…</option>{staff.filter((s) => !c.staff_ids.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name} ({label(s.department)})</option>)}
          </select>
        </div>
        <div className="rounded-2xl bg-background/60 p-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Related tickets</p>
          {data.tickets.length ? data.tickets.map((t) => <p key={t.id} className="truncate">{t.subject} <span className="text-xs text-muted-foreground">· {t.status}</span></p>) : <p className="text-muted-foreground">None</p>}
          <div className="mt-2 flex gap-2"><Input placeholder="Ticket ID" value={link.ticket} onChange={(e) => setLink({ ...link, ticket: e.target.value })} /><Button size="sm" disabled={!link.ticket} onClick={() => up.mutate({ addTicketId: link.ticket })}>Link</Button></div>
        </div>
        <div className="rounded-2xl bg-background/60 p-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Related safety reports</p>
          {data.reportsHidden ? <p className="text-muted-foreground">Restricted to Trust &amp; Safety</p> : data.reports.length ? data.reports.map((r) => <p key={r.id}>{r.content_type}: {r.reason} <span className="text-xs text-muted-foreground">· {r.status}</span></p>) : <p className="text-muted-foreground">None</p>}
          {canLinkReports ? <div className="mt-2 flex gap-2"><Input placeholder="Report ID" value={link.report} onChange={(e) => setLink({ ...link, report: e.target.value })} /><Button size="sm" disabled={!link.report} onClick={() => up.mutate({ addReportId: link.report })}>Link</Button></div> : null}
        </div>
      </div>

      <div className="rounded-2xl bg-background/60 p-3 text-sm">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Workflows</p>
        {data.runs.map((r) => <p key={r.id}>{r.workflow_name} · {r.status === "ACTIVE" ? `with ${label(r.current_department ?? "")}` : "completed"}</p>)}
        <select className={cn(sel, "mt-2 w-full")} value="" onChange={(e) => e.target.value && st.mutate(e.target.value)}>
          <option value="">Start a workflow…</option>{(wf?.workflows ?? []).filter((w) => w.active).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">Timeline</p>
        <ol className="space-y-2 border-l border-border/60 pl-4">
          {data.events.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {e.staff_name} · <span className="font-semibold">{label(e.kind)}</span></p>
              <p className="whitespace-pre-wrap">{e.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select className={sel} value={entry.kind} onChange={(e) => setEntry({ ...entry, kind: e.target.value })}>
            {["NOTE", "EVIDENCE", "DECISION", "ACTION"].map((k) => <option key={k} value={k}>{k === "NOTE" ? "Internal note" : label(k).charAt(0) + label(k).slice(1).toLowerCase()}</option>)}
          </select>
          <Textarea rows={2} className="flex-1" placeholder="Add to the timeline…" value={entry.body} onChange={(e) => setEntry({ ...entry, body: e.target.value })} />
          <Button disabled={!entry.body.trim() || ev.isPending} onClick={() => ev.mutate()}>Add</Button>
        </div>
      </div>

      <div className="rounded-2xl bg-background/60 p-3">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Final resolution</p>
        {c.resolution ? <p className="mb-2 text-sm">{c.resolution}</p> : null}
        <div className="flex gap-2"><Textarea rows={2} placeholder="Record the final resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} /><Button disabled={!resolution.trim()} onClick={() => { up.mutate({ resolution }); setResolution(""); }}>Save</Button></div>
      </div>
    </section>
  );
}

// Late import keeps the component tree readable.
import { updateCase } from "@/lib/cases.functions";
function updateCaseFn() { return updateCase; }

function Workflows() {
  const qc = useQueryClient();
  const load = useServerFn(listWorkflows);
  const save = useServerFn(saveWorkflow);
  const adv = useServerFn(advanceWorkflow);
  const { data } = useQuery({ queryKey: ["console", "workflows"], queryFn: () => load() });
  const [form, setForm] = useState<{ name: string; trigger_category: string; steps: WorkflowStep[] }>({ name: "", trigger_category: "", steps: [{ department: "SUPPORT", action: "", hours: 24 }] });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ["console", "workflows"] });
  const sv = useMutation({ mutationFn: () => save({ data: form }), onSuccess: () => { setForm({ name: "", trigger_category: "", steps: [{ department: "SUPPORT", action: "", hours: 24 }] }); refresh(); } });
  const toggle = useMutation({ mutationFn: (w: { id: string; name: string; trigger_category: string | null; steps: unknown; active: boolean }) => save({ data: { id: w.id, name: w.name, trigger_category: w.trigger_category ?? "", steps: w.steps as WorkflowStep[], active: !w.active } }), onSuccess: refresh });
  const ad = useMutation({ mutationFn: (v: { runId: string; escalate?: boolean }) => adv({ data: { ...v, note: notes[v.runId] } }), onSuccess: (_r, v) => { setNotes({ ...notes, [v.runId]: "" }); refresh(); } });
  if (!data) return <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />;
  const active = data.runs.filter((r) => r.status === "ACTIVE");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={card}>
        <h2 className="mb-3 font-bold">Active hand-offs</h2>
        {active.length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting on your department.</p> : (
          <ul className="space-y-3">
            {active.map((r) => {
              const wfRow = data.workflows.find((w) => w.id === r.workflow_id);
              const step = (wfRow?.steps as WorkflowStep[] | undefined)?.[r.step_index];
              const overdue = r.due_at && new Date(r.due_at).getTime() < Date.now();
              const mine = data.superAdmin || r.current_department === data.department;
              return (
                <li key={r.id} className="rounded-2xl bg-background/60 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{r.workflow_name}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", overdue ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary")}>{overdue ? "OVERDUE" : "ON TIME"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Step {r.step_index + 1}: {label(r.current_department ?? "")} — {step?.action ?? ""}</p>
                  {r.due_at ? <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />Due {new Date(r.due_at).toLocaleString()}</p> : null}
                  <details className="mt-1 text-xs text-muted-foreground"><summary className="cursor-pointer">History</summary>
                    {(r.history as { at: string; by: string; event: string; note?: string }[]).map((h, i) => <p key={i}>{new Date(h.at).toLocaleString()} · {h.by} · {label(h.event)}{h.note ? ` — ${h.note}` : ""}</p>)}
                  </details>
                  {mine ? (
                    <div className="mt-2 flex gap-2">
                      <Input placeholder="Result / note" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                      <Button size="sm" onClick={() => ad.mutate({ runId: r.id })}>Done</Button>
                      <Button size="sm" variant="outline" onClick={() => ad.mutate({ runId: r.id, escalate: true })}>Escalate</Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {ad.error ? <p className="mt-2 text-xs text-destructive">{(ad.error as Error).message}</p> : null}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-bold">Workflow library</h2>
        <ul className="mb-4 space-y-2">
          {data.workflows.length === 0 ? <p className="text-sm text-muted-foreground">No workflows yet.</p> : data.workflows.map((w) => (
            <li key={w.id} className="rounded-2xl bg-background/60 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{w.name}{w.trigger_category ? <span className="text-xs text-muted-foreground"> · when ticket category is "{w.trigger_category}"</span> : null}</p>
                {data.canConfigure ? <Button size="sm" variant="ghost" onClick={() => toggle.mutate(w)}>{w.active ? "Pause" : "Activate"}</Button> : <span className="text-xs">{w.active ? "Active" : "Paused"}</span>}
              </div>
              <p className="text-xs text-muted-foreground">{(w.steps as WorkflowStep[]).map((s) => `${label(s.department)} (${s.hours}h)`).join(" → ")}</p>
            </li>
          ))}
        </ul>
        {data.canConfigure ? (
          <div className="space-y-2 rounded-2xl border border-border/50 p-3">
            <p className="text-sm font-semibold">New workflow</p>
            <Input placeholder="Name, e.g. Payment problem" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Ticket category that triggers it (optional)" value={form.trigger_category} onChange={(e) => setForm({ ...form, trigger_category: e.target.value })} />
            {form.steps.map((s, i) => (
              <div key={i} className="flex gap-2">
                <select className={sel} value={s.department} onChange={(e) => setForm({ ...form, steps: form.steps.map((x, j) => j === i ? { ...x, department: e.target.value } : x) })}>{DEPTS.map((d) => <option key={d} value={d}>{label(d)}</option>)}</select>
                <Input placeholder="Action" value={s.action} onChange={(e) => setForm({ ...form, steps: form.steps.map((x, j) => j === i ? { ...x, action: e.target.value } : x) })} />
                <Input type="number" className="w-20" value={s.hours} onChange={(e) => setForm({ ...form, steps: form.steps.map((x, j) => j === i ? { ...x, hours: Number(e.target.value) } : x) })} />
                <Button size="icon" variant="ghost" disabled={form.steps.length === 1} onClick={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setForm({ ...form, steps: [...form.steps, { department: "SUPPORT", action: "", hours: 24 }] })}>Add step</Button>
              <Button className="flex-1" disabled={!form.name || form.steps.some((s) => !s.action) || sv.isPending} onClick={() => sv.mutate()}>Save workflow</Button>
            </div>
            <p className="text-xs text-muted-foreground">Step deadline is in hours.</p>
          </div>
        ) : <p className="text-xs text-muted-foreground">Only the CEO can create or change workflows.</p>}
      </section>
    </div>
  );
}
