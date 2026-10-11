import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Brain, Loader2, RotateCcw, Search, ShieldBan, Send } from "lucide-react";
import {
  addIpBlock, askCyberIntelligence, deleteSecurityBulletin, getDailyReview, getSecurityAccount, getSecurityPosture,
  getStaffRotation, getSuspiciousActivity, getTrainingOverview, liftIpBlock, listIpBlocks, listSecurityActions,
  listSecurityBulletins, reportGapsToCeo, requestPasswordRotation, revertSecurityActions, rotateStaffPassword,
  saveTraining, searchSecurityAccounts, sendSecurityAlert, setAccountRestrictions, updateDailyReview,
} from "@/lib/cyber-control.functions";
import { EMPTY_RESTRICTIONS, RESTRICTION_LEVELS, type RestrictionState } from "@/lib/cyber-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AccountControlTab, AccountIntelligence, ReportsTab, WorldMapTab } from "./CyberDeskTabs";

const TABS = ["World map", "Daily review", "Accounts", "Account control", "Reports", "IP & browsers", "Alerts", "Staff logins", "Training", "Posture", "Actions"] as const;
type Tab = (typeof TABS)[number];

function errMsg(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("PROTECTED_ACCOUNT")) return "That is a protected owner/admin account and cannot be touched.";
  if (m.includes("FORBIDDEN")) return "Your login is not allowed to do that.";
  return m;
}

function Card({ title, children, desc }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <h3 className="font-display text-base font-bold">{title}</h3>
      {desc ? <p className="mb-3 text-xs text-muted-foreground">{desc}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

export function CyberCommandCenter() {
  const [tab, setTab] = useState<Tab>("World map");
  const [focusUser, setFocusUser] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{t}</button>
        ))}
      </div>
      {tab === "World map" && <WorldMapTab onOpenAccount={(id) => { setFocusUser(id); setTab("Accounts"); }} />}
      {tab === "Daily review" && <DailyReview />}
      {tab === "Accounts" && <Accounts initialUserId={focusUser} />}
      {tab === "Account control" && <AccountControlTab initialUserId={focusUser} />}
      {tab === "Reports" && <ReportsTab />}
      {tab === "IP & browsers" && <IpBlocks />}
      {tab === "Alerts" && <Alerts />}
      {tab === "Staff logins" && <Rotation />}
      {tab === "Training" && <Training />}
      {tab === "Posture" && <Posture />}
      {tab === "Actions" && <Actions />}
    </div>
  );
}

type Item = { title: string; detail: string; action: string; priority: string; handled?: boolean };

