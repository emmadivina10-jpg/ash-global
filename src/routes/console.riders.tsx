import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getConsoleRiders, reviewConsoleRider } from "@/lib/console-riders.functions";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/console/riders")({
  head: () => ({ meta: [{ title: "Rider verification — ASH Console" }] }),
  component: RidersPage,
});

const DOC_LABEL: Record<string, string> = {
  NATIONAL_ID: "National ID",
  PASSPORT: "Passport",
  SELFIE: "Selfie",
  DRIVER_LICENCE: "Driver licence",
  VEHICLE_REGISTRATION: "Vehicle registration",
};

const ERR: Record<string, string> = {
  NOTE_REQUIRED: "Add a short reason first.",
  INVALID_STATUS: "This rider is no longer waiting for that decision.",
  RIDER_ON_DELIVERY: "Rider is on an active delivery.",
  FORBIDDEN_DEPARTMENT: "Only Trust or Operations staff can decide.",
};

function RidersPage() {
  const qc = useQueryClient();
  const list = useServerFn(getConsoleRiders);
  const review = useServerFn(reviewConsoleRider);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "riders"],
    queryFn: () => list(),
    refetchInterval: 50000, // document links last 60 seconds
  });

  async function act(id: string, decision: "VERIFIED" | "REJECTED" | "SUSPENDED" | "REINSTATE") {
    setBusy(id);
    try {
      await review({ data: { riderId: id, decision, note: notes[id] } });
      toast.success("Rider updated.");
      await qc.invalidateQueries({ queryKey: ["console", "riders"] });
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      toast.error(ERR[code] ?? "Could not update the rider.");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading riders…" />;
  if (isError)
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm">
        Riders could not be loaded. <Button size="sm" variant="ghost" onClick={() => refetch()}>Try again</Button>
      </div>
    );

  const rows = data ?? [];
  const pending = rows.filter((r) => r.verification_status === "PENDING");
  const others = rows.filter((r) => r.verification_status !== "PENDING");

  const card = (r: (typeof rows)[number]) => (
    <div key={r.user_id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{r.full_name ?? "Unnamed rider"}</p>
          <p className="text-xs text-muted-foreground">
            {[r.vehicle_type, r.vehicle_model, r.vehicle_color, r.vehicle_plate].filter(Boolean).join(" · ") || "No vehicle details"}
          </p>
          <p className="text-xs text-muted-foreground">
            {[r.city, r.phone, r.licence_number && `Licence ${r.licence_number}`].filter(Boolean).join(" · ")}
          </p>
          <p className="text-[11px] text-muted-foreground">Updated {formatDate(r.updated_at)}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {r.verification_status}
        </span>
      </div>
      {r.verification_note && <p className="text-xs text-muted-foreground">Note: {r.verification_note}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {r.documents.length === 0 && <p className="text-xs text-muted-foreground">No documents.</p>}
        {r.documents.map((d) => (
          <a key={d.id} href={d.url ?? undefined} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-border bg-muted/40">
            {d.url && !d.isPdf ? (
              <img src={d.url} alt={DOC_LABEL[d.doc_type] ?? d.doc_type} className="h-36 w-full object-cover" />
            ) : (
              <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                {d.url ? "Open PDF" : "File unavailable"}
              </div>
            )}
            <p className="px-2 py-1 text-xs font-medium">{DOC_LABEL[d.doc_type] ?? d.doc_type}</p>
          </a>
        ))}
      </div>
      <Input
        placeholder="Reason (needed to reject or suspend)"
        value={notes[r.user_id] ?? ""}
        onChange={(e) => setNotes((n) => ({ ...n, [r.user_id]: e.target.value }))}
      />
      <div className="flex flex-wrap gap-2">
        {r.verification_status === "PENDING" && (
          <>
            <Button size="sm" disabled={busy === r.user_id} onClick={() => act(r.user_id, "VERIFIED")}>Approve</Button>
            <Button size="sm" variant="destructive" disabled={busy === r.user_id} onClick={() => act(r.user_id, "REJECTED")}>Reject</Button>
          </>
        )}
        {r.verification_status === "VERIFIED" && (
          <Button size="sm" variant="destructive" disabled={busy === r.user_id} onClick={() => act(r.user_id, "SUSPENDED")}>Suspend</Button>
        )}
        {r.verification_status === "SUSPENDED" && (
          <Button size="sm" disabled={busy === r.user_id} onClick={() => act(r.user_id, "REINSTATE")}>Reinstate</Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-extrabold text-foreground">Rider verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ASH Logistics and ASH Rider sign-ups. Document links expire after 60 seconds and refresh automatically.
        </p>
      </header>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Waiting for review ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting.</p> : pending.map(card)}
      </section>
      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">All riders ({others.length})</h2>
          {others.map(card)}
        </section>
      )}
    </div>
  );
}
