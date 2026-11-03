import type { ReactNode } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { DispatchEvent } from "@/lib/dispatch.queries";

const STATUS: Record<string, [string, string]> = {
  REQUESTED: ["Requested", "Demandée"],
  INVITED: ["Finding rider", "Recherche livreur"],
  ASSIGNED: ["Rider offered", "Proposée au livreur"],
  ACCEPTED: ["Rider on the way to pickup", "Livreur en route vers le retrait"],
  REJECTED: ["Rider declined", "Refusée par le livreur"],
  PICKUP_CONFIRMED: ["Picked up", "Récupérée"],
  IN_TRANSIT: ["On the way to you", "En route vers vous"],
  DELIVERED: ["Delivered", "Livrée"],
  CANCELLED: ["Cancelled", "Annulée"],
  UNSUBMITTED: ["Not submitted", "Non soumis"],
  PENDING: ["Under review", "En cours d'examen"],
  VERIFIED: ["Approved", "Approuvé"],
  SUSPENDED: ["Suspended", "Suspendu"],
  AVAILABLE: ["Available", "Disponible"],
  BUSY: ["Busy", "Occupé"],
  OFFLINE: ["Offline", "Hors ligne"],
};
const MODE: Record<string, [string, string]> = {
  ASH_DISPATCH: ["ASH rider", "Livreur ASH"],
  VENDOR_DISPATCH: ["Shop's own rider", "Livreur de la boutique"],
  SELF_PICKUP: ["Self pickup", "Retrait en boutique"],
  CHOSEN_RIDER: ["ASH rider I chose", "Livreur ASH choisi"],
  EXTERNAL_RIDER: ["My own rider (external)", "Mon propre livreur (externe)"],
};
const MODE_HELP: Record<string, [string, string]> = {
  ASH_DISPATCH: ["ASH Glo finds a verified rider. Live tracking once accepted.", "ASH Glo trouve un livreur vérifié. Suivi en direct après acceptation."],
  CHOSEN_RIDER: ["Pick a verified ASH rider. Live tracking once they accept.", "Choisissez un livreur ASH vérifié. Suivi en direct après acceptation."],
  EXTERNAL_RIDER: ["You arrange your own rider. Managed by you; no live tracking.", "Vous organisez votre livreur. Géré par vous ; pas de suivi en direct."],
  VENDOR_DISPATCH: ["The shop's own ASH rider delivers. Live tracking once accepted.", "Un livreur ASH de la boutique livre. Suivi en direct après acceptation."],
  SELF_PICKUP: ["Collect at the shop with your code. No rider.", "Retirez en boutique avec votre code. Sans livreur."],
};
export const modeHelp = (s: string, fr: boolean) => MODE_HELP[s]?.[fr ? 1 : 0] ?? "";

export const statusLabel = (s: string, fr: boolean) => STATUS[s]?.[fr ? 1 : 0] ?? s;
export const modeLabel = (s: string, fr: boolean) => MODE[s]?.[fr ? 1 : 0] ?? s;

export function StatusPill({ status, fr }: { status: string; fr: boolean }) {
  const tone =
    status === "DELIVERED" || status === "VERIFIED" || status === "AVAILABLE"
      ? "bg-primary/15 text-primary"
      : status === "CANCELLED" || status === "REJECTED" || status === "SUSPENDED"
        ? "bg-destructive/15 text-destructive"
        : "bg-accent/20 text-foreground";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", tone)}>{statusLabel(status, fr)}</span>;
}

const RIDER_STEPS = ["REQUESTED", "ASSIGNED", "ACCEPTED", "PICKUP_CONFIRMED", "IN_TRANSIT", "DELIVERED"];
const PICKUP_STEPS = ["REQUESTED", "DELIVERED"];
const EXTERNAL_STEPS = ["REQUESTED", "IN_TRANSIT", "DELIVERED"];

export function ProgressSteps({ status, mode, fr }: { status: string; mode: string; fr: boolean }) {
  const steps = mode === "SELF_PICKUP" ? PICKUP_STEPS : mode === "EXTERNAL_RIDER" ? EXTERNAL_STEPS : RIDER_STEPS;
  const idx = Math.max(0, steps.indexOf(status === "INVITED" || status === "REJECTED" ? "REQUESTED" : status));
  if (status === "CANCELLED") return <StatusPill status="CANCELLED" fr={fr} />;
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((s, i) => (
        <li key={s} className={cn("flex items-center gap-2 text-sm", i <= idx ? "text-foreground" : "text-muted-foreground")}>
          {i <= idx ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
          {statusLabel(s, fr)}
        </li>
      ))}
    </ol>
  );
}

export function Timeline({ events, fr }: { events: DispatchEvent[]; fr: boolean }) {
  if (!events.length) return null;
  return (
    <ul className="space-y-1.5 border-l border-border pl-3 text-xs text-muted-foreground">
      {events.map((e) => (
        <li key={e.id}>
          <span className="font-medium text-foreground">{statusLabel(e.status, fr)}</span> · {e.actor_type.toLowerCase()} ·{" "}
          {formatDateTime(e.created_at)}
          {e.note ? <span> — {e.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PageHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </header>
  );
}
