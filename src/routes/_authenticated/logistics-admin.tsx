import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eye, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { PageHead, Panel, StatusPill, Timeline, modeLabel } from "@/components/dispatch/DispatchUI";
import { useI18n } from "@/lib/i18n";
import { useIsAdmin } from "@/lib/queries";
import { formatDateTime, formatXAF } from "@/lib/format";
import { SIGNED_URL_MAX_SECONDS, riderCanTakeWork } from "@/lib/dispatch-docs";
import {
  dispatchError, rpc, signedDocUrl, useInvalidateDispatch, useJobEvents, useJobs, useNames, useRiderDocs, useRiders,
  type DispatchJob, type RiderRow,
} from "@/lib/dispatch.queries";

export const Route = createFileRoute("/_authenticated/logistics-admin")({
  head: () => ({
    meta: [
      { title: "ASH Logistics operations — ASH Glo staff" },
      { name: "description", content: "Rider verification and delivery operations for ASH staff." },
      { property: "og:title", content: "ASH Logistics operations" },
      { property: "og:description", content: "Staff-only rider verification and logistics dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { lang, tx } = useI18n();
  const fr = lang === "fr";
  const admin = useIsAdmin();
  if (admin.isLoading) return <LoadingState />;
  if (!admin.data)
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <EmptyState icon={<ShieldAlert className="h-5 w-5" />} title={tx("Staff only", "Réservé au personnel")} description={tx("This area is for authorised ASH staff.", "Cet espace est réservé au personnel ASH autorisé.")} />
      </div>
    );
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-5">
      <PageHead title={tx("ASH Logistics operations", "Opérations ASH Logistics")} subtitle={tx("Every action here is checked and logged by the server.", "Chaque action est vérifiée et enregistrée par le serveur.")} />
      <Tabs defaultValue="verify">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="verify">{tx("Verification", "Vérification")}</TabsTrigger>
          <TabsTrigger value="riders">{tx("All riders", "Livreurs")}</TabsTrigger>
          <TabsTrigger value="jobs">{tx("Deliveries", "Livraisons")}</TabsTrigger>
        </TabsList>
        <TabsContent value="verify" className="space-y-3"><RiderList status="PENDING" fr={fr} /></TabsContent>
        <TabsContent value="riders" className="space-y-3"><RiderList fr={fr} /></TabsContent>
        <TabsContent value="jobs" className="space-y-3"><Ops fr={fr} /></TabsContent>
      </Tabs>
    </div>
  );
}

function RiderList({ status, fr }: { status?: string; fr: boolean }) {
  const { tx } = useI18n();
  const riders = useRiders(status ? { status } : undefined);
  if (riders.isLoading) return <LoadingState />;
  if (!riders.data?.length) return <EmptyState title={status ? tx("No riders waiting for review", "Aucun livreur en attente") : tx("No riders yet", "Aucun livreur")} />;
  return <>{riders.data.map((r) => <RiderCard key={r.user_id} rider={r} fr={fr} />)}</>;
}

function RiderCard({ rider, fr }: { rider: RiderRow; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const [open, setOpen] = useState(false);
  const docs = useRiderDocs(open ? rider.user_id : null);
  const [note, setNote] = useState("");

  async function view(path: string) {
    try {
      const url = await signedDocUrl(path, SIGNED_URL_MAX_SECONDS);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(dispatchError(e, fr));
    }
  }
  async function review(decision: string) {
    try {
      await rpc("dispatch_rider_review", { _rider: rider.user_id, _decision: decision, _note: note || null });
      toast.success(tx("Decision saved", "Décision enregistrée"));
      setNote("");
      refresh();
    } catch (e) {
      toast.error(dispatchError(e, fr));
    }
  }

  return (
    <Panel title={rider.full_name ?? tx("Rider", "Livreur")} action={<div className="flex gap-1.5"><StatusPill status={rider.verification_status} fr={fr} /><StatusPill status={rider.availability_status} fr={fr} /></div>}>
      <p className="text-sm text-muted-foreground">
        {rider.phone} · {rider.city} · {rider.vehicle_type} {rider.vehicle_plate ?? ""} {rider.vehicle_model ?? ""} {rider.vehicle_color ?? ""}
        {rider.licence_number ? ` · ${tx("licence", "permis")} ${rider.licence_number}` : ""}
      </p>
      {rider.service_zones.length ? <p className="text-xs text-muted-foreground">{rider.service_zones.join(", ")}</p> : null}
      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setOpen((v) => !v)}>{open ? tx("Hide documents", "Masquer les documents") : tx("Review documents", "Examiner les documents")}</Button>
      {open ? (
        <div className="mt-2 space-y-3">
          <ul className="space-y-1 text-sm">
            {(docs.data ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <span>{d.doc_type.replace(/_/g, " ").toLowerCase()} · {formatDateTime(d.created_at)}</span>
                <Button size="sm" variant="outline" onClick={() => view(d.storage_path)}><Eye className="mr-1 h-3.5 w-3.5" />{tx("Open (60 s link)", "Ouvrir (lien 60 s)")}</Button>
              </li>
            ))}
            {!docs.isLoading && !docs.data?.length ? <li className="text-muted-foreground">{tx("No documents uploaded.", "Aucun document.")}</li> : null}
          </ul>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={tx("Reason (required to reject or suspend)", "Raison (obligatoire pour refuser ou suspendre)")} />
          <div className="flex flex-wrap gap-2">
            {rider.verification_status === "PENDING" ? (
              <>
                <Button size="sm" onClick={() => review("VERIFIED")}>{tx("Approve", "Approuver")}</Button>
                <Button size="sm" variant="outline" onClick={() => review("REJECTED")}>{tx("Reject", "Refuser")}</Button>
              </>
            ) : null}
            {rider.verification_status === "VERIFIED" ? <Button size="sm" variant="destructive" onClick={() => review("SUSPENDED")}>{tx("Suspend", "Suspendre")}</Button> : null}
            {rider.verification_status === "SUSPENDED" ? <Button size="sm" onClick={() => review("REINSTATE")}>{tx("Reinstate", "Réintégrer")}</Button> : null}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function Ops({ fr }: { fr: boolean }) {
  const { tx } = useI18n();
  const jobs = useJobs("all", null);
  const riders = useRiders({ status: "VERIFIED" });
  const [filter, setFilter] = useState<"open" | "all">("open");
  const names = useNames((jobs.data ?? []).flatMap((j) => [j.customer_id, j.vendor_id]));
  if (jobs.isLoading) return <LoadingState />;
  const list = (jobs.data ?? []).filter((j) => filter === "all" || !["DELIVERED", "CANCELLED"].includes(j.status));
  const ready = (riders.data ?? []).filter(riderCanTakeWork);
  return (
    <>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{tx("Available verified riders", "Livreurs vérifiés disponibles")}: {ready.length}</span>
        <Button size="sm" variant="ghost" onClick={() => setFilter(filter === "open" ? "all" : "open")}>{filter === "open" ? tx("Show all", "Tout afficher") : tx("Open only", "Ouvertes seulement")}</Button>
      </div>
      {!list.length ? <EmptyState title={tx("No deliveries", "Aucune livraison")} /> : list.map((j) => <OpsJob key={j.id} job={j} ready={ready} names={names.data ?? {}} fr={fr} />)}
    </>
  );
}

function OpsJob({ job, ready, names, fr }: { job: DispatchJob; ready: RiderRow[]; names: Record<string, string>; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const [open, setOpen] = useState(false);
  const events = useJobEvents(open ? job.id : null);
  const approved = job.fee_amount !== null && job.approved_fee_amount === job.fee_amount && !!job.quote_approved_at;
  const assignable = job.fulfillment_mode === "ASH_DISPATCH" && approved && ["REQUESTED", "INVITED", "REJECTED"].includes(job.status);
  async function act(fn: string, args: Record<string, unknown>, ok: string) {
    try { await rpc(fn, args); toast.success(ok); refresh(); } catch (e) { toast.error(dispatchError(e, fr)); }
  }
  return (
    <Panel title={`${names[job.vendor_id ?? ""] ?? tx("Shop", "Boutique")} → ${names[job.customer_id ?? ""] ?? tx("Customer", "Client")}`} action={<StatusPill status={job.status} fr={fr} />}>
      <p className="text-sm text-muted-foreground">{job.pickup_address} → {job.dropoff_address}</p>
      <p className="text-xs text-muted-foreground">{modeLabel(job.fulfillment_mode, fr)} · {job.fee_amount === null ? tx("no fee yet", "pas de frais") : formatXAF(job.fee_amount)} {approved ? `· ${tx("approved", "approuvés")}` : ""} · {formatDateTime(job.created_at)}</p>
      {assignable ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {ready.length ? ready.map((r) => (
            <Button key={r.user_id} size="sm" onClick={() => act("dispatch_assign_rider", { _job: job.id, _rider: r.user_id }, tx("Rider offered the delivery", "Livraison proposée"))}>
              {r.full_name} · {r.city}
            </Button>
          )) : <span className="text-xs text-muted-foreground">{tx("No verified rider is available.", "Aucun livreur vérifié disponible.")}</span>}
        </div>
      ) : null}
      <div className="mt-2 flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>{open ? tx("Hide history", "Masquer") : tx("History", "Historique")}</Button>
        {!["IN_TRANSIT", "DELIVERED", "CANCELLED"].includes(job.status) ? (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => act("dispatch_cancel", { _job: job.id, _reason: "ASH operations" }, tx("Cancelled", "Annulée"))}>{tx("Cancel", "Annuler")}</Button>
        ) : null}
      </div>
      {open ? <Timeline events={events.data ?? []} fr={fr} /> : null}
    </Panel>
  );
}
