import { createFileRoute } from "@tanstack/react-router";
import { BookingTracking } from "@/components/refer/BookingTracking";

export const Route = createFileRoute("/_authenticated/booking/$bookingId/track")({
  head: () => ({
    meta: [
      { title: "Track booking — ASH Glo" },
      { name: "description", content: "Follow your ASH provider's trip to your booking location." },
      { property: "og:title", content: "Track booking — ASH Glo" },
      { property: "og:description", content: "Live trip status for an active ASH booking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { bookingId } = Route.useParams();
  return <BookingTracking bookingId={bookingId} />;
}
