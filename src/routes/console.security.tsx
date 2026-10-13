import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Download,
  Gauge,
  KeyRound,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSecurityAudit,
  runSecuritySelfCheck,
  type SecurityEvent,
} from "@/lib/console.functions";
import { getCyberOps } from "@/lib/cyber.functions";
import { CyberCommandCenter } from "@/components/console/CyberCommandCenter";
import { MessageMemberDialog } from "@/components/console/MessageMemberDialog";
import { SectionCard, StatCard } from "@/components/refer/cards";
import { ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console/security")({
  component: ConsoleSecurity,
});

const RANGES = [24, 72, 168, 720] as const;

const RANGE_LABEL: Record<number, string> = {
  24: "24 hours",
  72: "3 days",
  168: "7 days",
  720: "30 days",
};

const KIND_LABEL: Record<string, string> = {
  BOOKING_AUTHZ_DENIED: "Blocked booking access attempt",
  RATE_LIMIT_BLOCKED: "Throttled — too many requests",
  SELFCHECK: "Automated security scan",
  SELFCHECK_AUTH_FAILED: "Bad scan credentials",
};

function SeverityPill({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        severity === "CRITICAL" && "bg-destructive/15 text-destructive",
        severity === "WARN" && "bg-gold/15 text-gold",
        severity === "INFO" && "bg-muted text-muted-foreground",
      )}
    >
      {severity}
    </span>
  );
}

