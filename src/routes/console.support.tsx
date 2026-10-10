import { useEffect, useMemo, useRef, useState } from "react";
import { MessageMemberDialog } from "@/components/console/MessageMemberDialog";
import { TicketBoard } from "@/components/console/TicketBoard";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCheck,
  CheckCircle2,
  LifeBuoy,
  Mail,
  MailWarning,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  getConsoleTickets,
  getEmailDeliveryLogs,
  markSupportTicketRead,
  replyToTicket,
  setTicketPriority,
  setTicketStatus,
  type TicketStatus,
} from "@/lib/support.functions";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { awaitingSupportReply, unreadSupportMessages } from "@/lib/support-state";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console/support")({
  head: () => ({
    meta: [
      { title: "Support Conversations | ASH Glo Console" },
      { name: "description", content: "ASH Glo staff support conversations and ticket follow-up." },
      { property: "og:title", content: "Support Conversations | ASH Glo Console" },
      {
        property: "og:description",
        content: "ASH Glo staff support conversations and ticket follow-up.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportInboxPage,
});

const FILTERS = ["AWAITING", "OPEN", "PENDING", "RESOLVED", "ALL"] as const;
type Filter = (typeof FILTERS)[number];

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

function StatTile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-extrabold text-foreground", tone)}>
        {value}
      </p>
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
  const markRead = useServerFn(markSupportTicketRead);

  const [filter, setFilter] = useState<Filter>("AWAITING");
  const [selected, setSelected] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const transcript = useRef<HTMLDivElement>(null);
  const readInFlight = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["console", "support"],
    queryFn: list,
    refetchInterval: 10_000,
  });
  const { data: delivery } = useQuery({ queryKey: ["console", "support", "logs"], queryFn: logs });

  const tickets = data?.tickets ?? [];

  const visible = useMemo(
    () =>
      tickets.filter((t) => {
        const matchesFilter =
          filter === "ALL" ||
          (filter === "AWAITING" ? awaitingSupportReply(t) : t.status === filter);
        return (
          matchesFilter &&
          `${t.name} ${t.email} ${t.subject} ${t.reference}`
            .toLowerCase()
            .includes(search.toLowerCase())
        );
      }),
    [tickets, filter, search],
  );

  const active = tickets.find((t) => t.id === (selected ?? visible[0]?.id)) ?? null;

  const draft = active ? (drafts[active.id] ?? "") : "";
  const setDraft = (value: string) => {
    if (active) setDrafts((previous) => ({ ...previous, [active.id]: value }));
  };
  const refreshSupport = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["console", "support"] }),
      queryClient.invalidateQueries({ queryKey: ["console", "staff-notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["console", "ticket-board"] }),
    ]);
  };
  useEffect(() => {
    const pane = transcript.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [active?.id, active?.messages.length]);

  useEffect(() => {
    if (!active || readInFlight.current || (!selected && window.innerWidth < 1024)) return;
    const latestCustomer = [...active.messages]
      .reverse()
      .find((message) => message.sender === "CUSTOMER");
    if (!latestCustomer || (active.my_read_at && latestCustomer.created_at <= active.my_read_at))
      return;
    readInFlight.current = active.id;
    void markRead({ data: { ticketId: active.id } })
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ["console", "support", "badge"] });
        await queryClient.invalidateQueries({ queryKey: ["console", "support"] });
      })
      .catch(() => toast.error("Could not mark the conversation as read."))
      .finally(() => {
        readInFlight.current = null;
      });
  }, [active, selected, markRead, queryClient]);

  async function send(resolve: boolean) {
    if (!active || !draft.trim() || busy) return;
    const ticketId = active.id;
    const sentDraft = draft;
    setBusy(true);
    try {
      const result = await reply({ data: { ticketId: active.id, body: draft.trim(), resolve } });
      if (!result.ok) {
        toast.error(result.error ?? "Reply failed");
        return;
      }
      setDrafts((previous) => ({
        ...previous,
        [ticketId]: previous[ticketId] === sentDraft ? "" : (previous[ticketId] ?? ""),
      }));
      if (result.emailSent) toast.success("Reply sent by email.");
      else toast.warning(`Saved, but email not delivered: ${result.emailError ?? "unknown"}`);
      await refreshSupport();
    } catch {
      toast.error("Could not send the reply.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(id: string, next: TicketStatus) {
    try {
      const result = await status({ data: { ticketId: id, status: next } });
      if (!result.ok) throw new Error(result.error);
      await refreshSupport();
    } catch {
      toast.error("Could not update the conversation status.");
    }
  }

  if (isError)
    return (
      <div role="alert" className="space-y-3">
        <p>Support conversations could not be loaded.</p>
        <Button onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  if (isLoading) return <LoadingState label="Loading support inbox…" />;

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold text-foreground">Support inbox</h1>
        </div>
        <Button size="sm" variant="outline" onClick={() => setWriteOpen(true)}>
          Write to a member
        </Button>
      </header>

      <MessageMemberDialog open={writeOpen} onClose={() => setWriteOpen(false)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Awaiting reply"
          value={data?.counts.awaitingReply ?? 0}
          tone="text-primary"
        />
        <StatTile label="Open" value={data?.counts.open ?? 0} />
        <StatTile label="Pending" value={data?.counts.pending ?? 0} />
        <StatTile label="Resolved" value={data?.counts.resolved ?? 0} />
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-3">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "secondary" : "ghost"}
              onClick={() => {
                setFilter(f);
                setSelected(null);
              }}
            >
              {f === "AWAITING" ? "Awaiting reply" : f.charAt(0) + f.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh support"
          title="Refresh support"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      <div className="grid h-[min(740px,80dvh)] min-h-[480px] overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          className={cn(
            "min-h-0 flex-col border-border lg:flex lg:border-r",
            selected ? "hidden" : "flex",
          )}
        >
          <div className="relative border-b border-border p-3">
            <Search className="absolute left-6 top-6 size-4 text-muted-foreground" aria-hidden />
            <Input
              className="pl-9"
              aria-label="Search support conversations"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No conversations found.</p>
            ) : (
              visible.map((t) => {
                const unread = unreadSupportMessages(t.messages, t.my_read_at);
                return (
                  <Button
                    key={t.id}
                    variant="ghost"
                    onClick={() => setSelected(t.id)}
                    className={cn(
                      "h-auto w-full justify-start gap-3 rounded-none border-b border-border/50 p-4 text-left",
                      active?.id === t.id && "bg-accent",
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                      {t.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{t.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(t.last_message_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {t.messages.at(-1)?.body ?? t.subject}
                      </span>
                      <span className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{t.status}</span>
                        {unread > 0 && !["RESOLVED", "CLOSED"].includes(t.status) ? (
                          <span className="rounded-full bg-primary px-1.5 text-primary-foreground">
                            {unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Button>
                );
              })
            )}
          </div>
        </aside>
        <section className={cn("min-h-0 min-w-0 flex-col", selected ? "flex" : "hidden lg:flex")}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <LifeBuoy className="size-10" />
              <p>No conversation selected</p>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                <Button
                  className="lg:hidden"
                  size="icon"
                  variant="ghost"
                  aria-label="Back to conversations"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft />
                </Button>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{active.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {active.subject} · Ref {active.reference}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{active.email}</p>
                </div>
                <select
                  value={active.priority}
                  aria-label="Priority"
                  className="max-w-full rounded-md border border-border bg-background p-2 text-xs"
                  onChange={async (e) => {
                    try {
                      const result = await priority({
                        data: {
                          ticketId: active.id,
                          priority: e.target.value as (typeof PRIORITIES)[number],
                        },
                      });
                      if (!result.ok) throw new Error(result.error);
                      await refreshSupport();
                    } catch {
                      toast.error("Could not update priority.");
                    }
                  }}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void changeStatus(active.id, active.status === "RESOLVED" ? "OPEN" : "RESOLVED")
                  }
                >
                  <CheckCircle2 className="size-4" />
                  {active.status === "RESOLVED" ? "Reopen" : "Resolve"}
                </Button>
              </div>
              <div
                ref={transcript}
                role="log"
                aria-label="Support messages"
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-muted/30 p-4 sm:p-6"
              >
                {active.messages.map((m, index) => {
                  const day = new Date(m.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const previous = active.messages[index - 1];
                  const showDay =
                    !previous ||
                    new Date(previous.created_at).toDateString() !==
                      new Date(m.created_at).toDateString();
                  return (
                    <div key={m.id}>
                      {showDay ? (
                        <div className="my-4 text-center text-xs text-muted-foreground">{day}</div>
                      ) : null}
                      <div
                        className={cn(
                          "flex",
                          m.sender === "ADMIN" ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[88%] rounded-lg px-3.5 py-2.5 sm:max-w-[75%]",
                            m.sender === "ADMIN"
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-card text-card-foreground",
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                            {m.body}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5 text-[10px] opacity-80">
                            <time dateTime={m.created_at}>
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                            {m.sender === "ADMIN" ? (
                              <>
                                <CheckCheck className="size-3" aria-label="Saved to conversation" />
                                {m.email_sent ? (
                                  <Mail className="size-3" aria-label="Email sent" />
                                ) : (
                                  <span
                                    title={m.email_error ?? "Email not sent"}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <MailWarning className="size-3" />
                                    Email not sent
                                  </span>
                                )}
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                className="shrink-0 space-y-2 border-t border-border bg-card p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(false);
                }}
              >
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    maxLength={6000}
                    aria-label="Support reply"
                    placeholder={`Message ${active.name}…`}
                    className="max-h-36 min-h-12 resize-none"
                    disabled={busy}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="shrink-0"
                    disabled={busy || !draft.trim()}
                    aria-label="Send reply"
                    title="Send reply"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy || !draft.trim()}
                    onClick={() => void send(true)}
                  >
                    <CheckCircle2 className="size-4" />
                    Send &amp; resolve
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
      <details className="border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-semibold">Ticket management</summary>
        <div className="mt-4">
          <TicketBoard />
        </div>
      </details>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-base font-extrabold text-foreground">Email delivery</h2>
        {delivery?.ok === false ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="size-4 text-gold" aria-hidden />
            Delivery events are not available yet ({delivery.error}). They appear once the sending
            domain finishes verifying.
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
                    <td className="py-2 pr-3 text-muted-foreground">
                      {formatDate(event.timestamp)}
                    </td>
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
