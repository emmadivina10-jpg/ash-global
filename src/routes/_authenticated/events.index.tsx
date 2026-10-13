import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Plus, Ticket } from "lucide-react";
import { useEvents, useMyTickets } from "@/lib/ash.queries";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { formatDateTime, formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ComingSoon } from "@/components/refer/ComingSoon";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({
    meta: [
      { title: "ASH Events — Coming soon" },
      { name: "description", content: "Event discovery and ticketing are coming soon to ASH Glo." },
      { property: "og:title", content: "ASH Events — Coming soon" },
      {
        property: "og:description",
        content: "Concerts, conferences and workshops near you are on the way.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventsSoon,
});

// Events are blocked behind a coming soon screen. Point this route back at
// EventsPage to re-enable the feature.
function EventsSoon() {
  return (
    <ComingSoon
      icon={CalendarDays}
      eyebrow="ASH EVENTS"
      titleEn="Events"
      titleFr="Événements"
      bodyEn="Concerts, conferences, workshops and community events near you are coming to ASH, with ticketing built in."
      bodyFr="Concerts, conférences, ateliers et événements communautaires près de vous arrivent sur ASH, billetterie incluse."
      features={[
        {
          icon: CalendarDays,
          en: "Discover local events",
          fr: "Découvrez les événements près de vous",
        },
        { icon: Ticket, en: "Buy tickets in app", fr: "Achetez vos billets dans l'app" },
      ]}
    />
  );
}

function EventsPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const events = useEvents();
  const tickets = useMyTickets();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {tx("ASH Events", "Événements ASH")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx(
              "Concerts, conferences, workshops and meetups near you.",
              "Concerts, conférences, ateliers et rencontres près de vous.",
            )}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/create">
            <Plus className="size-4" aria-hidden />
            {tx("Create an event", "Créer un événement")}
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">{tx("Upcoming", "À venir")}</TabsTrigger>
          <TabsTrigger value="tickets">{tx("My tickets", "Mes billets")}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {events.isLoading ? (
            <LoadingState label={tx("Loading events…", "Chargement des événements…")} />
          ) : (events.data ?? []).length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-5" aria-hidden />}
              title={tx("No published events yet", "Aucun événement publié")}
              description={tx(
                "Create the first event in your city.",
                "Créez le premier événement de votre ville.",
              )}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(events.data ?? []).map((event) => {
                const left = Math.max(0, event.ticket_capacity - event.tickets_sold);
                return (
                  <Link
                    key={event.id}
                    to="/events/$eventId"
                    params={{ eventId: event.id }}
                    className="tile flex flex-col gap-2 p-4 transition hover:border-primary/40"
                  >
                    <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {event.category}
                    </span>
                    <h2 className="font-semibold text-foreground">{event.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.starts_at)} ·{" "}
                      {event.venue ?? event.city ?? event.country}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="font-display text-lg font-extrabold text-foreground">
                        {event.is_free ? tx("Free", "Gratuit") : formatXAF(event.ticket_price)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {left} {tx("seats", "places")}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          {(tickets.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Ticket className="size-5" aria-hidden />}
              title={tx("No tickets yet", "Aucun billet")}
              description={tx(
                "Your paid tickets appear here with their entry code.",
                "Vos billets payés apparaîtront ici avec leur code.",
              )}
            />
          ) : (
            <ul className="space-y-3">
              {(tickets.data ?? []).map((row: any) => (
                <li
                  key={row.id}
                  className="tile flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {row.event?.title ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(row.event?.starts_at)} · {row.quantity} ×{" "}
                      {formatXAF(row.amount / Math.max(1, row.quantity))}
                    </p>
                  </div>
                  <span
                    className={
                      row.status === "PAID"
                        ? "rounded-xl bg-primary/10 px-3 py-1.5 font-mono text-sm font-bold text-primary"
                        : "rounded-xl bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {row.status === "PAID" ? row.code : row.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
