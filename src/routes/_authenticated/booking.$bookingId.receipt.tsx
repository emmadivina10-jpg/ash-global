import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBookingReceipt } from "@/lib/booking-receipt.functions";
import { BookingReceiptView } from "@/components/refer/BookingReceiptView";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/booking/$bookingId/receipt")({
  head: () => ({
    meta: [
      { title: "Booking receipt — ASH Glo" },
      { name: "description", content: "Official ASH Glo receipt for your service booking." },
      { property: "og:title", content: "Booking receipt — ASH Glo" },
      { property: "og:description", content: "Payment, booking and verification details for an ASH booking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReceiptPage,
});

function ReceiptPage() {
  const { bookingId } = Route.useParams();
  const { lang } = useI18n();
  const fetchReceipt = useServerFn(getBookingReceipt);
  const { data, error } = useQuery({
    queryKey: ["bookings", "receipt", bookingId],
    queryFn: () => fetchReceipt({ data: { bookingId } }),
  });
  if (error) return <p className="p-6 text-sm text-muted-foreground">{lang === "fr" ? "Reçu introuvable." : "Receipt not found."}</p>;
  if (!data) return <p className="p-6 text-sm text-muted-foreground">…</p>;
  return <BookingReceiptView r={data} fr={lang === "fr"} />;
}
