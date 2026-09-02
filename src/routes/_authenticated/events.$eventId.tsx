import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CalendarDays, MapPin, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { startTicketPurchase, verifyCommerceCharge } from "@/lib/commerce.functions";
import { useEvent } from "@/lib/ash.queries";
import { MomoCharge } from "@/components/refer/MomoCharge";
import { PromoteDialog } from "@/components/refer/PromoteDialog";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { formatDateTime, formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event details — ASH Events" },
      { name: "description", content: "See the full programme, venue and ticket options for this ASH event and pay securely with mobile money." },
      { property: "og:title", content: "Event details — ASH Events" },
      { property: "og:description", content: "Programme, venue and tickets for this ASH event." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const { lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const { data: event, isLoading } = useEvent(eventId);
  const start = useServerFn(startTicketPurchase);
  const verify = useServerFn(verifyCommerceCharge);

  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  if (isLoading) return <LoadingState label={fr ? "Chargement…" : "Loading…"} />;
  if (!event) {
    return (
      <EmptyState
        title={fr ? "Événement introuvable" : "Event not found"}
        action={
          <Button asChild variant="outline">
            <Link to="/events">{fr ? "Retour aux événements" : "Back to events"}</Link>
          </Button>
        }
      />
    );
  }

  const left = Math.max(0, event.ticket_capacity - event.tickets_sold);
  const total = event.ticket_price * quantity;

  async function charge(provider: string, phone: string) {
    setBusy(true);
    try {
      const result = await start({ data: { eventId, quantity, provider, phone } });
      if (!result.ok) {
        toast.error(
          result.error === "SOLD_OUT"
            ? fr ? "Plus de places disponibles." : "No seats left."
            : (result.message ?? (fr ? "Le paiement n'a pas démarré." : "The payment could not start.")),
        );
        return;
      }
      setReference(result.reference);
      toast.success(fr ? "Validez la demande sur votre téléphone." : "Approve the prompt on your phone.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!reference) return;
    setBusy(true);
    try {
      const result = await verify({ data: { reference } });
      if (result.ok) {
        toast.success(fr ? "Billet confirmé !" : "Ticket confirmed!");
        setReference(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["event", eventId] }),
          queryClient.invalidateQueries({ queryKey: ["event-tickets", "mine"] }),
        ]);
      } else {
        toast.error(fr ? "Paiement pas encore confirmé." : "Payment not confirmed yet.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {fr ? "Événements" : "Events"}
      </Link>

      <header className="tile space-y-3 p-5">
        <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {event.category}
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{event.title}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            {formatDateTime(event.starts_at)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {event.venue ?? event.city ?? event.country}
          </span>
        </p>
        {event.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{event.description}</p>
        ) : null}
        <PromoteDialog targetType="EVENT" targetId={event.id} defaultHeadline={event.title} city={event.city} category={event.category} />
      </header>

      <section className="tile space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {fr ? "Billet" : "Ticket"}
            </p>
            <p className="font-display text-2xl font-extrabold text-foreground">
              {event.is_free ? (fr ? "Gratuit" : "Free") : formatXAF(event.ticket_price)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {left} {fr ? "places restantes" : "seats left"}
          </p>
        </div>

        {event.is_free ? (
          <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
            {fr ? "Entrée libre — présentez-vous simplement sur place." : "Free entry — just show up at the venue."}
          </p>
        ) : left === 0 ? (
          <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{fr ? "Complet." : "Sold out."}</p>
        ) : reference ? (
          <div className="space-y-3">
            <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              {fr ? "Validez la demande Mobile Money puis confirmez ici." : "Approve the mobile money prompt, then confirm here."}
            </p>
            <Button className="w-full" disabled={busy} onClick={() => void confirm()}>
              {fr ? "J'ai payé" : "I have paid"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" aria-label={fr ? "Moins" : "Fewer"} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                <Minus className="size-4" aria-hidden />
              </Button>
              <span className="min-w-10 text-center font-display text-lg font-extrabold text-foreground">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                aria-label={fr ? "Plus" : "More"}
                onClick={() => setQuantity((q) => Math.min(10, left, q + 1))}
              >
                <Plus className="size-4" aria-hidden />
              </Button>
              <span className="ml-auto text-sm text-muted-foreground">
                {fr ? "Total" : "Total"} <strong className="text-foreground">{formatXAF(total)}</strong>
              </span>
            </div>

            <MomoCharge
              country={event.country || "CM"}
              busy={busy}
              fr={fr}
              submitLabel={`${fr ? "Payer" : "Pay"} ${formatXAF(total)}`}
              onCharge={charge}
            />
          </div>
        )}
      </section>
    </div>
  );
}
