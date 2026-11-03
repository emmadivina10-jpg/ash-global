import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, MapPin, UserPlus, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { PageHead, Panel, StatusPill, Timeline, modeLabel } from "@/components/dispatch/DispatchUI";
import { useI18n } from "@/lib/i18n";
import { DeliveryLiveMap } from "@/components/dispatch/DeliveryLiveMap";
import { formatDateTime, formatXAF } from "@/lib/format";
import { riderCanTakeWork } from "@/lib/dispatch-docs";
import {
  dispatchError, rpc, useInvalidateDispatch, useIsShopOwner, useJobEvents, useJobs, useMe, useNames, useRiders, useTeam,
  type DispatchJob, type RiderRow,
} from "@/lib/dispatch.queries";

export const Route = createFileRoute("/_authenticated/dispatch")({
  head: () => ({
    meta: [
      { title: "Shop dispatch — ASH Glo" },
      { name: "description", content: "Quote, assign and follow your shop's deliveries and manage your own rider team." },
      { property: "og:title", content: "Shop dispatch — ASH Glo" },
      { property: "og:description", content: "Your shop's deliveries and My Dispatch Team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DispatchPage,
});

function DispatchPage() {
  const { lang, tx } = useI18n();
  const fr = lang === "fr";
  const { data: me } = useMe();
  const shop = useIsShopOwner(me);

  if (shop.isLoading || !me) return <LoadingState />;
  if (!shop.data)
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState icon={<Users className="h-5 w-5" />} title={tx("For shop owners", "Pour les boutiques")} description={tx("Create a professional profile in Studio to manage deliveries.", "Créez un profil professionnel dans Studio pour gérer les livraisons.")} />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <PageHead title={tx("Shop dispatch", "Livraisons de la boutique")} subtitle={shop.data.business_name ?? ""} />
      <Tabs defaultValue="jobs">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jobs">{tx("Deliveries", "Livraisons")}</TabsTrigger>
          <TabsTrigger value="team">{tx("My Dispatch Team", "Mon équipe")}</TabsTrigger>
          <TabsTrigger value="prefs">{tx("Delivery options", "Options")}</TabsTrigger>
        </TabsList>
        <TabsContent value="jobs" className="space-y-3"><VendorJobs me={me} fr={fr} /></TabsContent>
        <TabsContent value="team" className="space-y-3"><Team me={me} fr={fr} /></TabsContent>
        <TabsContent value="prefs" className="space-y-3"><DeliveryPrefs me={me} fr={fr} /></TabsContent>
      </Tabs>
    </div>
  );
}

function VendorJobs({ me, fr }: { me: string; fr: boolean }) {
  const { tx } = useI18n();
  const jobs = useJobs("vendor", me);
  const team = useTeam(me);
  const riders = useRiders();
  const names = useNames([...(jobs.data ?? []).map((j) => j.customer_id), ...(riders.data ?? []).map((r) => r.user_id)]);
  if (jobs.isLoading) return <LoadingState />;
  if (!jobs.data?.length) return <EmptyState icon={<MapPin className="h-5 w-5" />} title={tx("No delivery requests yet", "Aucune demande")} />;
  const accepted = new Set((team.data ?? []).filter((t) => t.status === "ACCEPTED").map((t) => t.rider_user_id));
  const myRiders = (riders.data ?? []).filter((r) => accepted.has(r.user_id));
  return <>{jobs.data.map((j) => <VendorJob key={j.id} job={j} riders={myRiders} names={names.data ?? {}} fr={fr} />)}</>;
}

function VendorJob({ job, riders, names, fr }: { job: DispatchJob; riders: RiderRow[]; names: Record<string, string>; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const [fee, setFee] = useState(job.fee_amount?.toString() ?? "");
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const events = useJobEvents(open ? job.id : null);
  const quotable = ["REQUESTED", "INVITED", "REJECTED"].includes(job.status);
  const approved = job.fee_amount !== null && job.approved_fee_amount === job.fee_amount && !!job.quote_approved_at;
  const ready = riders.filter(riderCanTakeWork);
  const external = job.fulfillment_mode === "EXTERNAL_RIDER";
  const ext = useExternalRider(job.id, external);

  async function act(fn: string, args: Record<string, unknown>, ok: string) {
    try {
      const out = await rpc<string>(fn, args);
      if ((fn === "dispatch_complete_with_code" || fn === "dispatch_external_pickup") && out !== "OK") {
        toast.error({ WRONG: tx("Wrong code", "Code incorrect"), EXPIRED: tx("Code expired", "Code expiré"), LOCKED: tx("Too many tries; ask for a new code", "Trop d'essais ; demandez un nouveau code"), USED: tx("Code already used", "Code déjà utilisé"), NO_CODE: tx("The customer has not created a code yet", "Le client n'a pas encore créé de code") }[out] ?? out);
        return;
      }
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(dispatchError(e, fr));
    }
  }

  return (
    <Panel title={names[job.customer_id ?? ""] ?? tx("Customer", "Client")} action={<StatusPill status={job.status} fr={fr} />}>
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">{job.pickup_address}{job.fulfillment_mode !== "SELF_PICKUP" ? ` → ${job.dropoff_address}` : ""}</p>
        <p className="text-xs text-muted-foreground">{modeLabel(job.fulfillment_mode, fr)} · {formatDateTime(job.created_at)}{job.notes ? ` · ${job.notes}` : ""}</p>
        <DeliveryLiveMap job={job} />
        {external ? (
          <div className="rounded-xl border border-border p-3 text-xs">
            <p className="font-semibold">{tx("Customer's own rider — externally managed", "Livreur du client — géré en externe")}</p>
            {ext.data ? (
              <p className="text-muted-foreground">{ext.data.full_name} · {vehicleLabel(ext.data.vehicle_type, fr)}{ext.data.vehicle_plate ? ` · ${ext.data.vehicle_plate}` : ""} · {ext.data.phone}</p>
            ) : (
              <p className="text-muted-foreground">{tx("Waiting for the customer to add their rider.", "En attente des informations du livreur.")}</p>
            )}
          </div>
        ) : null}
        {external && job.status === "REQUESTED" && ext.data ? (
          <div className="flex gap-2">
            <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder={tx("Rider's 6-digit collection code", "Code de retrait à 6 chiffres")} />
            <Button onClick={() => act("dispatch_external_pickup", { _job: job.id, _code: code }, tx("Handed to the customer's rider", "Remise au livreur du client"))}>{tx("Hand over", "Remettre")}</Button>
          </div>
        ) : null}
        {quotable && !external ? (
          <div className="flex gap-2">
            <Input type="number" min={0} max={1000000} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="XAF" />
            <Button variant="outline" onClick={() => act("dispatch_set_quote", { _job: job.id, _fee: Number(fee) }, tx("Fee sent to customer", "Frais envoyés au client"))}>
              {tx("Set fee", "Fixer les frais")}
            </Button>
          </div>
        ) : null}
        {job.fee_amount !== null && !external ? (
          <p className="text-xs">{formatXAF(job.fee_amount)} · {approved ? tx("approved by customer", "approuvés par le client") : tx("waiting for customer approval", "en attente du client")}</p>
        ) : null}
        {quotable && approved && job.fulfillment_mode === "VENDOR_DISPATCH" ? (
          ready.length ? (
            <div className="flex flex-wrap gap-2">
              {ready.map((r) => (
                <Button key={r.user_id} size="sm" onClick={() => act("dispatch_assign_rider", { _job: job.id, _rider: r.user_id }, tx("Rider offered the delivery", "Livraison proposée au livreur"))}>
                  {tx("Assign", "Attribuer")} {r.full_name ?? names[r.user_id]}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{tx("No approved rider on your team is available right now.", "Aucun livreur approuvé de votre équipe n'est disponible.")}</p>
          )
        ) : null}
        {quotable && approved && job.fulfillment_mode === "CHOSEN_RIDER" ? (
          <p className="text-xs text-muted-foreground">{tx("The customer is choosing an ASH rider.", "Le client choisit un livreur ASH.")}</p>
        ) : null}
        {quotable && approved && job.fulfillment_mode === "ASH_DISPATCH" ? (
          <p className="text-xs text-muted-foreground">{tx("ASH Logistics will assign a verified rider.", "ASH Logistics attribuera un livreur vérifié.")}</p>
        ) : null}
        {job.fulfillment_mode === "SELF_PICKUP" && job.status === "REQUESTED" ? (
          <div className="flex gap-2">
            <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder={tx("Customer's 6-digit code", "Code à 6 chiffres du client")} />
            <Button onClick={() => act("dispatch_complete_with_code", { _job: job.id, _code: code }, tx("Handed over", "Remise confirmée"))}>{tx("Confirm", "Confirmer")}</Button>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>{open ? tx("Hide history", "Masquer") : tx("History", "Historique")}</Button>
          {!["IN_TRANSIT", "DELIVERED", "CANCELLED"].includes(job.status) ? (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => act("dispatch_cancel", { _job: job.id, _reason: "shop" }, tx("Cancelled", "Annulée"))}>{tx("Cancel", "Annuler")}</Button>
          ) : null}
        </div>
        {open ? <Timeline events={events.data ?? []} fr={fr} /> : null}
      </div>
    </Panel>
  );
}

function Team({ me, fr }: { me: string; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const team = useTeam(me);
  const riders = useRiders();
  const names = useNames((team.data ?? []).map((t) => t.rider_user_id));
  const invites = useQuery({ queryKey: ["dispatch-invites", me], queryFn: () => rpc<{ id: string; expires_at: string; used_at: string | null; revoked_at: string | null }[]>("dispatch_vendor_list_invites") });
  const [newCode, setNewCode] = useState<string | null>(null);
  const byId = new Map((riders.data ?? []).map((r) => [r.user_id, r]));

  async function act(fn: string, args: Record<string, unknown>, ok: string) {
    try {
      const out = await rpc<string>(fn, args);
      if (fn === "dispatch_vendor_create_invite") setNewCode(out);
      toast.success(ok);
      refresh();
      void invites.refetch();
    } catch (e) {
      toast.error(dispatchError(e, fr));
    }
  }

  return (
    <>
      <Panel title={tx("Invite a rider", "Inviter un livreur")} action={<Button size="sm" onClick={() => act("dispatch_vendor_create_invite", {}, tx("Invitation created", "Invitation créée"))}><UserPlus className="mr-1.5 h-4 w-4" />{tx("New code", "Nouveau code")}</Button>}>
        {newCode ? (
          <div className="flex items-center justify-between rounded-xl bg-muted p-3">
            <span className="font-mono text-lg font-bold tracking-widest">{newCode}</span>
            <Button size="icon" variant="ghost" aria-label={tx("Copy code", "Copier le code")} onClick={() => { void navigator.clipboard?.writeText(newCode); toast.success(tx("Copied", "Copié")); }}><Copy className="h-4 w-4" /></Button>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">{tx("Share the code privately. It works once, for 72 hours. The rider must still be approved by ASH before taking deliveries.", "Partagez le code en privé. Il fonctionne une fois, pendant 72 heures. Le livreur doit encore être approuvé par ASH.")}</p>
        <ul className="mt-3 space-y-1 text-xs">
          {(invites.data ?? []).filter((i) => !i.used_at && !i.revoked_at && new Date(i.expires_at) > new Date()).map((i) => (
            <li key={i.id} className="flex items-center justify-between">
              <span>{tx("Open invite, expires", "Invitation ouverte, expire")} {formatDateTime(i.expires_at)}</span>
              <Button size="sm" variant="ghost" onClick={() => act("dispatch_vendor_revoke_invite", { _invite: i.id }, tx("Invitation cancelled", "Invitation annulée"))}>{tx("Revoke", "Révoquer")}</Button>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title={tx("My Dispatch Team", "Mon équipe de livraison")}>
        {!team.data?.length ? (
          <p className="text-sm text-muted-foreground">{tx("No riders yet.", "Aucun livreur pour l'instant.")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {team.data.map((t) => {
              const r = byId.get(t.rider_user_id);
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{r?.full_name ?? names.data?.[t.rider_user_id] ?? tx("Rider", "Livreur")}</p>
                    <p className="text-xs text-muted-foreground">{r ? `${r.vehicle_type ?? ""} ${r.vehicle_plate ?? ""} · ${r.city ?? ""}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r ? <StatusPill status={r.verification_status} fr={fr} /> : null}
                    {r ? <StatusPill status={r.availability_status} fr={fr} /> : null}
                    {t.status === "ACCEPTED" ? (
                      <Button size="sm" variant="outline" onClick={() => act("dispatch_vendor_set_rider_status", { _rider: t.rider_user_id, _status: "SUSPENDED" }, tx("Rider suspended", "Livreur suspendu"))}>{tx("Suspend", "Suspendre")}</Button>
                    ) : t.status === "SUSPENDED" ? (
                      <Button size="sm" variant="outline" onClick={() => act("dispatch_vendor_set_rider_status", { _rider: t.rider_user_id, _status: "ACCEPTED" }, tx("Rider reinstated", "Livreur réintégré"))}>{tx("Reinstate", "Réintégrer")}</Button>
                    ) : <span className="text-xs text-muted-foreground">{tx("Left team", "A quitté")}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}

const PREF_ROWS: { key: keyof VendorPrefs; en: string; fr: string }[] = [
  { key: "allow_ash_dispatch", en: "ASH Glo riders (ASH Dispatch)", fr: "Livreurs ASH Glo (ASH Dispatch)" },
  { key: "allow_chosen_rider", en: "Customer chooses an ASH Glo rider", fr: "Le client choisit un livreur ASH Glo" },
  { key: "allow_external_rider", en: "Customer brings their own rider", fr: "Le client amène son propre livreur" },
  { key: "allow_vendor_riders", en: "My own ASH riders (Dispatch Team)", fr: "Mes livreurs ASH (équipe)" },
  { key: "allow_self_pickup", en: "Self pickup at the shop", fr: "Retrait en boutique" },
];

function DeliveryPrefs({ me, fr }: { me: string; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const prefs = useVendorPrefs(me);
  const [draft, setDraft] = useState<VendorPrefs | null>(null);
  const [busy, setBusy] = useState(false);
  const cur = draft ?? prefs.data ?? DEFAULT_PREFS;
  if (prefs.isLoading) return <LoadingState />;

  async function save() {
    setBusy(true);
    try {
      await rpc("dispatch_vendor_set_prefs", { _ash: cur.allow_ash_dispatch, _chosen: cur.allow_chosen_rider, _external: cur.allow_external_rider, _own: cur.allow_vendor_riders, _pickup: cur.allow_self_pickup });
      toast.success(tx("Delivery options saved", "Options enregistrées"));
      setDraft(null);
      refresh();
    } catch (e) {
      toast.error(dispatchError(e, fr));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={tx("Delivery methods you accept", "Modes de livraison acceptés")}>
      <ul className="divide-y divide-border">
        {PREF_ROWS.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span>{fr ? r.fr : r.en}</span>
            <Switch checked={cur[r.key]} onCheckedChange={(v) => setDraft({ ...cur, [r.key]: v })} aria-label={fr ? r.fr : r.en} />
          </li>
        ))}
      </ul>
      <Button className="mt-3 w-full" disabled={busy || !draft} onClick={save}>{tx("Save", "Enregistrer")}</Button>
      <p className="mt-2 text-xs text-muted-foreground">{tx("Customers only see the methods you switch on. Keep at least one on.", "Les clients ne voient que les modes activés. Gardez-en au moins un.")}</p>
    </Panel>
  );
}
