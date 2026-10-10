import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarClock, Heart, Home, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PropertyCard } from "@/components/refer/PropertyCard";
import { PromoteDialog } from "@/components/refer/PromoteDialog";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import {
  openPropertyConversation,
  useMyProperties,
  useSavedProperties,
  useViewingRequests,
} from "@/lib/property.queries";
import { PROPERTY_STATUSES, categoryLabel, formatPropertyPrice } from "@/lib/property";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/property/manage")({
  head: () => ({
    meta: [
      { title: "My Property — listings, viewings and performance | ASH" },
      { name: "description", content: "Manage your ASH Property listings, respond to viewing requests and track views, saves and inquiries." },
      { property: "og:title", content: "My Property — ASH" },
      { property: "og:description", content: "Manage listings, viewing requests and property performance on ASH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageProperty,
});

type Tab = "LISTINGS" | "VIEWINGS" | "SAVED" | "ANALYTICS";

function ManageProperty() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("LISTINGS");

  async function chatAboutListing(listingId: string) {
    try {
      const conversationId = await openPropertyConversation(listingId);
      await navigate({ to: "/messages", search: { c: conversationId } });
    } catch {
      toast.error(tx("Could not open the chat.", "Impossible d’ouvrir la discussion."));
    }
  }


  const { data: mine, isLoading } = useMyProperties();
  const { data: incoming } = useViewingRequests("owner");
  const { data: outgoing } = useViewingRequests("requester");
  const { data: saved } = useSavedProperties();

  const totals = {
    listings: mine?.length ?? 0,
    active: mine?.filter((item) => item.status === "ACTIVE").length ?? 0,
    views: mine?.reduce((sum, item) => sum + item.view_count, 0) ?? 0,
    inquiries: mine?.reduce((sum, item) => sum + item.inquiry_count, 0) ?? 0,
    viewings: incoming?.length ?? 0,
  };

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("property_listings").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["property"] });
    toast.success(tx("Status updated.", "Statut mis à jour."));
  }

  async function respond(id: string, status: string, fallbackAt: string) {
    const { data, error } = await supabase.rpc("respond_property_viewing", {
      _viewing_id: id,
      _status: status,
      _note: "",
      _proposed_at: fallbackAt,
    });
    const payload = data as { ok?: boolean; error?: string } | null;
    if (error || !payload?.ok) {
      toast.error(payload?.error ?? error?.message ?? "FAILED");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["property"] });
    toast.success(tx("Response sent.", "Réponse envoyée."));
  }

  const TABS: Array<{ key: Tab; en: string; fr: string }> = [
    { key: "LISTINGS", en: "My listings", fr: "Mes annonces" },
    { key: "VIEWINGS", en: "Viewing requests", fr: "Demandes de visite" },
    { key: "SAVED", en: "Saved", fr: "Favoris" },
    { key: "ANALYTICS", en: "Analytics", fr: "Statistiques" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
            {tx("My Property", "Mes biens")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx("Listings, viewings and real performance.", "Annonces, visites et performances réelles.")}
          </p>
        </div>
        <Button asChild>
          <Link to="/property/new">
            <Plus className="size-4" aria-hidden />
            {tx("Add property", "Ajouter un bien")}
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: tx("Active listings", "Annonces actives"), value: totals.active },
          { label: tx("Views", "Vues"), value: totals.views },
          { label: tx("Inquiries", "Demandes"), value: totals.inquiries },
          { label: tx("Viewing requests", "Visites"), value: totals.viewings },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition-colors",
              tab === item.key ? "border-primary/60 bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            {tx(item.en, item.fr)}
          </button>
        ))}
      </div>

      {tab === "LISTINGS" ? (
        isLoading ? (
          <LoadingState />
        ) : totals.listings === 0 ? (
          <EmptyState
            icon={<Home className="size-5" aria-hidden />}
            title={tx("No listings yet", "Aucune annonce")}
            description={tx("Listing is free.", "Publier est gratuit.")}
            action={
              <Button asChild>
                <Link to="/property/new">{tx("List a property", "Publier")}</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {mine?.map((listing) => (
              <div key={listing.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/property/$listingId"
                      params={{ listingId: listing.id }}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {listing.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabel(listing.category, fr)} · {listing.city} ·{" "}
                      {formatPropertyPrice(listing.price, listing.currency, listing.price_period, fr)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {listing.view_count} {tx("views", "vues")} · {listing.inquiry_count}{" "}
                      {tx("inquiries", "demandes")} · {tx("expires", "expire le")}{" "}
                      {formatDateTime(listing.expires_at)}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold uppercase text-muted-foreground">
                    {listing.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={listing.status}
                    onChange={(event) => void setStatus(listing.id, event.target.value)}
                    className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
                    aria-label={tx("Status", "Statut")}
                  >
                    {PROPERTY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <PromoteDialog
                    targetType="PROPERTY"
                    targetId={listing.id}
                    defaultHeadline={listing.title}
                    city={listing.city}
                    category={listing.category}
                    trigger={
                      <Button variant="outline" size="sm">
                        {tx("Promote", "Promouvoir")}
                      </Button>
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {tab === "VIEWINGS" ? (
        <div className="space-y-4">
          <section>
            <h2 className="mb-2 text-sm font-bold text-foreground">
              {tx("Received", "Reçues")}
            </h2>
            {(incoming?.length ?? 0) === 0 ? (
              <EmptyState icon={<CalendarClock className="size-5" aria-hidden />} title={tx("No viewing requests", "Aucune demande")} />
            ) : (
              <div className="space-y-2">
                {incoming?.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
                    <p className="font-semibold text-foreground">{row.listing?.title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(row.requested_at)} · {row.status}
                    </p>
                    {row.message ? <p className="mt-2 text-sm text-muted-foreground">{row.message}</p> : null}
                    {row.status === "PENDING" ? (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => void respond(row.id, "ACCEPTED", row.requested_at)}>
                          {tx("Accept", "Accepter")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void respond(row.id, "DECLINED", row.requested_at)}>
                          {tx("Decline", "Refuser")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void (async () => {
                            const input = window.prompt(
                              tx("New date/time (YYYY-MM-DD HH:MM)", "Nouvelle date/heure (AAAA-MM-JJ HH:MM)"),
                            );
                            if (!input) return;
                            const when = new Date(input);
                            if (Number.isNaN(when.getTime())) {
                              toast.error(tx("Invalid date.", "Date invalide."));
                              return;
                            }
                            await respond(row.id, "RESCHEDULED", when.toISOString());
                          })()}>
                          {tx("Propose another time", "Proposer un autre créneau")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold text-foreground">{tx("Sent", "Envoyées")}</h2>
            {(outgoing?.length ?? 0) === 0 ? (
              <EmptyState icon={<CalendarClock className="size-5" aria-hidden />} title={tx("No viewings requested", "Aucune visite demandée")} />
            ) : (
              <div className="space-y-2">
                {outgoing?.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
                    <p className="font-semibold text-foreground">{row.listing?.title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(row.requested_at)} · {row.status}
                    </p>
                    {row.response_note ? (
                      <p className="mt-2 text-sm text-muted-foreground">{row.response_note}</p>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => void chatAboutListing(row.listing_id)}
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      {tx("Message owner", "Discuter avec le propriétaire")}
                    </Button>
                  </div>

                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === "SAVED" ? (
        (saved?.length ?? 0) === 0 ? (
          <EmptyState icon={<Heart className="size-5" aria-hidden />} title={tx("Nothing saved yet", "Aucun favori")} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {saved?.map((listing) => <PropertyCard key={listing.id} listing={listing} />)}
          </div>
        )
      ) : null}

      {tab === "ANALYTICS" ? (
        <section className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
              <BarChart3 className="size-4" aria-hidden />
              {tx("Property performance report", "Rapport de performance")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {tx("Real data from your own listings.", "Données réelles de vos annonces.")}
            </p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                [tx("Listings", "Annonces"), totals.listings],
                [tx("Active", "Actives"), totals.active],
                [tx("Total views", "Vues totales"), totals.views],
                [tx("Inquiries", "Demandes"), totals.inquiries],
                [tx("Viewing requests", "Visites demandées"), totals.viewings],
                [tx("Saved by users", "Enregistrements"), saved?.length ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                const rows = [
                  ["title", "status", "city", "price", "currency", "views", "inquiries", "expires_at"],
                  ...(mine ?? []).map((item) => [
                    item.title,
                    item.status,
                    item.city,
                    String(item.price),
                    item.currency,
                    String(item.view_count),
                    String(item.inquiry_count),
                    item.expires_at,
                  ]),
                ];
                const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
                const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                const link = document.createElement("a");
                link.href = url;
                link.download = "ash-property-report.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              {tx("Download report (CSV)", "Télécharger le rapport (CSV)")}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