function EventRow({ event }: { event: SecurityEvent }) {
  const detail = event.detail ?? {};
  const bits = Object.entries(detail)
    .filter(([key]) => key !== "findings")
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");

  return (
    <li className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SeverityPill severity={event.severity} />
          {KIND_LABEL[event.kind] ?? event.kind}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {event.route ? <span className="font-mono">{event.route}</span> : null}
          {bits ? ` — ${bits}` : ""}
        </p>
        {event.subject ? (
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            visitor {event.subject}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatDateTime(event.created_at)}
      </span>
    </li>
  );
}

function ConsoleSecurity() {
  const fetchAudit = useServerFn(getSecurityAudit);
  const runCheck = useServerFn(runSecuritySelfCheck);
  const [hours, setHours] = useState<(typeof RANGES)[number]>(24);
  const [running, setRunning] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const fetchOps = useServerFn(getCyberOps);
  const { data: ops } = useQuery({
    queryKey: ["console", "cyber", hours],
    queryFn: () => fetchOps({ data: { hours } }),
    refetchInterval: 60000,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "security", hours],
    queryFn: () => fetchAudit({ data: { hours } }),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  async function scanNow() {
    setRunning(true);
    const result = await runCheck();
    setRunning(false);
    if (!result.ok) {
      toast.error(`Scan failed: ${result.error}`);
      return;
    }
    const { critical, warn } = result.report;
    if (critical > 0) toast.error(`${critical} critical issue(s) found`);
    else if (warn > 0) toast.warning(`${warn} warning(s) found`);
    else toast.success("No security issues found");
    await refetch();
  }

  function exportLog() {
    const rows = data?.events ?? [];
    const header = "created_at,severity,kind,route,subject,detail\n";
    const body = rows
      .map((e) =>
        [
          e.created_at,
          e.severity,
          e.kind,
          e.route ?? "",
          e.subject ?? "",
          JSON.stringify(e.detail ?? {}),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ash-security-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <SkeletonRows rows={5} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const overview = data?.overview;
  const lastScan = overview?.last_selfcheck ?? null;
  const lastFindings = (lastScan?.detail?.["findings"] ?? []) as {
    code: string;
    severity: string;
    object: string;
    detail: string;
  }[];
  const clean = lastScan ? lastScan.severity === "INFO" : false;

  return (
    <div className="space-y-5">
      <CyberCommandCenter />
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setHours(r)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              hours === r
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setAlertOpen(true)}>
          <ShieldAlert className="size-4" aria-hidden />
          Alert a member
        </Button>
        <Button size="sm" variant="outline" onClick={exportLog}>
          <Download className="size-4" aria-hidden />
          Export log
        </Button>
        <Button size="sm" onClick={scanNow} disabled={running}>
          {running ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <PlayCircle className="size-4" aria-hidden />
          )}
          Run scan now
        </Button>
      </div>

      {data?.overviewError ? (
        <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          {data.overviewError}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Events in range" value={overview?.total ?? 0} />
        <StatCard label="Critical" value={overview?.critical ?? 0} />
        <StatCard label="Warnings" value={overview?.warn ?? 0} accent />
        <StatCard label="Flagged visitors" value={overview?.top_subjects?.length ?? 0} />
      </div>

      {ops ? (
        <>
          <SectionCard
            title="Security posture"
            description="Live score across critical events, throttled traffic, webhook signature failures and scan freshness."
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <Gauge
                  className={cn(
                    "size-8",
                    ops.posture.score >= 85
                      ? "text-success"
                      : ops.posture.score >= 60
                        ? "text-gold"
                        : "text-destructive",
                  )}
                  aria-hidden
                />
                <div>
                  <p className="tabular text-3xl font-black text-foreground">{ops.posture.score}</p>
                  <p className="text-xs text-muted-foreground">out of 100</p>
                </div>
              </div>
              <ul className="grid flex-1 grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <li>
                  Critical events:{" "}
                  <span className="font-bold text-foreground">{ops.posture.critical}</span>
                </li>
                <li>
                  Warnings: <span className="font-bold text-foreground">{ops.posture.warn}</span>
                </li>
                <li>
                  Open safety reports:{" "}
                  <span className="font-bold text-foreground">{ops.posture.open_reports}</span>
                </li>
                <li>
                  Scan freshness:{" "}
                  <span
                    className={cn(
                      "font-bold",
                      ops.posture.stale_scan ? "text-destructive" : "text-success",
                    )}
                  >
                    {ops.posture.stale_scan ? "Overdue" : "Current"}
                  </span>
                </li>
              </ul>
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Traffic throttling"
              description="Requests slowed down on public surfaces in this window. Spikes usually mean scraping or credential stuffing."
            >
              {ops.throttling.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No throttled traffic in this window.
                </p>
              ) : (
                <ul>
                  {ops.throttling.map((b) => (
                    <li
                      key={b.bucket}
                      className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                        <Waves className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate font-mono text-xs">{b.bucket}</span>
                      </span>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        {b.subjects} visitor(s) ·{" "}
                        <span className="font-bold text-foreground">{b.hits}</span> hits
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Payment webhook integrity"
              description="Every incoming payment callback must carry a valid signature. Rejected callbacks are forgery attempts or misconfiguration."
            >
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Received" value={ops.webhooks.total} />
                <StatCard label="Verified" value={ops.webhooks.verified} />
                <StatCard label="Rejected" value={ops.webhooks.rejected} accent />
              </div>
              {ops.webhooks.recent.length > 0 ? (
                <ul className="mt-3">
                  {ops.webhooks.recent.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {w.source} — {w.outcome}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {w.reference ?? "no reference"} · signature{" "}
                          {w.signature_verified ? "valid" : "INVALID"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(w.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Staff access"
              description="Every console seat and when it was last used. Dormant or disabled seats should be removed."
            >
              <ul>
                {ops.staff.map((s) => (
                  <li
                    key={s.username}
                    className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        <KeyRound
                          className="mr-1.5 inline size-3.5 text-muted-foreground"
                          aria-hidden
                        />
                        {s.full_name}
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                          @{s.username}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.department.replace(/_/g, " ").toLowerCase()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        s.is_active ? "text-muted-foreground" : "text-destructive",
                      )}
                    >
                      {s.is_active
                        ? s.last_login_at
                          ? formatDateTime(s.last_login_at)
                          : "never signed in"
                        : "disabled"}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Account safety" description="Abuse signals across the member base.">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Open reports" value={ops.accounts.open_reports} accent />
                <StatCard label="Blocks between users" value={ops.accounts.blocked_pairs} />
                <StatCard label="Deletion requests" value={ops.accounts.deletion_requests} />
                <StatCard label="Non-active accounts" value={ops.accounts.suspended} />
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Privileged actions"
            description="Everything staff changed with elevated rights, newest first."
          >
            {ops.adminActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No privileged actions recorded.</p>
            ) : (
              <ul>
                {ops.adminActions.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {a.action.replace(/_/g, " ")}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        by {a.actor}
                        {a.reason ? ` — ${a.reason}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      ) : null}

      {/* Latest automated scan */}
      <SectionCard
        title="Latest automated scan"
        description="Runs on a schedule and after every database change. Checks for privileged routines open to the public, tables missing access rules, and anything anonymous visitors can write to."
      >
        {lastScan ? (
          <>
            <div className="flex items-center gap-2">
              {clean ? (
                <ShieldCheck className="size-5 text-success" aria-hidden />
              ) : (
                <ShieldAlert className="size-5 text-destructive" aria-hidden />
              )}
              <p className="text-sm font-semibold text-foreground">
                {clean ? "No issues found" : `${lastFindings.length} issue(s) found`}
              </p>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(lastScan.created_at)}
              </span>
            </div>
            {lastFindings.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {lastFindings.map((f, index) => (
                  <li key={index} className="rounded-xl border border-border p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <SeverityPill severity={f.severity} />
                      <span className="font-mono text-xs">{f.object}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No scan has run yet — use “Run scan now”.</p>
        )}
      </SectionCard>

      {/* Suspicious patterns */}
      {overview && overview.top_subjects.length > 0 ? (
        <SectionCard
          title="Suspicious visitors"
          description="Visitors with 3 or more blocked or refused attempts in this window. Identities are anonymised fingerprints, not IP addresses."
        >
          <ul>
            {overview.top_subjects.map((s) => (
              <li
                key={s.subject}
                className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-semibold text-foreground">
                    {s.subject}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {s.kinds.join(", ")}
                  </p>
                </div>
                <span className="tabular flex shrink-0 items-center gap-1.5 text-sm font-bold text-destructive">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  {s.count}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {/* Breakdown */}
      {overview && overview.by_kind.length > 0 ? (
        <SectionCard title="Events by type">
          <ul>
            {overview.by_kind.map((k) => (
              <li
                key={k.kind}
                className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0"
              >
                <span className="text-sm font-medium text-foreground">
                  {KIND_LABEL[k.kind] ?? k.kind}
                </span>
                <span className="tabular text-sm font-bold text-foreground">{k.count}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard title="Audit log" description="Most recent 200 recorded security events.">
        {(data?.events ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing recorded yet — that is the healthy state.
          </p>
        ) : (
          <ul>
            {(data?.events ?? []).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
