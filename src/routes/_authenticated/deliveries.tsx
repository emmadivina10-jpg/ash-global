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
import { dispatchError, rpc, useInvalidateDispatch, useJobEvents, useJobs, useMe, useNames, type DispatchJob } from "@/lib/dispatch.queries";

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
  const [mode, setMode] = useState<"ASH_DISPATCH" | "VENDOR_DISPATCH" | "SELF_PICKUP">("ASH_DISPATCH");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await rpc("dispatch_request_job", { _vendor: vendorId, _mode: mode, _pickup: pickup, _dropoff: mode === "SELF_PICKUP" ? pickup : dropoff, _notes: notes || null });
      toast.success(tx("Delivery requested. The shop will send the fee.", "Livraison demandée. La boutique enverra les frais."));
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
        <div className="grid grid-cols-3 gap-2">
          {(["ASH_DISPATCH", "VENDOR_DISPATCH", "SELF_PICKUP"] as const).map((m) => (
            <Button key={m} type="button" variant={mode === m ? "default" : "outline"} size="sm" onClick={() => setMode(m)}>
              {modeLabel(m, fr)}
            </Button>
          ))}
        </div>
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
        <Button className="w-full" disabled={busy} onClick={submit}>
          <Truck className="mr-2 h-4 w-4" />
          {tx("Send request", "Envoyer la demande")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {tx("No payment is taken here. You approve the delivery fee before a rider is assigned.", "Aucun paiement ici. Vous approuvez les frais avant l'attribution d'un livreur.")}
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
  const needsApproval = job.fee_amount !== null && job.approved_fee_amount !== job.fee_amount && !done;
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
          {modeLabel(job.fulfillment_mode, fr)} · {job.fee_amount === null ? tx("Waiting for the shop's fee", "En attente des frais") : formatXAF(job.fee_amount)}
        </p>
        <ProgressSteps status={job.status} mode={job.fulfillment_mode} fr={fr} />
        <DeliveryLiveMap job={job} />
        {needsApproval ? (
          <Button className="w-full" onClick={() => act("dispatch_approve_quote", { _job: job.id, _fee: job.fee_amount }, tx("Fee approved", "Frais approuvés"))}>
            {tx("Approve fee", "Approuver les frais")} {formatXAF(job.fee_amount)}
          </Button>
        ) : null}
        {!done && (job.fulfillment_mode === "SELF_PICKUP" || job.status === "IN_TRANSIT" || job.status === "PICKUP_CONFIRMED") ? (
          <div className="rounded-xl bg-muted p-3">
            {code ? (
              <p className="text-center">
                <span className="block text-xs text-muted-foreground">{tx("Give this code only when you receive your order. Valid 30 minutes.", "Donnez ce code uniquement à la réception. Valable 30 minutes.")}</span>
                <span className="font-mono text-2xl font-bold tracking-[0.3em]">{code}</span>
              </p>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => act("dispatch_issue_handover_code", { _job: job.id }, tx("Code ready", "Code prêt"))}>
                <KeyRound className="mr-2 h-4 w-4" />
                {tx("Show handover code", "Afficher le code de remise")}
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
