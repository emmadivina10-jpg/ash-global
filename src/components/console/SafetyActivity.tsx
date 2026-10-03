import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { loadTrustSafety, type TSReport } from "@/lib/trust-safety.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  POST: "Post", COMMENT: "Comment", SPOTLIGHT: "Reel", STORY: "Story", MARKET: "Market Update",
  EVENT: "Event", PROVIDER: "Service", PROPERTY: "Property", PROFILE: "Profile", USER: "Profile",
};

function statusLabel(r: TSReport) {
  if (r.resolved_at || r.status === "ACTIONED" || r.status === "DISMISSED") return "RESOLVED";
  if (r.status === "REVIEWING") return "UNDER REVIEW";
  return "OPEN";
}

function Age({ r }: { r: TSReport }) {
  if (r.resolved_at) return <Badge variant="outline">Resolved</Badge>;
  const h = (Date.now() - new Date(r.created_at).getTime()) / 3600000;
  const label = h < 1 ? `${Math.round(h * 60)}m` : `${Math.floor(h)}h`;
  const tone = h < 12 ? "bg-success/15 text-success" : h < 24 ? "bg-warning/20 text-warning-foreground" : "bg-destructive text-destructive-foreground";
  return <Badge className={cn("rounded-full border-0", tone)}>{h < 12 ? "On time" : h < 24 ? "Warning" : "Urgent"} · {label}</Badge>;
}

export function SafetyActivity() {
  const load = useServerFn(loadTrustSafety);
  const [tab, setTab] = useState<"Reports" | "Block Events">("Reports");
  const q = useQuery({
    queryKey: ["console", "trust-safety", "ALL"],
    queryFn: () => load({ data: { status: "ALL" } }),
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });
  const reports = [...(q.data?.reports ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
  const blocks = (q.data?.blocks ?? []).slice(0, 50);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">Safety Activity</p>
          <p className="text-xs text-muted-foreground">Live moderation events received from ASH Glo</p>
        </div>
        <div className="flex gap-1">
          {(["Reports", "Block Events"] as const).map((t) => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} className="h-7 rounded-full px-3 text-xs" onClick={() => setTab(t)}>{t}</Button>
          ))}
        </div>
      </div>

      {q.isLoading ? <p className="mt-3 text-xs text-muted-foreground">Loading…</p> : null}
      {q.error ? <p className="mt-3 text-xs text-destructive">{(q.error as Error).message}</p> : null}

      {tab === "Reports" ? (
        <ul className="mt-3 divide-y divide-border">
          {!q.isLoading && reports.length === 0 ? <li className="py-2 text-xs text-muted-foreground">No reports received yet.</li> : null}
          {reports.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <Badge variant="outline" className="text-[10px]">{statusLabel(r)}</Badge>
              <Badge className="rounded-full border-0 bg-primary/10 text-[10px] text-primary">{TYPE_LABEL[r.target_type] ?? r.target_type}</Badge>
              <span className="font-semibold text-foreground">{r.reason}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {r.reporter_name} → {r.reported_name}{r.content_preview ? ` · “${r.content_preview}”` : ""}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-GB")}</span>
              <Age r={r} />
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link to="/console/reports">Review</Link>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {!q.isLoading && blocks.length === 0 ? <li className="py-2 text-xs text-muted-foreground">No block events yet.</li> : null}
          {blocks.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className="font-semibold text-foreground">{b.actor_name}</span>
              <span className="text-xs text-muted-foreground">{b.kind === "USER_BLOCK" ? "blocked" : "unblocked"}</span>
              <span className="font-semibold text-foreground">{b.target_name}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">Context: {b.source || "—"}</span>
              <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString("en-GB")}</span>
              <Badge variant="outline" className="text-[10px]">{b.kind === "USER_BLOCK" ? "Active block" : "Unblocked"}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
