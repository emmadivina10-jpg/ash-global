import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Loader2, MessageSquarePlus, Ticket } from "lucide-react";
import { toast } from "sonner";
import {
  addTicketNote,
  assignTicket,
  escalateTicket,
  getTicketBoard,
  getTicketNotes,
  setTicketBoardStatus,
} from "@/lib/staff-ops.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING", "ESCALATED", "RESOLVED", "CLOSED"];

function statusTone(s: string) {
  if (s === "ESCALATED") return "bg-destructive/10 text-destructive border-destructive/25";
  if (s === "RESOLVED" || s === "CLOSED") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/25";
  if (s === "OPEN" || s === "IN_PROGRESS") return "bg-primary/10 text-primary border-primary/25";
  return "bg-muted text-muted-foreground border-border";
}

/** Centralized customer ticket board with assignment, escalation and internal notes. */
export function TicketBoard() {
  const queryClient = useQueryClient();
  const load = useServerFn(getTicketBoard);
  const assign = useServerFn(assignTicket);
  const escalate = useServerFn(escalateTicket);
  const setStatus = useServerFn(setTicketBoardStatus);
  const addNote = useServerFn(addTicketNote);
  const loadNotes = useServerFn(getTicketNotes);

  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [escalateDept, setEscalateDept] = useState("");
  const [escalateNote, setEscalateNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["console", "ticket-board"],
    queryFn: () => load(),
    refetchInterval: 30000,
  });

  const notesQuery = useQuery({
    queryKey: ["console", "ticket-notes", selected],
    queryFn: () => loadNotes({ data: { ticketId: selected! } }),
    enabled: Boolean(selected),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["console", "ticket-board"] });
    await queryClient.invalidateQueries({ queryKey: ["console", "ticket-notes"] });
  };

  const assignMut = useMutation({
    mutationFn: async (input: { ticketId: string; staffId?: string | null; department?: string | null }) =>
      assign({ data: input }),
    onSuccess: async () => {
      toast.success("Ticket assigned");
      await refresh();
    },
  });
  const escalateMut = useMutation({
    mutationFn: async () =>
      escalate({ data: { ticketId: selected!, department: escalateDept, note: escalateNote } }),
    onSuccess: async () => {
      toast.success("Ticket escalated");
      setEscalateDept("");
      setEscalateNote("");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const statusMut = useMutation({
    mutationFn: async (input: { ticketId: string; status: string }) => setStatus({ data: input }),
    onSuccess: refresh,
  });
  const noteMut = useMutation({
    mutationFn: async () => addNote({ data: { ticketId: selected!, body: note } }),
    onSuccess: async () => {
      setNote("");
      await refresh();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tickets = data?.tickets ?? [];
  const staff = data?.staff ?? [];
  const departments = [...new Set(staff.map((s) => s.department).filter(Boolean))] as string[];
  const active = tickets.find((t) => t.id === selected) ?? null;

  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-lg backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Ticket className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold">Customer Tickets</h2>
          <p className="text-[11px] text-muted-foreground">{tickets.length} tickets · assign, escalate, resolve</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {tickets.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No tickets in your scope.</p>}
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={cn(
                "w-full rounded-2xl border p-3 text-left transition",
                selected === t.id ? "border-primary/50 bg-primary/5" : "border-border/50 bg-background/60 hover:bg-accent/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{t.subject}</p>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusTone(t.status))}>
                  {t.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.name} · {t.category} · {t.priority}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {new Date(t.created_at).toLocaleString()}
                {t.assigned_department ? ` · → ${t.assigned_department}` : ""}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
          {!active ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Select a ticket to manage it.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold">{active.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {active.name} · {active.email}
                </p>
                {active.escalation_note && (
                  <p className="mt-1 rounded-lg bg-destructive/10 px-2 py-1 text-xs text-destructive">{active.escalation_note}</p>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => statusMut.mutate({ ticketId: active.id, status: s })}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
                        active.status === s ? statusTone(s) : "border-border/60 text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Assign to employee</p>
                <select
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={active.assigned_staff_id ?? ""}
                  onChange={(e) =>
                    assignMut.mutate({
                      ticketId: active.id,
                      staffId: e.target.value || null,
                      department: staff.find((s) => s.id === e.target.value)?.department ?? null,
                    })
                  }
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.employee_name ?? s.username} ({s.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-border/50 p-3">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <ArrowUpRight className="h-3 w-3" /> Escalate to department
                </p>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
                    value={escalateDept}
                    onChange={(e) => setEscalateDept(e.target.value)}
                  >
                    <option value="">Choose department…</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" disabled={!escalateDept || escalateMut.isPending} onClick={() => escalateMut.mutate()}>
                    Escalate
                  </Button>
                </div>
                <Textarea
                  className="mt-2 min-h-12 text-xs"
                  placeholder="Escalation reason (optional)"
                  value={escalateNote}
                  onChange={(e) => setEscalateNote(e.target.value)}
                />
              </div>

              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <MessageSquarePlus className="h-3 w-3" /> Internal notes (never shown to the customer)
                </p>
                <div className="mb-2 max-h-32 space-y-1.5 overflow-y-auto">
                  {(notesQuery.data?.notes ?? []).map((n) => (
                    <div key={n.id} className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs">
                      <span className="font-semibold">{n.staff_name ?? "Staff"}:</span> {n.body}
                      <span className="ml-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    className="min-h-10 flex-1 text-xs"
                    placeholder="Add an internal note…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button size="sm" disabled={!note.trim() || noteMut.isPending} onClick={() => noteMut.mutate()}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