function DailyReview() {
  const load = useServerFn(getDailyReview);
  const update = useServerFn(updateDailyReview);
  const ask = useServerFn(askCyberIntelligence);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cyber", "review"], queryFn: () => load({ data: {} }) });
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<{ q: string; a: string }[]>([]);
  const askM = useMutation({ mutationFn: (x: string) => ask({ data: { question: x } }), onSuccess: (r, x) => { setAnswers((h) => [{ q: x, a: r.answer }, ...h]); setQuestion(""); } });
  const upd = async (d: { handledIndex?: number; acknowledge?: boolean }) => { await update({ data: d }); await qc.invalidateQueries({ queryKey: ["cyber", "review"] }); };
  const regen = async () => { await load({ data: { regenerate: true } }); await qc.invalidateQueries({ queryKey: ["cyber", "review"] }); };
  const t = q.data?.today;
  const items = ((t?.items ?? []) as Item[]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card title={`ASH Intelligence daily review${t ? ` — ${t.review_date}` : ""}`} desc="Built each day from real system records. Open it, work each item, then acknowledge.">
        {q.isPending ? <Loader2 className="size-5 animate-spin" /> : !t ? <p className="text-sm">Data not available</p> : (
          <div className="space-y-3">
            <p className="text-sm">{t.summary}</p>
            <ul className="space-y-2">
              {items.map((it, i) => (
                <li key={i} className={cn("rounded-2xl border border-border p-3", it.handled && "opacity-60")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold"><span className={cn("mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold", it.priority === "HIGH" ? "bg-destructive/15 text-destructive" : "bg-muted")}>{it.priority}</span>{it.title}</p>
                      <p className="text-xs text-muted-foreground">{it.detail}</p>
                      <p className="mt-1 text-xs"><b>Action:</b> {it.action}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void upd({ handledIndex: i })}>{it.handled ? "Undo" : "Mark handled"}</Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {t.acknowledged_at ? <p className="text-xs text-muted-foreground">Acknowledged by {t.acknowledged_by} · {formatDateTime(t.acknowledged_at)}</p> : <Button size="sm" onClick={() => void upd({ acknowledge: true })}>Acknowledge today's review</Button>}
              <Button size="sm" variant="ghost" onClick={() => void regen()}>Refresh review</Button>
            </div>
            <p className="text-xs text-muted-foreground">Last 14 days: {(q.data?.history ?? []).map((h) => `${h.review_date.slice(5)} ${h.acknowledged_at ? "✓" : "✗"}`).join(" · ")}</p>
          </div>
        )}
      </Card>
      <Card title="Ask ASH Intelligence" desc="Answers only from real security data.">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (question.trim()) askM.mutate(question); }}>
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Any brute-force attempts today?" />
          <Button size="icon" disabled={askM.isPending}>{askM.isPending ? <Loader2 className="size-4 animate-spin" /> : <Brain className="size-4" />}</Button>
        </form>
        <ul className="mt-3 space-y-2">{answers.map((a, i) => <li key={i} className="rounded-2xl bg-muted p-3 text-sm"><p className="text-xs font-semibold">{a.q}</p><p className="whitespace-pre-wrap">{a.a}</p></li>)}</ul>
      </Card>
    </div>
  );
}

function Accounts({ initialUserId }: { initialUserId?: string | null }) {
  const search = useServerFn(searchSecurityAccounts);
  const getAcc = useServerFn(getSecurityAccount);
  const setR = useServerFn(setAccountRestrictions);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(initialUserId ?? null);
  const results = useMutation({ mutationFn: (x: string) => search({ data: { q: x } }) });
  const detail = useQuery({ queryKey: ["cyber", "acc", sel], enabled: Boolean(sel), queryFn: () => getAcc({ data: { userId: sel! } }) });
  const [state, setState] = useState<RestrictionState>(EMPTY_RESTRICTIONS);
  const [reason, setReason] = useState("");
  const d = detail.data;
  const save = async () => {
    try { await setR({ data: { userId: sel!, state, reason } }); toast.success("Restrictions saved. The CEO can revert this."); setReason(""); await detail.refetch(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <Card title="Find a member or provider">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); results.mutate(q); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, username or email" />
          <Button size="icon"><Search className="size-4" /></Button>
        </form>
        <ul className="mt-3 divide-y divide-border">
          {(results.data ?? []).map((r) => (
            <li key={r.user_id}><button type="button" className="w-full py-2 text-left text-sm" onClick={() => { setSel(r.user_id); setState(r.restrictions); }}>
              <b>{r.full_name ?? r.username}</b> {r.protected ? <span className="ml-1 rounded-full bg-primary/15 px-2 text-[10px] font-bold text-primary">PROTECTED</span> : null}
              {Object.values(r.restrictions).some(Boolean) ? <span className="ml-1 rounded-full bg-destructive/15 px-2 text-[10px] font-bold text-destructive">RESTRICTED</span> : null}
              <span className="block text-xs text-muted-foreground">{r.email} · {r.account_status}</span>
            </button></li>
          ))}
        </ul>
      </Card>
      <Card title="Account security view">
        {!sel ? <p className="text-sm text-muted-foreground">Pick an account.</p> : detail.isPending ? <Loader2 className="size-5 animate-spin" /> : !d ? <p className="text-sm">Data not available</p> : (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-base font-bold">{d.profile.full_name} {d.suspicious ? <span className="ml-1 rounded-full bg-destructive/15 px-2 text-[10px] font-bold text-destructive">NEEDS REVIEW</span> : null}</p>
              <p className="text-xs text-muted-foreground">{d.profile.email} · {d.profile.phone ?? "no phone"} · joined {formatDateTime(d.profile.created_at)}</p>
              {d.provider ? <p className="text-xs">Provider: {d.provider.business_name ?? d.provider.slug} · {d.provider.is_live ? "live" : "not live"}</p> : null}
              <p className="text-xs">Wallet: {d.wallet ? `${d.wallet.available_balance} available · ${d.wallet.pending_balance} pending ${d.wallet.currency}` : "none"} (read-only)</p>
            </div>
            <div>
              <p className="mb-1 font-semibold">Compliance</p>
              <ul className="grid gap-1 sm:grid-cols-2">{d.compliance.map((c) => <li key={c.label} className={c.ok ? "text-primary" : "text-destructive"}>{c.ok ? "✓" : "✗"} {c.label}</li>)}</ul>
              <p className="mt-1 text-xs text-muted-foreground">{d.openReports} open reports · {d.offplatformFlags} off-platform flags · blocked by {d.blockedBy}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold">Devices & IPs</p>
              {d.fingerprints.length === 0 ? <p className="text-xs text-muted-foreground">Data not available</p> : (
                <ul className="space-y-1 text-xs">{d.fingerprints.map((f) => <li key={f.ip + f.fingerprint} className="font-mono">{f.ip} · {f.country ?? "?"} · {f.fingerprint} · {f.hits}× · {f.user_agent?.slice(0, 60)}</li>)}</ul>
              )}
            </div>
            <AccountIntelligence userId={sel} />
            {d.protected ? <p className="rounded-2xl bg-primary/10 p-3 text-xs font-semibold">Protected owner/admin account. Cyber cannot restrict, freeze or sign it out.</p> : (
              <div className="space-y-2">
                <p className="font-semibold">Restriction levels</p>
                {RESTRICTION_LEVELS.map((l) => (
                  <label key={l.key} className="flex items-start gap-2 text-xs">
                    <input type="checkbox" checked={state[l.key]} onChange={(e) => setState((s) => ({ ...s, [l.key]: e.target.checked }))} />
                    <span><b>{l.level}. {l.label}</b> — {l.effect}</span>
                  </label>
                ))}
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, logged)" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void save()} disabled={!reason.trim()}><ShieldBan className="size-4" />Apply</Button>
                  <Button size="sm" variant="outline" onClick={() => setState(EMPTY_RESTRICTIONS)}>Clear all</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function IpBlocks() {
  const list = useServerFn(listIpBlocks);
  const add = useServerFn(addIpBlock);
  const lift = useServerFn(liftIpBlock);
  const sus = useServerFn(getSuspiciousActivity);
  const blocks = useQuery({ queryKey: ["cyber", "ip"], queryFn: () => list() });
  const s = useQuery({ queryKey: ["cyber", "sus"], queryFn: () => sus() });
  const [kind, setKind] = useState<"IP" | "CIDR" | "FINGERPRINT">("IP");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("");
  const submit = async () => {
    try { await add({ data: { kind, value, reason, hours: hours ? Number(hours) : null } }); setValue(""); setReason(""); toast.success("Blocked"); await blocks.refetch(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Block an IP, range or browser" desc="Blocked visitors see 'Access blocked'. Payment webhooks are never blocked.">
        <div className="space-y-2">
          <select className="w-full rounded-xl border border-border bg-background p-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="IP">Single IP</option><option value="CIDR">IP range (e.g. 41.202.0.0/16)</option><option value="FINGERPRINT">Browser fingerprint</option>
          </select>
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" />
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
          <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours (empty = permanent)" inputMode="numeric" />
          <Button size="sm" onClick={() => void submit()}>Block</Button>
        </div>
        <ul className="mt-4 space-y-1 text-xs">
          {(blocks.data ?? []).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 border-b border-border py-1">
              <span className="font-mono">{b.kind} {b.value}</span><span className="truncate text-muted-foreground">{b.reason}</span>
              {b.lifted_at ? <span className="text-muted-foreground">lifted</span> : <Button size="sm" variant="ghost" onClick={async () => { await lift({ data: { id: b.id } }); await blocks.refetch(); }}>Lift</Button>}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Suspicious logs and browsers (7 days)">
        {!s.data ? <Loader2 className="size-5 animate-spin" /> : (
          <div className="space-y-3 text-xs">
            <p className="font-semibold">One browser used by 3+ accounts</p>
            {s.data.sharedDevices.length ? s.data.sharedDevices.map((d) => <p key={d.fingerprint} className="font-mono">{d.fingerprint} · {d.accounts} accounts <Button size="sm" variant="ghost" onClick={() => { setKind("FINGERPRINT"); setValue(d.fingerprint); }}>Block…</Button></p>) : <p className="text-muted-foreground">None</p>}
            <p className="font-semibold">Accounts seen in 3+ countries</p>
            {s.data.multiCountry.length ? s.data.multiCountry.map((m) => <p key={m.userId} className="font-mono">{m.userId.slice(0, 8)} · {m.countries.join(", ")}</p>) : <p className="text-muted-foreground">None</p>}
            <p className="font-semibold">Warning / critical events</p>
            {s.data.events.length ? s.data.events.map((e) => <p key={e.id}><b>{e.severity}</b> {e.kind} {e.subject ? <span className="font-mono">{e.subject}</span> : null} · {formatDateTime(e.created_at)}</p>) : <p className="text-muted-foreground">None</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

const DEPTS = ["SUPER_ADMIN", "SUPPORT", "TRUST", "REVENUE", "MARKETPLACE_OPS", "ADVERTISING", "GROWTH", "OPERATIONS", "EXPANSION"];

function Alerts() {
  const send = useServerFn(sendSecurityAlert);
  const list = useServerFn(listSecurityBulletins);
  const del = useServerFn(deleteSecurityBulletin);
  const b = useQuery({ queryKey: ["cyber", "bulletins"], queryFn: () => list() });
  const [audience, setAudience] = useState<"STAFF" | "MEMBERS" | "ALL_MEMBERS">("STAFF");
  const [depts, setDepts] = useState<string[]>(["TRUST"]);
  const [userIds, setUserIds] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("WARN");
  const submit = async () => {
    try {
      const r = await send({ data: { title, body, severity, audience, departments: depts, userIds: userIds.split(/[\s,]+/).filter(Boolean) } });
      toast.success(`Sent to ${r.recipients} recipient(s)`); setTitle(""); setBody(""); await b.refetch();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Send a security alert" desc="Members get a 20-second banner and a notification that opens the Security update screen. Only Cyber can delete it.">
        <div className="space-y-2 text-sm">
          <select className="w-full rounded-xl border border-border bg-background p-2" value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
            <option value="STAFF">Staff teams</option><option value="MEMBERS">Specific members (user IDs)</option><option value="ALL_MEMBERS">All members</option>
          </select>
          {audience === "STAFF" ? <div className="flex flex-wrap gap-1">{DEPTS.map((d) => <button key={d} type="button" onClick={() => setDepts((x) => x.includes(d) ? x.filter((y) => y !== d) : [...x, d])} className={cn("rounded-full px-2 py-1 text-[11px]", depts.includes(d) ? "bg-primary text-primary-foreground" : "bg-muted")}>{d}</button>)}</div> : null}
          {audience === "MEMBERS" ? <Textarea value={userIds} onChange={(e) => setUserIds(e.target.value)} placeholder="User IDs, comma separated" /> : null}
          <select className="w-full rounded-xl border border-border bg-background p-2" value={severity} onChange={(e) => setSeverity(e.target.value)}><option>INFO</option><option>WARN</option><option>CRITICAL</option></select>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" rows={5} />
          <Button size="sm" onClick={() => void submit()} disabled={!title || !body}><Send className="size-4" />Send</Button>
        </div>
      </Card>
      <Card title="Security updates sent">
        <ul className="space-y-2 text-sm">
          {(b.data?.bulletins ?? []).map((x) => (
            <li key={x.id} className="rounded-2xl border border-border p-3">
              <p className="font-semibold">{x.title} <span className="text-[10px] text-muted-foreground">{x.severity} · {x.audience}</span></p>
              <p className="text-xs text-muted-foreground">{formatDateTime(x.created_at)} · {x.created_by}</p>
              {b.data?.canDelete ? <Button size="sm" variant="ghost" onClick={async () => { await del({ data: { id: x.id } }); await b.refetch(); }}>Delete</Button> : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Rotation() {
  const load = useServerFn(getStaffRotation);
  const req = useServerFn(requestPasswordRotation);
  const rot = useServerFn(rotateStaffPassword);
  const q = useQuery({ queryKey: ["cyber", "rotation"], queryFn: () => load() });
  const [revealed, setRevealed] = useState<{ username: string; password: string } | null>(null);
  return (
    <Card title="Staff login rotation (every 14 days)" desc="Cyber requests rotation; only the CEO generates the new password, shown once.">
      {revealed ? <div className="mb-3 rounded-2xl bg-primary/10 p-3 text-sm">New password for <b>{revealed.username}</b>: <code className="font-mono">{revealed.password}</code> — copy it now, it will not be shown again. <Button size="sm" variant="ghost" onClick={() => setRevealed(null)}>Hide</Button></div> : null}
      <ul className="divide-y divide-border text-sm">
        {(q.data?.seats ?? []).map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 py-2">
            <span><b>{s.username}</b> <span className="text-xs text-muted-foreground">{s.employee_name ?? s.full_name} · {s.department}</span></span>
            <span className={cn("text-xs font-semibold", s.overdue ? "text-destructive" : "text-muted-foreground")}>{s.overdue ? `Overdue ${-s.daysLeft}d` : `${s.daysLeft}d left`}</span>
            {q.data?.canRotate ? (
              <Button size="sm" variant="outline" onClick={async () => { if (confirm(`Rotate ${s.username}? The old password stops working immediately.`)) { try { setRevealed(await rot({ data: { staffId: s.id } })); await q.refetch(); } catch (e) { toast.error(errMsg(e)); } } }}>Rotate now</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={async () => { await req({ data: { staffId: s.id } }); toast.success("CEO notified"); }}>Request rotation</Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Training() {
  const overview = useServerFn(getTrainingOverview);
  const save = useServerFn(saveTraining);
  const q = useQuery({ queryKey: ["cyber", "training"], queryFn: () => overview() });
  const [title, setTitle] = useState("");
  const [lessons, setLessons] = useState("");
  const [quiz, setQuiz] = useState("");
  const publish = async () => {
    try {
      const ls = lessons.split(/\n{2,}/).map((block) => { const [h, ...rest] = block.split("\n"); return { heading: h ?? "", body: rest.join("\n") }; }).filter((l) => l.heading);
      const qs = quiz.split(/\n{2,}/).map((block) => { const lines = block.split("\n").filter(Boolean); const opts = lines.slice(1); const correct = Math.max(0, opts.findIndex((o) => o.startsWith("*"))); return { q: lines[0] ?? "", options: opts.map((o) => o.replace(/^\*/, "")), correct }; }).filter((x) => x.q && x.options.length >= 2);
      await save({ data: { title, lessons: ls, quiz: qs } }); toast.success("Training published to all staff"); await q.refetch();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Publish awareness training (every 6 months)" desc="Lessons: heading line then text, blank line between. Quiz: question line, options below, mark the correct one with *.">
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title, e.g. H1 2027 Phishing & Passwords" />
          <Textarea rows={6} value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder={"Spotting phishing\nNever click links asking for your console password...\n\nPassword hygiene\n..."} />
          <Textarea rows={6} value={quiz} onChange={(e) => setQuiz(e.target.value)} placeholder={"What do you do with a suspicious link?\nClick it\n*Report it to Cyber\nIgnore it"} />
          <Button size="sm" onClick={() => void publish()}>Publish</Button>
        </div>
      </Card>
      <Card title={q.data?.training ? `Current: ${q.data.training.title}` : "No active training"}>
        <ul className="divide-y divide-border text-sm">
          {(q.data?.staff ?? []).map((s) => <li key={s.id} className="flex justify-between py-1.5"><span>{s.employee_name ?? s.username}</span><span className={cn("text-xs", s.overdue ? "text-destructive" : "text-primary")}>{s.lastCompleted ? formatDateTime(s.lastCompleted) : "Never"}{s.overdue ? " · due" : ""}</span></li>)}
        </ul>
      </Card>
    </div>
  );
}

function Posture() {
  const load = useServerFn(getSecurityPosture);
  const report = useServerFn(reportGapsToCeo);
  const q = useQuery({ queryKey: ["cyber", "posture"], queryFn: () => load() });
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  return (
    <Card title="Security framework — in place vs missing" desc="Mapped to OWASP ASVS and NIST CSF. Not a formal certification.">
      <p className="mb-2 text-xs text-muted-foreground">{q.data ? `${q.data.overdueRotations} overdue staff passwords · last self-check ${q.data.lastScan ? formatDateTime(q.data.lastScan) : "never"}` : ""}</p>
      <ul className="space-y-1 text-sm">
        {(q.data?.items ?? []).map((i) => (
          <li key={i.control} className="flex items-center gap-2">
            {i.status === "MISSING" ? <input type="checkbox" checked={picked.includes(i.control)} onChange={(e) => setPicked((p) => e.target.checked ? [...p, i.control] : p.filter((x) => x !== i.control))} /> : <span className="w-[13px]" />}
            <span className={i.status === "IN_PLACE" ? "text-primary" : "text-destructive"}>{i.status === "IN_PLACE" ? "✓" : "✗"}</span>
            <span>{i.control}</span><span className="ml-auto text-[10px] text-muted-foreground">{i.framework}</span>
          </li>
        ))}
      </ul>
      <Textarea className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the CEO (optional)" />
      <Button size="sm" className="mt-2" disabled={!picked.length} onClick={async () => { await report({ data: { gaps: picked, note } }); toast.success("Reported to the CEO"); setPicked([]); }}>Report selected gaps to CEO</Button>
    </Card>
  );
}

function Actions() {
  const list = useServerFn(listSecurityActions);
  const revert = useServerFn(revertSecurityActions);
  const q = useQuery({ queryKey: ["cyber", "actions"], queryFn: () => list() });
  const run = async (d: { ids?: string[]; actorName?: string; day?: string }) => {
    try { const r = await revert({ data: d }); toast.success(`Reverted ${r.reverted} action(s)`); await q.refetch(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Card title="Cyber actions" desc="Everything the Cyber team did. The CEO can revert any action in one click.">
      <ul className="divide-y divide-border text-sm">
        {(q.data?.actions ?? []).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
            <span className="font-semibold">{a.action}</span>
            <span className="text-xs text-muted-foreground">{a.actor_name} · {formatDateTime(a.created_at)} {a.reason ? `· ${a.reason}` : ""}</span>
            {a.reverted_at ? <span className="ml-auto text-xs text-muted-foreground">Reverted by {a.reverted_by}</span> : q.data?.canRevert ? (
              <span className="ml-auto flex gap-1">
                <Button size="sm" variant="outline" onClick={() => void run({ ids: [a.id] })}><RotateCcw className="size-3" />Revert</Button>
                <Button size="sm" variant="ghost" onClick={() => void run({ actorName: a.actor_name, day: a.created_at.slice(0, 10) })}>Revert all that day</Button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
