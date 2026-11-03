import { useState } from "react";
import { toast } from "sonner";
import { Bike, Car, Footprints, Truck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { dispatchError, rpc, useInvalidateDispatch, useRiderDirectory, type DeliveryMode } from "@/lib/dispatch.queries";
import { modeHelp, modeLabel } from "@/components/dispatch/DispatchUI";

/** Method selector showing only what the shop accepts, each with who manages it. */
export function MethodSelector({ modes, value, onChange, fr }: { modes: DeliveryMode[]; value: DeliveryMode; onChange: (m: DeliveryMode) => void; fr: boolean }) {
  return (
    <div role="radiogroup" className="grid gap-2">
      {modes.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          onClick={() => onChange(m)}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-left transition-colors",
            value === m ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
          )}
        >
          <span className="block text-sm font-semibold">{modeLabel(m, fr)}</span>
          <span className="block text-xs text-muted-foreground">{modeHelp(m, fr)}</span>
        </button>
      ))}
    </div>
  );
}

const VEHICLE_ICON: Record<string, typeof Bike> = { BICYCLE: Bike, MOTORCYCLE: Bike, CAR: Car, VAN: Truck, FOOT: Footprints };

/** Directory of verified, available ASH riders; choosing one sends an offer (not an assignment). */
export function RiderPicker({ jobId, fr }: { jobId: string; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const dir = useRiderDirectory(true, query);
  const [busy, setBusy] = useState<string | null>(null);

  async function choose(id: string) {
    setBusy(id);
    try {
      await rpc("dispatch_offer_chosen_rider", { _job: jobId, _rider: id });
      toast.success(tx("Offer sent. The rider has 15 minutes to accept.", "Proposition envoyée. Le livreur a 15 minutes pour accepter."));
      refresh();
    } catch (e) {
      toast.error(dispatchError(e, fr));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-sm font-semibold">{tx("Choose an ASH rider", "Choisir un livreur ASH")}</p>
      <div className="flex gap-2">
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={tx("City or area (optional)", "Ville ou zone (facultatif)")} maxLength={60} />
        <Button variant="outline" onClick={() => setQuery(city)}>{tx("Search", "Chercher")}</Button>
      </div>
      {dir.isLoading ? <p className="text-xs text-muted-foreground">{tx("Loading riders…", "Chargement…")}</p> : null}
      {dir.isError ? <p className="text-xs text-destructive">{tx("Riders could not be loaded.", "Impossible de charger les livreurs.")}</p> : null}
      {dir.data && dir.data.length === 0 ? (
        <p className="text-xs text-muted-foreground">{tx("No verified rider is available right now. Try another area or use ASH Dispatch.", "Aucun livreur vérifié disponible. Essayez une autre zone ou ASH Dispatch.")}</p>
      ) : null}
      <ul className="divide-y divide-border">
        {(dir.data ?? []).map((r) => {
          const Icon = VEHICLE_ICON[r.vehicle_type ?? ""] ?? Bike;
          return (
            <li key={r.user_id} className="flex items-center gap-3 py-2">
              {r.avatar_url ? (
                <img src={r.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-muted"><UserRound className="h-5 w-5 text-muted-foreground" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.display_name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {[r.city, ...(r.service_zones ?? []).slice(0, 2)].filter(Boolean).join(" · ") || tx("Area not set", "Zone non précisée")}
                </p>
                <p className="text-[11px] text-muted-foreground">{tx("Available · Not yet rated", "Disponible · Pas encore noté")}</p>
              </div>
              <Button size="sm" disabled={busy !== null} onClick={() => choose(r.user_id)}>{tx("Choose", "Choisir")}</Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const VEHICLES = ["MOTORCYCLE", "CAR", "BICYCLE", "VAN", "FOOT"] as const;
const VEHICLE_LABEL: Record<string, [string, string]> = {
  MOTORCYCLE: ["Motorcycle", "Moto"], CAR: ["Car", "Voiture"], BICYCLE: ["Bicycle", "Vélo"], VAN: ["Van", "Camionnette"], FOOT: ["On foot", "À pied"],
};
export const vehicleLabel = (v: string, fr: boolean) => VEHICLE_LABEL[v]?.[fr ? 1 : 0] ?? v;

/** Details of the customer's own rider. No ASH account is created for them. */
export function ExternalRiderForm({ jobId, fr }: { jobId: string; fr: boolean }) {
  const { tx } = useI18n();
  const refresh = useInvalidateDispatch();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState<(typeof VEHICLES)[number]>("MOTORCYCLE");
  const [plate, setPlate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await rpc("dispatch_set_external_rider", { _job: jobId, _name: name, _phone: phone, _vehicle: vehicle, _plate: plate || null, _note: note || null });
      toast.success(tx("Rider details saved. Create a collection code for them.", "Livreur enregistré. Créez un code de retrait pour lui."));
      refresh();
    } catch (e) {
      toast.error(dispatchError(e, fr));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-sm font-semibold">{tx("Your rider's details", "Informations de votre livreur")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><Label>{tx("Full name", "Nom complet")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
        <div><Label>{tx("Phone", "Téléphone")}</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={25} /></div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {VEHICLES.map((v) => (
          <Button key={v} type="button" size="sm" variant={vehicle === v ? "default" : "outline"} onClick={() => setVehicle(v)}>{vehicleLabel(v, fr)}</Button>
        ))}
      </div>
      {vehicle === "MOTORCYCLE" || vehicle === "CAR" || vehicle === "VAN" ? (
        <div><Label>{tx("Plate (optional)", "Plaque (facultatif)")}</Label><Input value={plate} onChange={(e) => setPlate(e.target.value)} maxLength={20} /></div>
      ) : null}
      <div><Label>{tx("Note (optional)", "Note (facultatif)")}</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></div>
      <Button className="w-full" disabled={busy} onClick={save}>{tx("Save rider", "Enregistrer le livreur")}</Button>
      <p className="text-xs text-muted-foreground">{tx("Only you and the shop see these details. ASH Glo does not manage or track this rider.", "Seuls vous et la boutique voyez ces informations. ASH Glo ne gère ni ne suit ce livreur.")}</p>
    </div>
  );
}
