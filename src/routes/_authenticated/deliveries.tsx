import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, MapPin, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { PageHead, Panel, ProgressSteps, StatusPill, Timeline, modeLabel } from "@/components/dispatch/DispatchUI";
import { useI18n } from "@/lib/i18n";
import { DeliveryLiveMap } from "@/components/dispatch/DeliveryLiveMap";
import { formatXAF } from "@/lib/format";
import { allowedModes, dispatchError, rpc, useExternalRider, useInvalidateDispatch, useJobEvents, useJobs, useMe, useNames, useVendorPrefs, type DeliveryMode, type DispatchJob } from "@/lib/dispatch.queries";
import { ExternalRiderForm, MethodSelector, RiderPicker, vehicleLabel } from "@/components/dispatch/DeliveryOptions";

export const Route = createFileRoute("/_authenticated/deliveries")({
  validateSearch: (s: Record<string, unknown>): { vendor?: string } =>
    typeof s['vendor'] === "string" && /^[0-9a-f-]{36}$/i.test(s['vendor']) ? { vendor: s['vendor'] } : {},
  head: () => ({
    meta: [
      { title: "My deliveries — ASH Glo" },
      { name: "description", content: "Request deliveries from ASH Glo shops and follow each one until it reaches you." },
      { property: "og:title", content: "My deliveries — ASH Glo" },
      { property: "og:description", content: "Request and track your ASH Glo deliveries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeliveriesPage,
});

function DeliveriesPage() {
  const { lang, tx } = useI18n();
  const fr = lang === "fr";
  const { vendor } = Route.useSearch();
  const { data: me } = useMe();
  const jobs = useJobs("customer", me);
  const names = useNames((jobs.data ?? []).map((j) => j.vendor_id));

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <PageHead title={tx("My deliveries", "Mes livraisons")} subtitle={tx("Track every order from the shop to your door.", "Suivez chaque commande de la boutique à votre porte.")} />
      {vendor ? <RequestForm vendorId={vendor} fr={fr} /> : null}
      {jobs.isLoading ? (
        <LoadingState />
      ) : !jobs.data?.length ? (
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title={tx("No deliveries yet", "Aucune livraison")}
          description={tx("Open a shop and choose Request delivery to start.", "Ouvrez une boutique et choisissez Demander une livraison.")}
        />
      ) : (
        jobs.data.map((j) => <CustomerJob key={j.id} job={j} shop={names.data?.[j.vendor_id ?? ""]} fr={fr} />)
      )}
      <p className="text-center text-xs text-muted-foreground">
        <Link to="/rider" className="underline">{tx("Want to deliver with ASH? Become a rider", "Livrer avec ASH ? Devenez livreur")}</Link>
      </p>
    </div>
  );
}

function RequestForm({ vendorId, fr }: { vendorId: string; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const names = useNames([vendorId]);
  const prefs = useVendorPrefs(vendorId);
  const modes = prefs.data ? allowedModes(prefs.data) : [];
  const [picked, setMode] = useState<DeliveryMode | null>(null);
  const mode: DeliveryMode = picked && modes.includes(picked) ? picked : (modes[0] ?? "ASH_DISPATCH");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await rpc("dispatch_request_job", { _vendor: vendorId, _mode: mode, _pickup: pickup, _dropoff: mode === "SELF_PICKUP" ? pickup : dropoff, _notes: notes || null });
      toast.success(
        mode === "EXTERNAL_RIDER"
          ? tx("Request sent. Add your rider's details below.", "Demande envoyée. Ajoutez votre livreur ci-dessous.")
          : tx("Delivery requested. The shop will send the fee.", "Livraison demandée. La boutique enverra les frais."),
      );
      setDropoff(""); setNotes("");
      refresh();
    } catch (e) {
      toast.error(dispatchError(e, fr));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={`${tx("Request delivery from", "Demander une livraison à")} ${names.data?.[vendorId] ?? tx("this shop", "cette boutique")}`}>
      <div className="space-y-3">
        {prefs.isLoading ? <p className="text-xs text-muted-foreground">{tx("Loading delivery options…", "Chargement des options…")}</p> : null}
        {prefs.isError ? <p className="text-xs text-destructive">{tx("Delivery options could not be loaded.", "Options de livraison indisponibles.")}</p> : null}
        <MethodSelector modes={modes} value={mode} onChange={setMode} fr={fr} />
        <div>
          <Label>{mode === "SELF_PICKUP" ? tx("Pickup location (shop)", "Lieu de retrait (boutique)") : tx("Pickup address", "Adresse de retrait")}</Label>
          <Input value={pickup} onChange={(e) => setPickup(e.target.value)} maxLength={200} />
        </div>
        {mode !== "SELF_PICKUP" ? (
          <div>
            <Label>{tx("Delivery address", "Adresse de livraison")}</Label>
            <Input value={dropoff} onChange={(e) => setDropoff(e.target.value)} maxLength={200} />
          </div>
        ) : null}
        <div>
          <Label>{tx("Notes for the shop (optional)", "Notes pour la boutique (facultatif)")}</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
        </div>
        <Button className="w-full" disabled={busy || modes.length === 0} onClick={submit}>
          <Truck className="mr-2 h-4 w-4" />
          {tx("Send request", "Envoyer la demande")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {mode === "EXTERNAL_RIDER"
            ? tx("No payment is taken here. You arrange and pay your own rider directly.", "Aucun paiement ici. Vous organisez et payez votre livreur directement.")
            : tx("No payment is taken here. You approve the delivery fee before a rider is offered the job.", "Aucun paiement ici. Vous approuvez les frais avant qu'un livreur ne reçoive la course.")}
        </p>
      </div>
    </Panel>
  );
}

function CustomerJob({ job, shop, fr }: { job: DispatchJob; shop?: string | undefined; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const [open, setOpen] = useState(false);
  const events = useJobEvents(open ? job.id : null);
  const [code, setCode] = useState<string | null>(null);
  const done = job.status === "DELIVERED" || job.status === "CANCELLED";
  const external = job.fulfillment_mode === "EXTERNAL_RIDER";
  const ext = useExternalRider(job.id, external);
  const needsApproval = !external && job.fee_amount !== null && job.approved_fee_amount !== job.fee_amount && !done;
  const approved = job.fee_amount !== null && job.approved_fee_amount === job.fee_amount && !!job.quote_approved_at;
  const offerExpired = job.status === "ASSIGNED" && !!job.offer_expires_at && new Date(job.offer_expires_at) < new Date();
  const choosing = job.fulfillment_mode === "CHOSEN_RIDER" && approved && ["REQUESTED", "REJECTED"].includes(job.status);
  const canCancel = !["IN_TRANSIT", "DELIVERED", "CANCELLED"].includes(job.status);

  async function act(fn: string, args: Record<string, unknown>, ok: string) {
    try {
      const out = await rpc<string>(fn, args);
      if (fn === "dispatch_issue_handover_code") setCode(out);
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(dispatchError(e, fr));
    }
  }

  return (
    <Panel title={shop ?? tx("Shop", "Boutique")} action={<StatusPill status={job.status} fr={fr} />}>
      <div className="space-y-3 text-sm">
        <p className="flex items-start gap-1.5 text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          {job.pickup_address}
          {job.fulfillment_mode !== "SELF_PICKUP" ? ` → ${job.dropoff_address}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {modeLabel(job.fulfillment_mode, fr)} · {external ? tx("Externally managed — not dispatched by ASH Glo, no live tracking", "Gérée par vous — non envoyée par ASH Glo, sans suivi en direct") : job.fee_amount === null ? tx("Waiting for the shop's fee", "En attente des frais") : formatXAF(job.fee_amount)}
        </p>
        <ProgressSteps status={job.status} mode={job.fulfillment_mode} fr={fr} />
        <DeliveryLiveMap job={job} />
        {needsApproval ? (
          <Button className="w-full" onClick={() => act("dispatch_approve_quote", { _job: job.id, _fee: job.fee_amount }, tx("Fee approved", "Frais approuvés"))}>
            {tx("Approve fee", "Approuver les frais")} {formatXAF(job.fee_amount)}
          </Button>
        ) : null}
        {job.status === "ASSIGNED" ? (
          <div className="rounded-xl bg-muted p-3 text-xs">
            {offerExpired
              ? tx("The rider did not answer in time.", "Le livreur n'a pas répondu à temps.")
              : tx("Offered to a rider. Not assigned until they accept.", "Proposée à un livreur. Non attribuée avant acceptation.")}
            {offerExpired ? (
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => act("dispatch_release_expired", { _job: job.id }, tx("You can choose again", "Vous pouvez choisir à nouveau"))}>
                {tx("Choose another option", "Choisir une autre option")}
              </Button>
            ) : null}
          </div>
        ) : null}
        {job.status === "REJECTED" && (job.fulfillment_mode === "CHOSEN_RIDER" || job.fulfillment_mode === "ASH_DISPATCH") ? (
          <div className="flex gap-2">
            {job.fulfillment_mode === "CHOSEN_RIDER" ? (
              <Button size="sm" variant="outline" className="flex-1" onClick={() => act("dispatch_switch_mode", { _job: job.id, _mode: "ASH_DISPATCH" }, tx("Switched to ASH Dispatch", "Passée à ASH Dispatch"))}>{tx("Use ASH Dispatch instead", "Utiliser ASH Dispatch")}</Button>
            ) : (
              <Button size="sm" variant="outline" className="flex-1" onClick={() => act("dispatch_switch_mode", { _job: job.id, _mode: "CHOSEN_RIDER" }, tx("Choose a rider below", "Choisissez un livreur"))}>{tx("Choose a rider myself", "Choisir moi-même un livreur")}</Button>
            )}
          </div>
        ) : null}
        {choosing ? <RiderPicker jobId={job.id} fr={fr} /> : null}
        {external && job.status === "REQUESTED" && ext.isFetched && !ext.data ? <ExternalRiderForm jobId={job.id} fr={fr} /> : null}
        {external && ext.data ? (
          <div className="rounded-xl border border-border p-3 text-xs">
            <p className="font-semibold">{ext.data.full_name} · {vehicleLabel(ext.data.vehicle_type, fr)}{ext.data.vehicle_plate ? ` · ${ext.data.vehicle_plate}` : ""}</p>
            <p className="text-muted-foreground">{ext.data.phone}{ext.data.note ? ` · ${ext.data.note}` : ""}</p>
            <p className="mt-1 text-muted-foreground">{ext.data.picked_up_at ? tx("Collected from the shop", "Récupérée à la boutique") : tx("Waiting for collection at the shop", "En attente de retrait à la boutique")}</p>
          </div>
        ) : null}
        {external && job.status === "IN_TRANSIT" ? (
          <Button className="w-full" onClick={() => act("dispatch_external_delivered", { _job: job.id }, tx("Marked as received", "Réception confirmée"))}>{tx("I received my order", "J'ai reçu ma commande")}</Button>
        ) : null}
        {!done && (external ? job.status === "REQUESTED" && !!ext.data : job.fulfillment_mode === "SELF_PICKUP" || job.status === "IN_TRANSIT" || job.status === "PICKUP_CONFIRMED") ? (
          <div className="rounded-xl bg-muted p-3">
            {code ? (
              <p className="text-center">
                <span className="block text-xs text-muted-foreground">{external ? tx("Give this collection code to your rider. The shop checks it before handing over. Valid 30 minutes.", "Donnez ce code de retrait à votre livreur. La boutique le vérifie avant la remise. Valable 30 minutes.") : tx("Give this code only when you receive your order. Valid 30 minutes.", "Donnez ce code uniquement à la réception. Valable 30 minutes.")}</span>
                <span className="font-mono text-2xl font-bold tracking-[0.3em]">{code}</span>
              </p>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => act("dispatch_issue_handover_code", { _job: job.id }, tx("Code ready", "Code prêt"))}>
                <KeyRound className="mr-2 h-4 w-4" />
                {external ? tx("Create collection code", "Créer le code de retrait") : tx("Show handover code", "Afficher le code de remise")}
              </Button>
            )}
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? tx("Hide history", "Masquer l'historique") : tx("Show history", "Voir l'historique")}
          </Button>
          {canCancel ? (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => act("dispatch_cancel", { _job: job.id, _reason: "customer" }, tx("Delivery cancelled", "Livraison annulée"))}>
              {tx("Cancel", "Annuler")}
            </Button>
          ) : null}
        </div>
        {open ? <Timeline events={events.data ?? []} fr={fr} /> : null}
      </div>
    </Panel>
  );
}
