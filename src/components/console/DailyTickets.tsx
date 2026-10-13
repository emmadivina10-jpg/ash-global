import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ClipboardList, Loader2, Sparkles, Ticket } from "lucide-react";
import {
  getDailyBriefing,
  getDepartmentTasks,
  issueTickets,
  setTaskStatus,
  type BriefingSuggestion,
} from "@/lib/ops.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function priorityTone(priority: string) {
  if (priority === "HIGH") return "bg-destructive/10 text-destructive border-destructive/25";
  if (priority === "LOW") return "bg-muted text-muted-foreground border-border";
  return "bg-primary/10 text-primary border-primary/25";
}

/** Today's tickets for the signed-in seat (or every department for the CEO). */
export function DailyTickets({ superAdmin }: { superAdmin: boolean }) {
  const queryClient = useQueryClient();
  const load = useServerFn(getDepartmentTasks);
  const setStatus = useServerFn(setTaskStatus);
  const [showDone, setShowDone] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["console", "tasks", superAdmin],
    queryFn: () => load({ data: { all: superAdmin } }),
    refetchInterval: 30000,
  });

  const toggle = useMutation({
    mutationFn: async (input: { taskId: string; status: string }) => setStatus({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["console", "tasks"] });
    },
  });

  const today = (data?.today ?? []).filter((task) => showDone || task.status !== "DONE");

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-gold/15 text-gold-foreground">
          <ClipboardList className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Today&apos;s tickets</p>
          <p className="text-[11px] text-muted-foreground">
            {isLoading ? "Loading…" : `${today.filter((t) => t.status === "OPEN").length} open`}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowDone((v) => !v)}>
          {showDone ? "Hide done" : "Show done"}
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {today.length === 0 ? (
          <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            No tickets issued for today yet.
          </p>
        ) : (
          today.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-border p-3",
                task.status === "DONE" && "opacity-60",
              )}
            >
              <button
                type="button"
                aria-label={task.status === "DONE" ? "Reopen" : "Mark done"}
                onClick={() =>
                  toggle.mutate({
                    taskId: task.id,
                    status: task.status === "DONE" ? "OPEN" : "DONE",
                  })
                }
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border",
                  task.status === "DONE"
                    ? "border-success bg-success text-on-dark"
                    : "border-border",
                )}
              >
                {task.status === "DONE" ? <Check className="size-3.5" aria-hidden /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold text-foreground",
                    task.status === "DONE" && "line-through",
                  )}
                >
                  {task.title}
                </p>
                {task.detail ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{task.detail}</p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      priorityTone(task.priority),
                    )}
                  >
                    {task.priority}
                  </span>
                  {superAdmin ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {task.department.replace(/_/g, " ")}
                    </span>
                  ) : null}
                  {task.source === "AI" ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      AI suggested
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/** CEO-only: AI reads the live numbers and proposes today's work per department. */
export function DailyBriefing() {
  const queryClient = useQueryClient();
  const brief = useServerFn(getDailyBriefing);
  const issue = useServerFn(issueTickets);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["console", "briefing"],
    queryFn: brief,
    staleTime: 10 * 60 * 1000,
  });

  const send = useMutation({
    mutationFn: async (tasks: BriefingSuggestion[]) => issue({ data: { tasks, source: "AI" } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        toast.error(
          result.error === "NO_TASKS" ? "Pick at least one task." : "Could not issue tickets.",
        );
        return;
      }
      toast.success(
        `${result.issued} ticket${result.issued === 1 ? "" : "s"} sent to the dashboards.`,
      );
      setSelected({});
      await queryClient.invalidateQueries({ queryKey: ["console", "tasks"] });
    },
    onError: () => toast.error("Could not issue tickets."),
  });

  const suggestions = data?.suggestions ?? [];
  const chosen = suggestions.filter((_, index) => selected[String(index)]);

  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">AI daily briefing</p>
          <p className="text-[11px] text-muted-foreground">
            Reads today&apos;s live platform numbers and proposes what each team should do.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Refresh
        </Button>
        <Button
          size="sm"
          onClick={() => send.mutate(chosen.length > 0 ? chosen : suggestions)}
          disabled={send.isPending || suggestions.length === 0}
        >
          <Ticket className="size-4" aria-hidden />
          {chosen.length > 0 ? `Issue ${chosen.length}` : "Issue all"}
        </Button>
      </div>

      {data?.error ? (
        <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          The briefing could not be generated right now ({data.error}). The numbers below are still
          live.
        </p>
      ) : null}

      {data?.metrics ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Sign-ups (7d)", value: data.metrics.signups7d },
            { label: "Pending activation", value: data.metrics.pendingUsers },
            { label: "Open tickets", value: data.metrics.openTickets },
            { label: "Pending payouts", value: data.metrics.pendingWithdrawals },
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border bg-card p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {metric.label}
              </p>
              <p className="tabular mt-0.5 text-lg font-extrabold text-foreground">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {isFetching && suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Thinking through today&apos;s numbers…</p>
        ) : null}
        {suggestions.map((task, index) => {
          const key = String(index);
          const active = Boolean(selected[key]);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected((current) => ({ ...current, [key]: !active }))}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {active ? <Check className="size-3.5" aria-hidden /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{task.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{task.detail}</span>
                <span className="mt-1.5 inline-flex gap-1.5">
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {task.department.replace(/_/g, " ")}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      priorityTone(task.priority),
                    )}
                  >
                    {task.priority}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
