import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Send, ListTodo, History, FlaskConical } from "lucide-react";
import {
  EXPANSION_STAGES, SUPPORT_DEPARTMENTS, addOpportunityNote, createExpansionTask, getExpansionBoard,
  getOpportunityHistory, getOpportunityResearch, moveOpportunityStage, saveOpportunity, saveResearchReport,
  submitOpportunityToCeo, submitResearchToCeo, type ExpansionOpportunity, type ExpansionResearch,
} from "@/lib/expansion.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/refer/states";

const KEY = ["console", "expansion"];
const stageLabel = (k: string) => EXPANSION_STAGES.find(([s]) => s === k)?.[1] ?? k;
const DEPT_LABEL: Record<string, string> = {
  ADVERTISING: "Marketing", SALES: "Sales", OPERATIONS: "Operations", MARKETPLACE_OPS: "Marketplace",
  REVENUE: "Finance", TRUST: "Trust & Safety", CYBERSECURITY: "Cybersecurity", SUPER_ADMIN: "CEO / Executive", EXPANSION: "Expansion",
};

export function ExpansionWorkspace() {
  const qc = useQueryClient();
  const fetchBoard = useServerFn(getExpansionBoard);
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: () => fetchBoard() });
  const [editing, setEditing] = useState<Partial<ExpansionOpportunity> | null>(null);
  const [open, setOpen] = useState<ExpansionOpportunity | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  if (isLoading) return <LoadingState label="Loading expansion pipeline…" />;
  if (error || !data) return <p className="text-sm text-muted-foreground">Expansion data could not be loaded.</p>;
  const m = data.metrics;
  const insufficient = m.total === 0 && data.tasks.length === 0;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Expansion & Strategic Development</h2>
          <p className="text-sm text-muted-foreground">Opportunity pipeline, tasks and CEO submissions.</p>
        </div>
        <Button onClick={() => setEditing({ priority: "NORMAL", assigned_departments: [] })}><Plus className="mr-1 h-4 w-4" />New opportunity</Button>
      </div>

      {insufficient ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Insufficient expansion data.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[["Active projects", m.activeProjects], ["Under research", m.underResearch], ["Approved", m.approved],
            ["Pending approval", m.pendingApprovals], ["Open tasks", m.openTasks], ["Overdue tasks", m.overdueTasks]].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="mt-1 text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {EXPANSION_STAGES.map(([key, label]) => {
          const items = data.opportunities.filter((o) => o.stage === key);
          return (
            <div key={key} className="w-64 shrink-0 rounded-2xl border border-border bg-card/60 p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{label}</span><span>{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((o) => (
                  <button key={o.id} onClick={() => setOpen(o)} className="w-full rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary">
                    <p className="text-sm font-medium">{o.name}</p>
                    <p className="text-xs text-muted-foreground">{o.market}{o.category ? ` · ${o.category}` : ""}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant={o.priority === "HIGH" ? "destructive" : "secondary"}>{o.priority}</Badge>
                      {o.target_launch_date && <Badge variant="outline">{o.target_launch_date}</Badge>}
                      {o.submitted_to_ceo_at && <Badge variant="outline">Sent to CEO</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TaskList tasks={data.tasks} opportunities={data.opportunities} />

      {editing && <OpportunityForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {open && (
        <OpportunityDetail
          opp={data.opportunities.find((o) => o.id === open.id) ?? open}
          superAdmin={data.actor.superAdmin}
          tasks={data.tasks.filter((t) => t.expansion_opportunity_id === open.id)}
          onClose={() => setOpen(null)}
          onEdit={(o) => { setOpen(null); setEditing(o); }}
          onChanged={refresh}
        />
      )}
    </section>
  );
}

type Task = Awaited<ReturnType<typeof getExpansionBoard>>["tasks"][number];

function TaskList({ tasks, opportunities }: { tasks: Task[]; opportunities: ExpansionOpportunity[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const open = tasks.filter((t) => t.status !== "DONE");
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold"><ListTodo className="h-4 w-4" />Expansion tasks</h3>
      {open.length === 0 ? <p className="text-sm text-muted-foreground">No open expansion tasks.</p> : (
        <ul className="divide-y divide-border">
          {open.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {DEPT_LABEL[t.department] ?? t.department}
                  {t.expansion_opportunity_id && ` · ${opportunities.find((o) => o.id === t.expansion_opportunity_id)?.name ?? ""}`}
                </p>
              </div>
              <Badge variant={t.due_date < today ? "destructive" : "outline"}>{t.due_date < today ? `Overdue · ${t.due_date}` : t.due_date}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OpportunityForm({ initial, onClose, onSaved }: { initial: Partial<ExpansionOpportunity>; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(saveOpportunity);
  const [f, setF] = useState<Partial<ExpansionOpportunity>>(initial);
  const set = (k: keyof ExpansionOpportunity) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const mut = useMutation({
    mutationFn: () => save({ data: f }),
    onSuccess: (r) => { if (r.ok) { toast.success("Opportunity saved"); onSaved(); } else toast.error(r.error); },
    onError: () => toast.error("Could not save."),
  });
  const depts = f.assigned_departments ?? [];
  const area = (k: keyof ExpansionOpportunity, label: string) => (
    <div className="space-y-1 md:col-span-2"><Label>{label}</Label><Textarea rows={2} value={(f[k] as string) ?? ""} onChange={set(k)} /></div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Edit opportunity" : "New opportunity"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1"><Label>Opportunity name *</Label><Input value={f.name ?? ""} onChange={set("name")} /></div>
          <div className="space-y-1"><Label>Market / city / country *</Label><Input value={f.market ?? ""} onChange={set("market")} placeholder="e.g. Buea, Cameroon" /></div>
          <div className="space-y-1"><Label>Market category</Label><Input value={f.category ?? ""} onChange={set("category")} /></div>
          <div className="space-y-1"><Label>Estimated opportunity size</Label><Input value={f.estimated_size ?? ""} onChange={set("estimated_size")} placeholder="Your own estimate" /></div>
          <div className="space-y-1"><Label>Priority</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.priority ?? "NORMAL"} onChange={set("priority")}>
              <option>LOW</option><option>NORMAL</option><option>HIGH</option>
            </select>
          </div>
          <div className="space-y-1"><Label>Target launch date</Label><Input type="date" value={f.target_launch_date ?? ""} onChange={set("target_launch_date")} /></div>
          {area("potential_partners", "Potential partners")}
          {area("research_notes", "Research notes")}
          {area("competition", "Competition")}
          {area("risks", "Risks")}
          {area("required_resources", "Required resources")}
          {area("launch_requirements", "Estimated launch requirements")}
          <div className="space-y-1 md:col-span-2">
            <Label>Assigned departments</Label>
            <div className="flex flex-wrap gap-2">
              {SUPPORT_DEPARTMENTS.map((d) => {
                const on = depts.includes(d);
                return (
                  <button type="button" key={d} onClick={() => setF({ ...f, assigned_departments: on ? depts.filter((x) => x !== d) : [...depts, d] })}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    {DEPT_LABEL[d]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OpportunityDetail({ opp, superAdmin, tasks, onClose, onEdit, onChanged }: {
  opp: ExpansionOpportunity; superAdmin: boolean; tasks: Task[]; onClose: () => void; onEdit: (o: ExpansionOpportunity) => void; onChanged: () => void;
}) {
  const qc = useQueryClient();
  const hist = useServerFn(getOpportunityHistory);
  const move = useServerFn(moveOpportunityStage);
  const note = useServerFn(addOpportunityNote);
  const task = useServerFn(createExpansionTask);
  const submit = useServerFn(submitOpportunityToCeo);
  const histKey = ["console", "expansion", "history", opp.id];
  const { data: events } = useQuery({ queryKey: histKey, queryFn: () => hist({ data: { id: opp.id } }) });
  const after = () => { onChanged(); qc.invalidateQueries({ queryKey: histKey }); };
  const [noteText, setNote] = useState("");
  const [t, setT] = useState({ title: "", department: "EXPANSION", dueDate: "", priority: "NORMAL" });
  const [ceo, setCeo] = useState({ kind: "Expansion proposal", message: "" });

  const run = async (p: Promise<{ ok: boolean; error?: string }>, msg: string) => {
    try { const r = await p; if (r.ok) { toast.success(msg); after(); return true; } toast.error(r.error ?? "Failed"); } catch { toast.error("Failed"); }
    return false;
  };

  const field = (label: string, v: string | null) => v ? <div><p className="text-xs text-muted-foreground">{label}</p><p className="whitespace-pre-wrap text-sm">{v}</p></div> : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{opp.name}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge>{stageLabel(opp.stage)}</Badge><span className="text-muted-foreground">{opp.market}</span>
          <select className="ml-auto h-9 rounded-md border border-input bg-background px-2 text-sm" value={opp.stage}
            onChange={(e) => run(move({ data: { id: opp.id, stage: e.target.value } }), "Stage updated")}>
            {EXPANSION_STAGES.map(([k, l]) => <option key={k} value={k} disabled={k === "APPROVED" && !superAdmin}>{l}{k === "APPROVED" && !superAdmin ? " (CEO only)" : ""}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => onEdit(opp)}>Edit</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {field("Category", opp.category)}{field("Estimated size", opp.estimated_size)}
          {field("Target launch", opp.target_launch_date)}{field("Priority", opp.priority)}
          {field("Assigned departments", opp.assigned_departments.map((d) => DEPT_LABEL[d] ?? d).join(", ") || null)}
          {field("Potential partners", opp.potential_partners)}{field("Research notes", opp.research_notes)}
          {field("Competition", opp.competition)}{field("Risks", opp.risks)}
          {field("Required resources", opp.required_resources)}{field("Launch requirements", opp.launch_requirements)}
        </div>

        <ResearchPanel opp={opp} run={run} />

        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">Add task or request support</p>
          <div className="grid gap-2 md:grid-cols-4">
            <Input className="md:col-span-2" placeholder="e.g. Contact 20 hotels in Buea" value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} />
            <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={t.department} onChange={(e) => setT({ ...t, department: e.target.value })}>
              {["EXPANSION", ...SUPPORT_DEPARTMENTS].map((d) => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
            </select>
            <Input type="date" value={t.dueDate} onChange={(e) => setT({ ...t, dueDate: e.target.value })} />
          </div>
          <Button size="sm" disabled={!t.title} onClick={async () => {
            if (await run(task({ data: { ...t, opportunityId: opp.id } }), t.department === "EXPANSION" ? "Task created" : "Support request sent")) setT({ ...t, title: "" });
          }}>Create task</Button>
          {tasks.length > 0 && <ul className="text-xs text-muted-foreground">{tasks.map((x) => <li key={x.id}>• {x.title} — {DEPT_LABEL[x.department] ?? x.department} · {x.status}</li>)}</ul>}
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">Submit to CEO</p>
          <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={ceo.kind} onChange={(e) => setCeo({ ...ceo, kind: e.target.value })}>
            {["Market report", "Expansion proposal", "Partnership opportunity", "Institutional opportunity", "Risk assessment", "Launch recommendation"].map((k) => <option key={k}>{k}</option>)}
          </select>
          <Textarea rows={2} placeholder="Message to the CEO (optional)" value={ceo.message} onChange={(e) => setCeo({ ...ceo, message: e.target.value })} />
          <Button size="sm" onClick={async () => { if (await run(submit({ data: { id: opp.id, ...ceo } }), "Submitted to the CEO")) setCeo({ ...ceo, message: "" }); }}>
            <Send className="mr-1 h-4 w-4" />Submit to CEO
          </Button>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />Activity history</p>
          <div className="flex gap-2">
            <Input placeholder="Add a note" value={noteText} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" disabled={!noteText.trim()} onClick={async () => { if (await run(note({ data: { id: opp.id, body: noteText } }), "Note added")) setNote(""); }}>Add</Button>
          </div>
          <ul className="space-y-1 text-sm">
            {(events ?? []).map((e) => (
              <li key={e.id} className="rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {e.actor_name}</span>
                <p>{e.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type RunFn = (p: Promise<{ ok: boolean; error?: string }>, msg: string) => Promise<boolean>;

function ResearchPanel({ opp, run }: { opp: ExpansionOpportunity; run: RunFn }) {
  const qc = useQueryClient();
  const fetchResearch = useServerFn(getOpportunityResearch);
  const key = ["console", "expansion", "research", opp.id];
  const { data: reports } = useQuery({ queryKey: key, queryFn: () => fetchResearch({ data: { opportunityId: opp.id } }) });
  const submit = useServerFn(submitResearchToCeo);
  const [editing, setEditing] = useState<Partial<ExpansionResearch> | null>(null);
  const after = () => { qc.invalidateQueries({ queryKey: key }); run(Promise.resolve({ ok: true }), ""); };

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold"><FlaskConical className="h-4 w-4" />Market research</p>
        <Button size="sm" variant="outline" onClick={() => setEditing({ opportunity_id: opp.id, competition_level: "UNKNOWN" })}>
          <Plus className="mr-1 h-3 w-3" />New report
        </Button>
      </div>
      {!reports?.length ? (
        <p className="text-xs text-muted-foreground">No research recorded for this market yet.</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <button className="font-medium underline-offset-2 hover:underline" onClick={() => setEditing(r)}>{r.title}</button>
                <Badge variant={r.status === "SUBMITTED" ? "default" : "secondary"}>{r.status === "SUBMITTED" ? "Sent to CEO" : "Draft"}</Badge>
                <Badge variant="outline">Competition: {r.competition_level}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{r.created_by_name} · {new Date(r.updated_at).toLocaleDateString()}</span>
              </div>
              {r.findings && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.findings}</p>}
              {r.recommendation && <p className="mt-1 text-xs"><span className="text-muted-foreground">Recommendation: </span>{r.recommendation}</p>}
              {r.status !== "SUBMITTED" && (
                <Button size="sm" variant="ghost" className="mt-1 h-7 text-xs"
                  onClick={() => run(submit({ data: { id: r.id } }), "Report submitted to the CEO")}>
                  <Send className="mr-1 h-3 w-3" />Submit to CEO
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <ResearchForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); after(); }} />
      )}
    </div>
  );
}

function ResearchForm({ initial, onClose, onSaved }: { initial: Partial<ExpansionResearch>; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(saveResearchReport);
  const [f, setF] = useState<Partial<ExpansionResearch>>(initial);
  const set = (k: keyof ExpansionResearch) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const mut = useMutation({
    mutationFn: () => save({ data: f }),
    onSuccess: (r) => { if (r.ok) { toast.success("Research saved"); onSaved(); } else toast.error(r.error); },
    onError: () => toast.error("Could not save."),
  });
  const area = (k: keyof ExpansionResearch, label: string, span = true) => (
    <div className={`space-y-1 ${span ? "md:col-span-2" : ""}`}><Label>{label}</Label><Textarea rows={2} value={(f[k] as string) ?? ""} onChange={set(k)} /></div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Edit research report" : "New research report"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1"><Label>Report title *</Label><Input value={f.title ?? ""} onChange={set("title")} placeholder="e.g. Buea market study — Q4" /></div>
          <div className="space-y-1"><Label>Competition level</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.competition_level ?? "UNKNOWN"} onChange={set("competition_level")}>
              <option>UNKNOWN</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option>
            </select>
          </div>
          <div className="space-y-1 md:col-span-2"><Label>Estimated market size</Label><Input value={f.market_size ?? ""} onChange={set("market_size")} placeholder="Your own estimate" /></div>
          {area("demand", "Demand signals")}
          {area("competition_detail", "Competitors")}
          {area("entry_barriers", "Entry barriers")}
          {area("regulations", "Regulations & legal requirements")}
          {area("customer_segments", "Customer segments")}
          {area("pricing_insights", "Pricing insights")}
          {area("sources", "Sources (where the information came from)")}
          {area("findings", "Key findings")}
          {area("recommendation", "Recommendation")}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
