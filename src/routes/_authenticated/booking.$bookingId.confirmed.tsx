import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { getBookingReceipt } from "@/lib/booking-receipt.functions";
import { syncBookingPayment } from "@/lib/booking.functions";
import { openConversation } from "@/lib/marketplace.queries";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatXAF } from "@/lib/format";
import { bookingStatusLabel } from "@/lib/booking";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/booking/$bookingId/confirmed")({
  head: () => ({
    meta: [
      { title: "Booking confirmed — ASH Glo" },
      {
        name: "description",
        content: "Your ASH booking is paid and confirmed. See what happens next.",
      },
      { property: "og:title", content: "Booking confirmed — ASH Glo" },
      {
        property: "og:description",
        content: "Payment, receipt and verification code for your ASH booking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const { bookingId } = Route.useParams();
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const fetchReceipt = useServerFn(getBookingReceipt);
  const sync = useServerFn(syncBookingPayment);
  const { data, refetch } = useQuery({
    queryKey: ["bookings", "receipt", bookingId],
    queryFn: () => fetchReceipt({ data: { bookingId } }),
  });

  // Returning from card checkout: ask the server for the real outcome until it's settled.
  const waiting = data && !data.paid && data.status === "PAYMENT_PROCESSING";
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(async () => {
      try {
        await sync({ data: { bookingId } });
      } catch {
        /* retry */
      }
      void refetch();
    }, 4000);
    return () => clearInterval(t);
  }, [waiting, bookingId, sync, refetch]);

  // Card payment confirmed: go straight to the live tracking map.
  useEffect(() => {
    if (data?.paid)
      void navigate({ to: "/booking/$bookingId/track", params: { bookingId }, replace: true });
  }, [data?.paid, bookingId, navigate]);

  if (!data) return <p className="p-6 text-sm text-muted-foreground">…</p>;

  if (!data.paid) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        {waiting ? <Loader2 className="mx-auto size-10 animate-spin text-primary" /> : null}
        <p className="font-display text-xl font-bold">
          {waiting
            ? tx("Confirming your payment…", "Confirmation du paiement…")
            : tx("Payment not received", "Paiement non reçu")}
        </p>
        <p className="text-sm text-muted-foreground">
          {waiting
            ? tx(
                "We're waiting for the payment provider to confirm.",
                "Nous attendons la confirmation du prestataire de paiement.",
              )
            : tx(
                "No payment has been confirmed for this booking.",
                "Aucun montant n'a été confirmé pour cette réservation.",
              )}
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/bookings">{tx("My bookings", "Mes réservations")}</Link>
        </Button>
      </div>
    );
  }

  const steps = [
    [tx("Payment successful", "Paiement réussi"), true],
    [
      tx("Booking confirmed", "Réservation confirmée"),
      ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "SETTLED"].includes(data.status),
    ],
    [tx("Provider accepted", "Prestataire a accepté"), true],
    [tx("Receipt generated", "Reçu généré"), !!data.receiptNumber],
    [
      tx("Verification code available", "Code de vérification disponible"),
      !!data.verificationCode || data.codeUsed,
    ],
  ] as const;

  async function chat() {
    if (!data) return;
    const id = await openConversation(data.provider.profileId, data.bookingId);
    if (id) void navigate({ to: "/messages", search: { c: id } });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 pb-12">
      <div className="rounded-3xl bg-primary/10 p-6 text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" />
        <h1 className="mt-2 font-display text-2xl font-extrabold">
          {tx("BOOKING CONFIRMED", "RÉSERVATION CONFIRMÉE")}
        </h1>
        <p className="text-sm text-muted-foreground">{formatXAF(data.amount)}</p>
      </div>
      <ul className="space-y-2 rounded-2xl border border-border bg-card p-4">
        {steps.map(([label, ok]) => (
          <li key={label} className="flex items-center gap-2 text-sm font-semibold">
            {ok ? (
              <CheckCircle2 className="size-4 text-primary" />
            ) : (
              <Circle className="size-4 text-muted-foreground" />
            )}{" "}
            {label}
          </li>
        ))}
      </ul>
      <dl className="space-y-1 rounded-2xl border border-border bg-card p-4 text-sm">
        <R k={tx("Booking ID", "N° réservation")} v={data.bookingId.slice(0, 8).toUpperCase()} />
        <R k={tx("Provider", "Prestataire")} v={data.provider.name ?? "—"} />
        <R k="Service" v={data.service} />
        <R k="Date" v={data.scheduledAt ? formatDateTime(data.scheduledAt) : "—"} />
        <R k={tx("Location", "Lieu")} v={data.location ?? "—"} />
        <R k={tx("Amount paid", "Montant payé")} v={formatXAF(data.amount)} />
        <R
          k={tx("Method", "Moyen")}
          v={data.paymentMethod === "STRIPE" ? tx("Card", "Carte") : (data.paymentMethod ?? "—")}
        />
        <R k={tx("Status", "Statut")} v={bookingStatusLabel(data.status, lang)} />
      </dl>
      <div className="rounded-2xl bg-muted p-4 text-sm">
        <p className="font-bold">{tx("What happens next", "Et maintenant ?")}</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>
            {tx(
              "Meet your provider at the booked time and place.",
              "Retrouvez votre prestataire à l'heure et au lieu prévus.",
            )}
          </li>
          <li>
            {tx(
              "When the service is done, give them your private code (on your receipt).",
              "Quand le service est terminé, donnez-lui votre code privé (dans le reçu).",
            )}
          </li>
          <li>
            {tx(
              "The provider is paid only after entering that code.",
              "Le prestataire est payé seulement après ce code.",
            )}
          </li>
        </ol>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild className="rounded-full">
          <Link to="/bookings">{tx("View booking", "Voir la réservation")}</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/booking/$bookingId/receipt" params={{ bookingId }}>
            {tx("View receipt", "Voir le reçu")}
          </Link>
        </Button>
        <Button variant="outline" className="rounded-full" onClick={() => void chat()}>
          {tx("Chat with provider", "Écrire au prestataire")}
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/booking/$bookingId/track" params={{ bookingId }}>
            {tx("Track provider", "Suivre le prestataire")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function R({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}
