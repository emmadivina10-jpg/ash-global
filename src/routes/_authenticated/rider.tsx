import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bike, FileCheck2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/refer/states";
import { PageHead, Panel, StatusPill, Timeline, modeLabel } from "@/components/dispatch/DispatchUI";
import { useI18n } from "@/lib/i18n";
import { RiderLocationSharer } from "@/components/dispatch/DeliveryLiveMap";
import { formatXAF } from "@/lib/format";
import { RIDER_DOC_TYPES, missingDocs, riderCanTakeWork, type RiderDocType } from "@/lib/dispatch-docs";
import {
  dispatchError, rpc, uploadRiderDoc, useInvalidateDispatch, useJobEvents, useJobs, useMe, useMyRider, useMyShops, useNames, useRiderDocs,
  type DispatchJob, type RiderRow,
} from "@/lib/dispatch.queries";

export const Route = createFileRoute("/_authenticated/rider")({
  head: () => ({
    meta: [
      { title: "ASH Rider — ASH Glo" },
      { name: "description", content: "Register as an ASH rider, get verified and manage your deliveries." },
      { property: "og:title", content: "ASH Rider — ASH Glo" },
      { property: "og:description", content: "Rider sign-up, verification and delivery dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RiderPage,
});

const DOC_LABEL: Record<RiderDocType, [string, string]> = {
  NATIONAL_ID: ["National ID card", "Carte nationale d'identité"],
  PASSPORT: ["Passport", "Passeport"],
  DRIVER_LICENCE: ["Driving licence", "Permis de conduire"],
  VEHICLE_REGISTRATION: ["Vehicle registration", "Carte grise"],
  SELFIE: ["Selfie holding your ID", "Selfie avec votre pièce"],
};

function RiderPage() {
  const { lang, tx } = useI18n();
  const fr = lang === "fr";
  const { data: me } = useMe();
  const rider = useMyRider(me);
  if (!me || rider.isLoading) return <LoadingState />;
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <PageHead title="ASH Rider" subtitle={tx("Deliver for ASH Glo shops with your existing account.", "Livrez pour les boutiques ASH Glo avec votre compte.")} />
      <Profile me={me} rider={rider.data ?? null} fr={fr} />
      {rider.data ? (
        <>
          <Documents me={me} rider={rider.data} fr={fr} />
          <Availability rider={rider.data} fr={fr} />
          <Shops me={me} fr={fr} />
          <RiderJobs me={me} rider={rider.data} fr={fr} />
        </>
      ) : null}
    </div>
  );
}

function Profile({ me: _me, rider, fr }: { me: string; rider: RiderRow | null; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const [edit, setEdit] = useState(!rider);
  const [f, setF] = useState({
    name: rider?.full_name ?? "", phone: rider?.phone ?? "", city: rider?.city ?? "", vehicle: rider?.vehicle_type ?? "MOTORCYCLE",
    plate: rider?.vehicle_plate ?? "", model: rider?.vehicle_model ?? "", color: rider?.vehicle_color ?? "", licence: rider?.licence_number ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    try {
      await rpc("dispatch_rider_register", { _full_name: f.name, _phone: f.phone, _city: f.city, _vehicle_type: f.vehicle, _plate: f.plate || null, _model: f.model || null, _color: f.color || null, _licence: f.licence || null });
      toast.success(tx("Rider details saved", "Informations enregistrées"));
      setEdit(false);
      refresh();
    } catch (e) {
      toast.error(dispatchError(e, fr));
    }
  }

  if (rider && !edit)
    return (
      <Panel title={rider.full_name ?? ""} action={<StatusPill status={rider.verification_status} fr={fr} />}>
        <p className="text-sm text-muted-foreground">{rider.vehicle_type} {rider.vehicle_plate} {rider.vehicle_model} {rider.vehicle_color} · {rider.city}</p>
        {rider.verification_note ? <p className="mt-2 text-sm text-destructive">{rider.verification_note}</p> : null}
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEdit(true)}>{tx("Edit details", "Modifier")}</Button>
        {rider.verification_status === "VERIFIED" ? <p className="text-xs text-muted-foreground">{tx("Changing details sends your account back for review.", "Modifier vos informations renvoie votre compte en examen.")}</p> : null}
      </Panel>
    );

  const motor = f.vehicle === "MOTORCYCLE" || f.vehicle === "CAR";
  return (
    <Panel title={rider ? tx("Edit rider details", "Modifier mes informations") : tx("Become a rider", "Devenir livreur")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>{tx("Full legal name", "Nom complet")}</Label><Input value={f.name} onChange={set("name")} maxLength={100} /></div>
        <div><Label>{tx("Phone", "Téléphone")}</Label><Input value={f.phone} onChange={set("phone")} maxLength={20} inputMode="tel" /></div>
        <div><Label>{tx("City", "Ville")}</Label><Input value={f.city} onChange={set("city")} maxLength={60} /></div>
        <div>
          <Label>{tx("Vehicle", "Véhicule")}</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value })}>
            <option value="MOTORCYCLE">{tx("Motorcycle", "Moto")}</option>
            <option value="CAR">{tx("Car", "Voiture")}</option>
            <option value="BICYCLE">{tx("Bicycle", "Vélo")}</option>
            <option value="WALKING">{tx("On foot", "À pied")}</option>
          </select>
        </div>
        {motor ? (
          <>
            <div><Label>{tx("Plate number", "Immatriculation")}</Label><Input value={f.plate} onChange={set("plate")} maxLength={20} /></div>
            <div><Label>{tx("Driving licence number", "N° de permis")}</Label><Input value={f.licence} onChange={set("licence")} maxLength={40} /></div>
          </>
        ) : null}
        <div><Label>{tx("Model (optional)", "Modèle (facultatif)")}</Label><Input value={f.model} onChange={set("model")} maxLength={60} /></div>
        <div><Label>{tx("Colour (optional)", "Couleur (facultatif)")}</Label><Input value={f.color} onChange={set("color")} maxLength={30} /></div>
      </div>
      <Button className="mt-4 w-full" onClick={save}><Bike className="mr-2 h-4 w-4" />{tx("Save", "Enregistrer")}</Button>
    </Panel>
  );
}

function Documents({ me, rider, fr }: { me: string; rider: RiderRow; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const docs = useRiderDocs(me);
  const [busy, setBusy] = useState<string | null>(null);
  const have = (docs.data ?? []).map((d) => d.doc_type);
  const missing = missingDocs(rider.vehicle_type, have);
  const canSubmit = ["UNSUBMITTED", "REJECTED"].includes(rider.verification_status);

  async function upload(t: RiderDocType, file?: File) {
    if (!file) return;
    setBusy(t);
    try {
      await uploadRiderDoc(me, t, file);
      toast.success(tx("Document uploaded privately", "Document envoyé en privé"));
      refresh();
    } catch (e) {
      const m = (e as Error).message;
      toast.error(m === "BAD_TYPE" ? tx("Use a JPG, PNG, WEBP or PDF file.", "Utilisez un fichier JPG, PNG, WEBP ou PDF.") : m === "TOO_LARGE" ? tx("Files must be 10 MB or less.", "10 Mo maximum.") : dispatchError(e, fr));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel title={tx("Identity verification", "Vérification d'identité")}>
      <p className="mb-3 text-xs text-muted-foreground">{tx("Files are private: only you and ASH verification staff can open them. Shops never see them.", "Fichiers privés : seuls vous et l'équipe de vérification ASH pouvez les ouvrir. Les boutiques ne les voient jamais.")}</p>
      <ul className="space-y-2">
        {RIDER_DOC_TYPES.map((t) => (
          <li key={t} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5">{have.includes(t) ? <FileCheck2 className="h-4 w-4 text-primary" /> : null}{DOC_LABEL[t][fr ? 1 : 0]}</span>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">
              <Upload className="h-3.5 w-3.5" />{busy === t ? "…" : have.includes(t) ? tx("Replace", "Remplacer") : tx("Upload", "Envoyer")}
              <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={!!busy} aria-label={DOC_LABEL[t][fr ? 1 : 0]} onChange={(e) => upload(t, e.target.files?.[0])} />
            </label>
          </li>
        ))}
      </ul>
      {canSubmit ? (
        <Button className="mt-4 h-auto w-full whitespace-normal py-2" disabled={missing.length > 0} onClick={async () => {
          try { await rpc("dispatch_rider_submit_verification"); toast.success(tx("Sent for review", "Envoyé pour examen")); refresh(); } catch (e) { toast.error(dispatchError(e, fr)); }
        }}>
          {missing.length ? `${tx("Missing", "Manquant")}: ${missing.map((m) => DOC_LABEL[m][fr ? 1 : 0]).join(", ")}` : tx("Submit for verification", "Soumettre pour vérification")}
        </Button>
      ) : null}
    </Panel>
  );
}

function Availability({ rider, fr }: { rider: RiderRow; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const [zones, setZones] = useState(rider.service_zones.join(", "));
  const verified = rider.verification_status === "VERIFIED" && rider.is_active;
  async function act(fn: string, args: Record<string, unknown>, ok: string) {
    try { await rpc(fn, args); toast.success(ok); refresh(); } catch (e) { toast.error(dispatchError(e, fr)); }
  }
  return (
    <Panel title={tx("Availability and areas", "Disponibilité et zones")} action={<StatusPill status={rider.availability_status} fr={fr} />}>
      <div className="grid grid-cols-3 gap-2">
        {(["AVAILABLE", "BUSY", "OFFLINE"] as const).map((s) => (
          <Button key={s} size="sm" variant={rider.availability_status === s ? "default" : "outline"} disabled={!verified && s !== "OFFLINE"} onClick={() => act("dispatch_rider_set_availability", { _status: s }, tx("Updated", "Mis à jour"))}>
            <StatusLabel s={s} fr={fr} />
          </Button>
        ))}
      </div>
      {!verified ? <p className="mt-2 text-xs text-muted-foreground">{tx("You can go online once ASH approves your account.", "Vous pourrez vous connecter après approbation par ASH.")}</p> : null}
      <Label className="mt-3 block">{tx("Delivery areas (comma separated, up to 10)", "Zones de livraison (séparées par des virgules, 10 max)")}</Label>
      <div className="mt-1 flex gap-2">
        <Input value={zones} onChange={(e) => setZones(e.target.value)} placeholder="Akwa, Bonapriso, Bastos" />
        <Button variant="outline" onClick={() => act("dispatch_rider_set_zones", { _zones: zones.split(",").map((z) => z.trim()).filter(Boolean) }, tx("Areas saved", "Zones enregistrées"))}>{tx("Save", "Enregistrer")}</Button>
      </div>
    </Panel>
  );
}

function StatusLabel({ s, fr }: { s: string; fr: boolean }) {
  return <>{{ AVAILABLE: fr ? "Disponible" : "Available", BUSY: fr ? "Occupé" : "Busy", OFFLINE: fr ? "Hors ligne" : "Offline" }[s]}</>;
}

function Shops({ me, fr }: { me: string; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const shops = useMyShops(me);
  const names = useNames((shops.data ?? []).map((s) => s.vendor_id));
  const [code, setCode] = useState("");
  async function act(fn: string, args: Record<string, unknown>, ok: string) {
    try { await rpc(fn, args); toast.success(ok); setCode(""); refresh(); } catch (e) { toast.error(dispatchError(e, fr)); }
  }
  return (
    <Panel title={tx("Shop teams", "Équipes de boutiques")}>
      <div className="flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} placeholder={tx("Invitation code", "Code d'invitation")} />
        <Button variant="outline" disabled={code.length < 6} onClick={() => act("dispatch_rider_redeem_invite", { _code: code }, tx("You joined the shop team", "Vous avez rejoint l'équipe"))}>{tx("Join", "Rejoindre")}</Button>
      </div>
      <ul className="mt-3 divide-y divide-border text-sm">
        {(shops.data ?? []).map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2">
            <span>{names.data?.[s.vendor_id] ?? tx("Shop", "Boutique")} · <StatusPill status={s.status === "ACCEPTED" ? "VERIFIED" : s.status} fr={fr} /></span>
            {s.status === "ACCEPTED" ? <Button size="sm" variant="ghost" onClick={() => act("dispatch_rider_leave_vendor", { _vendor: s.vendor_id }, tx("You left the team", "Vous avez quitté l'équipe"))}>{tx("Leave", "Quitter")}</Button> : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function RiderJobs({ me, rider, fr }: { me: string; rider: RiderRow; fr: boolean }) {
  const { tx } = useI18n();
  const jobs = useJobs("rider", me);
  const active = (jobs.data ?? []).filter((j) => !["DELIVERED", "CANCELLED", "REJECTED"].includes(j.status));
  const past = (jobs.data ?? []).filter((j) => ["DELIVERED", "CANCELLED"].includes(j.status)).slice(0, 10);
  return (
    <Panel title={tx("My deliveries", "Mes livraisons")}>
      {!active.length ? <p className="text-sm text-muted-foreground">{tx("No active deliveries.", "Aucune livraison active.")}</p> : active.map((j) => <RiderJob key={j.id} job={j} canTake={riderCanTakeWork(rider)} fr={fr} />)}
      {past.length ? (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {past.map((j) => <li key={j.id}>{j.dropoff_address} · <StatusPill status={j.status} fr={fr} /></li>)}
        </ul>
      ) : null}
    </Panel>
  );
}

function RiderJob({ job, canTake, fr }: { job: DispatchJob; canTake: boolean; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const events = useJobEvents(open ? job.id : null);
  async function act(fn: string, args: Record<string, unknown>, ok: string) {
    try {
      const out = await rpc<string>(fn, args);
      if (fn === "dispatch_complete_with_code" && out !== "OK") {
        toast.error({ WRONG: tx("Wrong code", "Code incorrect"), EXPIRED: tx("Code expired; ask the customer for a new one", "Code expiré ; demandez-en un nouveau"), LOCKED: tx("Too many tries; ask for a new code", "Trop d'essais ; demandez un nouveau code"), USED: tx("Code already used", "Code déjà utilisé"), NO_CODE: tx("Ask the customer to show their code", "Demandez au client d'afficher son code") }[out] ?? out);
        return;
      }
      toast.success(ok); refresh();
    } catch (e) { toast.error(dispatchError(e, fr)); }
  }
  return (
    <div className="mb-3 space-y-2 rounded-xl border border-border p-3 text-sm">
      <div className="flex items-center justify-between"><span className="font-medium">{modeLabel(job.fulfillment_mode, fr)}</span><StatusPill status={job.status} fr={fr} /></div>
      <p className="text-muted-foreground">{job.pickup_address} → {job.dropoff_address}</p>
      {job.fee_amount !== null ? <p className="text-xs">{tx("Delivery fee", "Frais de livraison")} {formatXAF(job.fee_amount)}</p> : null}
      {job.status === "ASSIGNED" ? (
        <div className="flex gap-2">
          <Button className="flex-1" disabled={!canTake} onClick={() => act("dispatch_rider_respond", { _job: job.id, _accept: true }, tx("Accepted", "Acceptée"))}>{tx("Accept", "Accepter")}</Button>
          <Button className="flex-1" variant="outline" onClick={() => act("dispatch_rider_respond", { _job: job.id, _accept: false }, tx("Declined", "Refusée"))}>{tx("Decline", "Refuser")}</Button>
        </div>
      ) : null}
      {job.status === "ASSIGNED" && job.offer_expires_at ? <p className="text-xs text-muted-foreground">{tx("Offer expires at", "La proposition expire à")} {new Date(job.offer_expires_at).toLocaleTimeString()}</p> : null}
      {job.status === "ASSIGNED" && !canTake ? <p className="text-xs text-destructive">{tx("Set yourself Available to accept.", "Passez en Disponible pour accepter.")}</p> : null}
      {job.status === "ACCEPTED" ? <Button className="w-full" onClick={() => act("dispatch_rider_progress", { _job: job.id, _next: "PICKUP_CONFIRMED" }, tx("Pickup confirmed", "Retrait confirmé"))}>{tx("I picked up the order", "J'ai récupéré la commande")}</Button> : null}
      {job.status === "PICKUP_CONFIRMED" ? <Button className="w-full" onClick={() => act("dispatch_rider_progress", { _job: job.id, _next: "IN_TRANSIT" }, tx("On the way", "En route"))}>{tx("Start delivery", "Commencer la livraison")}</Button> : null}
      {job.status === "IN_TRANSIT" ? (
        <div className="flex gap-2">
          <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder={tx("Customer's 6-digit code", "Code à 6 chiffres du client")} />
          <Button onClick={() => act("dispatch_complete_with_code", { _job: job.id, _code: code }, tx("Delivered", "Livrée"))}>{tx("Complete", "Terminer")}</Button>
        </div>
      ) : null}
      <RiderLocationSharer job={job} />
      <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>{open ? tx("Hide history", "Masquer") : tx("History", "Historique")}</Button>
      {open ? <Timeline events={events.data ?? []} fr={fr} /> : null}
    </div>
  );
}
