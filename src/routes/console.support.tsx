import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Mail, MailWarning, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getConsoleTickets,
  getEmailDeliveryLogs,
  replyToTicket,
  setTicketPriority,
  setTicketStatus,
  type TicketStatus,
} from "@/lib/support.functions";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console/support")({
  component: SupportInboxPage,
});

const FILTERS = ["AWAITING", "OPEN", "PENDING", "RESOLVED", "ALL"] as const;
type Filter = (typeof FILTERS)[number];

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

function StatTile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-extrabold text-foreground", tone)}>{value}</p>
    </div>
  );
}

function SupportInboxPage() {
  const queryClient = useQueryClient();
  const list = useServerFn(getConsoleTickets);
  const logs = useServerFn(getEmailDeliveryLogs);
  const reply = useServerFn(replyToTicket);
  const status = useServerFn(setTicketStatus);
  const priority = useServerFn(setTicketPriority);

  const [filter, setFilter] = useState<Filter>("AWAITING");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["console", "support"],
    queryFn: list,
    refetchInterval: 30_000,
  });
  const { data: delivery } = useQuery({ queryKey: ["console", "support", "logs"], queryFn: logs });

  const tickets = data?.tickets ?? [];

  const visible = useMemo(() => {
    if (filter === "ALL") return tickets;
    if (filter === "AWAITING") return tickets.filter((t) => t.messages.at(-1)?.sender === "CUSTOMER");
    return tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  const active = tickets.find((t) => t.id === (selected ?? visible[0]?.id)) ?? null;

  async function send(resolve: boolean) {
    if (!active || !draft.trim()) return;
    setBusy(true);
    try {
      const result = await reply({ data: { ticketId: active.id, body: draft.trim(), resolve } });
      if (!result.ok) {
        toast.error(result.error ?? "Reply failed");
        return;
      }
      setDraft("");
      if (result.emailSent) toast.success("Reply sent by email.");
      else toast.warning(`Saved, but email not delivered: ${result.emailError ?? "unknown"}`);
      await queryClient.invalidateQueries({ queryKey: ["console", "support"] });
    } catch {
      toast.error("Could not send the reply.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(id: string, next: TicketStatus) {
    await status({ data: { ticketId: id, status: next } });
    await queryClient.invalidateQueries({ queryKey: ["console", "support"] });
  }

  if (isLoading) return <LoadingState label="Loading support inbox…" />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-xl font-extrabold text-foreground">Support inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every message customers send from the app lands here. Replying emails them straight from ASH Glo.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Awaiting reply" value={data?.counts.awaitingReply ?? 0} tone="text-primary" />
        <StatTile label="Open" value={data?.counts.open ?? 0} />
        <StatTile label="Pending" value={data?.counts.pending ?? 0} />
        <StatTile label="Resolved" value={data?.counts.resolved ?? 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setSelected(null);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === f
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "AWAITING" ? "Awaiting reply" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-2">
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Nothing here yet.
            </p>
          ) : (
            visible.map((t) => {
              const last = t.messages.at(-1);
              const isActive = active?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  className={cn(
                    "w-full rounded-2xl border p-3 text-left transition-colors",
                    isActive ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{t.subject}</p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {t.name} · {t.email}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{last?.body}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t.category} · {formatDate(t.last_message_at)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          {!active ? (
            <p className="text-sm text-muted-foreground">Select a conversation to read and reply.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-extrabold text-foreground">{active.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.name} · {active.email} · Ref {active.reference}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={active.priority}
                    onChange={async (event) => {
                      await priority({
                        data: { ticketId: active.id, priority: event.target.value as (typeof PRIORITIES)[number] },
                      });
                      await queryClient.invalidateQueries({ queryKey: ["console", "support"] });
                    }}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground"
                    aria-label="Priority"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  {active.status !== "RESOLVED" ? (
                    <Button size="sm" variant="outline" onClick={() => changeStatus(active.id, "RESOLVED")}>
                      <CheckCircle2 className="size-4" aria-hidden /> Resolve
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => changeStatus(active.id, "OPEN")}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-2xl p-3 text-sm",
                      m.sender === "ADMIN"
                        ? "ml-6 bg-primary/10 text-foreground"
                        : "mr-6 bg-muted text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {m.sender === "ADMIN" ? "ASH Glo" : active.name} · {formatDate(m.created_at)}
                      {m.sender === "ADMIN" ? (
                        m.email_sent ? (
                          <>
                            <Mail className="size-3" aria-hidden /> emailed
                          </>
                        ) : (
                          <>
                            <MailWarning className="size-3 text-destructive" aria-hidden />
                            {m.email_error ?? "not emailed"}
                          </>
                        )
                      ) : null}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={4}
                  placeholder={`Reply to ${active.name}…`}
                />
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy || !draft.trim()} onClick={() => send(false)}>
                    <Send className="size-4" aria-hidden /> Send reply
                  </Button>
                  <Button variant="outline" disabled={busy || !draft.trim()} onClick={() => send(true)}>
                    Send &amp; resolve
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-base font-extrabold text-foreground">Email delivery</h2>
        {delivery?.ok === false ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="size-4 text-gold" aria-hidden />
            Delivery events are not available yet ({delivery.error}). They appear once the sending domain finishes
            verifying.
          </p>
        ) : (delivery?.logs?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No delivery events recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3 font-semibold">When</th>
                  <th className="pb-2 pr-3 font-semibold">Recipient</th>
                  <th className="pb-2 pr-3 font-semibold">Event</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(delivery?.logs ?? []).map((event, index) => (
                  <tr key={`${event.timestamp}-${index}`} className="border-t border-border">
                    <td className="py-2 pr-3 text-muted-foreground">{formatDate(event.timestamp)}</td>
                    <td className="py-2 pr-3 text-foreground">{event.recipient}</td>
                    <td className="py-2 pr-3 text-foreground">{event.event_type}</td>
                    <td className="py-2 text-muted-foreground">{event.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
