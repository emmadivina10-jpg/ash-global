import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { loadTrustSafety, moderationAction, type TSReport } from "@/lib/trust-safety.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TABS = ["Reports", "Block Events", "Flagged Content", "Removed Content", "Suspended Users", "Banned Users", "Moderation Activity"] as const;
const FILTERS = ["OPEN", "ACTIONED", "DISMISSED", "ALL"] as const;
const REMOVABLE = ["POST", "SPOTLIGHT", "COMMENT"];

function ageHours(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

function Sla({ report }: { report: TSReport }) {
  if (report.resolved_at) return <Badge variant="outline">Resolved</Badge>;
  const h = ageHours(report.created_at);
  const label = h < 1 ? `${Math.round(h * 60)}m` : `${Math.floor(h)}h`;
  const tone = h < 12 ? "bg-success/15 text-success" : h < 24 ? "bg-warning/20 text-warning-foreground" : "bg-destructive text-destructive-foreground";
  const text = h < 12 ? "On time" : h < 24 ? "Warning" : "Urgent";
  return <Badge className={cn("rounded-full border-0", tone)}>{text} · {label}</Badge>;
}

export function TrustSafetyPanel() {
  const load = useServerFn(loadTrustSafety);
  const act = useServerFn(moderationAction);
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Reports");
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("OPEN");
  const q = useQuery({ queryKey: ["console", "trust-safety", status], queryFn: () => load({ data: { status } }), refetchInterval: 60000 });

  const run = useMutation({
    mutationFn: (input: Parameters<typeof act>[0]["data"]) => act({ data: input }),
    onSuccess: async () => {
      toast.success("Moderation action saved");
      await qc.invalidateQueries({ queryKey: ["console", "trust-safety"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function ask(defaultReason: string) {
    const r = window.prompt("Reason (recorded in the moderation log):", defaultReason);
    return r === null ? null : r.trim() || defaultReason;
  }

  const d = q.data;
  const open = (d?.reports ?? []).filter((r) => !r.resolved_at);
  const nearing = open.filter((r) => ageHours(r.created_at) >= 12).length;
  const overdue = open.filter((r) => ageHours(r.created_at) >= 24).length;
  const flagged = (d?.content ?? []).filter((c) => c.status === "FLAGGED");
  const removed = (d?.content ?? []).filter((c) => c.status === "REMOVED");

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-extrabold text-foreground">Trust & Safety</h3>
        <p className="text-xs text-muted-foreground">Act on every report within 24 hours. Green under 12h, warning 12–24h, urgent over 24h.</p>
      </div>
      {nearing > 0 ? (
        <div role="alert" className={cn("rounded-xl p-3 text-sm font-semibold", overdue ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-foreground")}>
          {overdue ? `${overdue} report(s) are over 24 hours old. ` : ""}
          {nearing - overdue > 0 ? `${nearing - overdue} report(s) are approaching 24 hours.` : ""}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} className="rounded-full" onClick={() => setTab(t)}>
            {t}
            {t === "Reports" && open.length ? ` (${open.length})` : t === "Flagged Content" && flagged.length ? ` (${flagged.length})` : ""}
          </Button>
        ))}
      </div>

      {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {q.error ? <p className="text-sm text-destructive">{(q.error as Error).message}</p> : null}

      {tab === "Reports" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button key={f} size="sm" variant={status === f ? "secondary" : "ghost"} onClick={() => setStatus(f)}>{f}</Button>
            ))}
          </div>
          {(d?.reports ?? []).length === 0 ? <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Nothing in this queue.</p> : null}
          {(d?.reports ?? []).map((r) => {
            const removable = REMOVABLE.includes(r.target_type) && r.target_id;
            const busy = run.isPending;
            return (
              <article key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border-0 bg-primary/10 text-primary">{r.target_type}</Badge>
                  <span className="text-sm font-bold text-foreground">{r.reason}</span>
                  <Badge variant="outline">{r.status}</Badge>
                  <Sla report={r} />
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-GB")}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Reported: <span className="font-semibold text-foreground">{r.reported_name}</span> · Reporter: {r.reporter_name} · ID {r.id.slice(0, 8)}
                </p>
                {r.content_preview ? <p className="mt-2 rounded-lg bg-muted p-2 text-sm text-foreground">“{r.content_preview}”</p> : null}
                {r.details ? <p className="mt-2 text-sm text-muted-foreground">Reporter note: {r.details}</p> : null}
                {r.action_taken ? <p className="mt-2 text-xs text-muted-foreground">Action: {r.action_taken} — {r.resolution_reason}</p> : null}
                {!r.resolved_at ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run.mutate({ action: "REVIEW", reportId: r.id })}>Review</Button>
                    {removable ? (
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => { const reason = ask("Removed for violating Community Guidelines"); if (reason) run.mutate({ action: "REMOVE", reportId: r.id, contentKind: r.target_type, contentId: r.target_id!, ...(r.target_user_id ? { userId: r.target_user_id } : {}), reason }); }}>Remove Content</Button>
                    ) : null}
                    {r.target_user_id ? (
                      <>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => { const reason = ask("Community Guidelines warning"); if (reason) run.mutate({ action: "WARN", reportId: r.id, userId: r.target_user_id!, reason }); }}>Warn User</Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => { const days = Number(window.prompt("Suspend for how many days?", "7")); if (!days) return; const reason = ask("Temporary suspension"); if (reason) run.mutate({ action: "SUSPEND", reportId: r.id, userId: r.target_user_id!, reason, days }); }}>Suspend User</Button>
                        <Button size="sm" variant="destructive" disabled={busy} onClick={() => { if (!window.confirm(`Permanently ban ${r.reported_name}?`)) return; const reason = ask("Banned for serious violations"); if (reason) run.mutate({ action: "BAN", reportId: r.id, userId: r.target_user_id!, reason }); }}>Ban / Eject</Button>
                      </>
                    ) : null}
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => { const reason = ask("No violation found"); if (reason) run.mutate({ action: "CLOSE", reportId: r.id, reason }); }}>Close Report</Button>
                  </div>
                ) : removable && r.action_taken === "REMOVE" ? (
                  <Button size="sm" variant="outline" className="mt-3" disabled={run.isPending} onClick={() => run.mutate({ action: "RESTORE", contentKind: r.target_type, contentId: r.target_id!, reason: "Restored after review" })}>Restore Content</Button>
                ) : null}
              </article>
            );
          })}
        </>
      ) : null}

      {tab === "Block Events" ? (
        <List empty="No block events." rows={(d?.blocks ?? []).map((b) => ({ key: b.id, title: `${b.actor_name} ${b.kind === "USER_BLOCK" ? "blocked" : "unblocked"} ${b.target_name}`, sub: `Source: ${b.source} · ${new Date(b.created_at).toLocaleString("en-GB")}` }))} />
      ) : null}

      {tab === "Flagged Content" || tab === "Removed Content" ? (
        <div className="space-y-2">
          {(tab === "Flagged Content" ? flagged : removed).length === 0 ? <p className="text-sm text-muted-foreground">Nothing here.</p> : null}
          {(tab === "Flagged Content" ? flagged : removed).map((c) => (
            <article key={c.id} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">{c.kind} · {c.author_name} · {new Date(c.created_at).toLocaleString("en-GB")}</p>
              <p className="mt-1 text-sm text-foreground">{c.text || "(media only)"}</p>
              <div className="mt-2 flex gap-2">
                {c.status !== "REMOVED" ? (
                  <Button size="sm" variant="destructive" disabled={run.isPending} onClick={() => run.mutate({ action: "REMOVE", contentKind: c.kind, contentId: c.id, userId: c.author_id, reason: "Removed after automated flag review" })}>Remove</Button>
                ) : null}
                <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => run.mutate({ action: "RESTORE", contentKind: c.kind, contentId: c.id, reason: c.status === "FLAGGED" ? "Approved after review" : "Restored after review" })}>{c.status === "FLAGGED" ? "Approve" : "Restore"}</Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "Suspended Users" || tab === "Banned Users" ? (
        <div className="space-y-2">
          {(tab === "Suspended Users" ? d?.suspended ?? [] : d?.banned ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nobody here.</p> : null}
          {(tab === "Suspended Users" ? d?.suspended ?? [] : d?.banned ?? []).map((m) => (
            <article key={m.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-sm font-bold text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">{tab === "Suspended Users" ? "Until" : "Since"} {m.until ? new Date(m.until).toLocaleString("en-GB") : "—"} · {m.reason ?? ""}</p>
              </div>
              <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => { if (window.confirm(`Reinstate ${m.name}?`)) run.mutate({ action: "UNBAN", userId: m.user_id, reason: "Reinstated by moderator" }); }}>Reinstate</Button>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "Moderation Activity" ? (
        <List empty="No moderation actions yet." rows={(d?.activity ?? []).map((a) => ({ key: a.id, title: `${a.action.replace("TS_", "")} by ${a.actor}`, sub: `${a.reason ?? ""} · ${new Date(a.created_at).toLocaleString("en-GB")}` }))} />
      ) : null}
    </section>
  );
}

function List({ rows, empty }: { rows: Array<{ key: string; title: string; sub: string }>; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.key} className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold text-foreground">{r.title}</p>
          <p className="text-xs text-muted-foreground">{r.sub}</p>
        </div>
      ))}
    </div>
  );
}
