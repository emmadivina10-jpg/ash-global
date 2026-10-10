import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Plus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { claimDeal } from "@/lib/commerce.functions";
import { discountPercent, useDeals, useMyClaims, useMyDeals } from "@/lib/ash.queries";
import { PromoteDialog } from "@/components/refer/PromoteDialog";
import { ComingSoon } from "@/components/refer/ComingSoon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { formatDateTime, formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useTrackView } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/deals")({
  head: () => ({
    meta: [
      { title: "ASH Deals — Coming soon" },
      { name: "description", content: "Deals are coming soon to ASH Glo. Offers are not claimable yet." },
      { property: "og:title", content: "ASH Deals — Coming soon" },
      { property: "og:description", content: "Limited-time offers from businesses near you are on the way." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DealsSoon,
});

// Deals are blocked behind a coming soon screen. Point this route back at
// DealsPage to re-enable the feature.
function DealsSoon() {
  return (
    <ComingSoon
      icon={Flame}
      eyebrow="ASH DEALS"
      titleEn="Deals"
      titleFr="Offres"
      bodyEn="Limited-time offers from businesses and service providers near you are on the way to ASH."
      bodyFr="Les offres à durée limitée des commerces et prestataires près de vous arrivent bientôt sur ASH."
      features={[
        { icon: Ticket, en: "Claim offers in one tap", fr: "Réclamez une offre en un geste" },
        { icon: Flame, en: "Redeem with your ASH code", fr: "Utilisez votre code ASH en magasin" },
      ]}
    />
  );
}

function DealsPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const claim = useServerFn(claimDeal);
  const deals = useDeals();
  const mine = useMyDeals();
  const claims = useMyClaims();

  useTrackView({ event_type: "view", surface: "deals", target_type: "deals_page" });
  const [pending, setPending] = useState<string | null>(null);

  async function onClaim(dealId: string) {
    setPending(dealId);
    try {
      const result = await claim({ data: { dealId } });
      if (!result.ok) {
        toast.error(
          result.error === "SOLD_OUT"
            ? tx("This deal is sold out.", "Cette offre est épuisée.")
            : result.error === "EXPIRED"
              ? tx("This deal has ended.", "Cette offre est terminée.")
              : tx("Could not claim this deal.", "Impossible de réclamer l'offre."),
        );
        return;
      }
      toast.success(`${tx("Code", "Code")} ${result.code}`, {
        description: tx("Show this code to the business.", "Montrez ce code au commerçant."),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deals"] }),
        queryClient.invalidateQueries({ queryKey: ["deal-claims"] }),
      ]);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {tx("ASH Deals", "Bons plans ASH")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx("Limited-time offers from businesses and providers near you.", "Offres limitées des commerces et prestataires près de vous.")}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/create">
            <Plus className="size-4" aria-hidden />
            {tx("Create a deal", "Créer une offre")}
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">{tx("Live", "En cours")}</TabsTrigger>
          <TabsTrigger value="claims">{tx("My codes", "Mes codes")}</TabsTrigger>
          <TabsTrigger value="mine">{tx("My deals", "Mes offres")}</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          {deals.isLoading ? (
            <LoadingState label={tx("Loading deals…", "Chargement des offres…")} />
          ) : (deals.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Flame className="size-5" aria-hidden />}
              title={tx("No live deals yet", "Aucune offre pour l'instant")}
              description={tx("Be the first business to publish an offer.", "Soyez le premier commerce à publier une offre.")}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(deals.data ?? []).map((deal) => {
                const off = discountPercent(deal);
                const left = Math.max(0, deal.claim_limit - deal.claimed_count);
                return (
                  <article key={deal.id} className="tile flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-foreground">{deal.title}</h2>
                        <p className="text-xs text-muted-foreground">
                          {deal.city ?? deal.country} · {tx("until", "jusqu'au")} {formatDateTime(deal.ends_at)}
                        </p>
                      </div>
                      {off > 0 ? (
                        <span className="brand-gradient shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold text-on-dark">
                          -{off}%
                        </span>
                      ) : null}
                    </div>

                    {deal.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{deal.description}</p>
                    ) : null}

                    <div className="flex items-end gap-2">
                      <span className="font-display text-xl font-extrabold text-foreground">{formatXAF(deal.deal_price)}</span>
                      {off > 0 ? (
                        <span className="text-sm text-muted-foreground line-through">{formatXAF(deal.original_price)}</span>
                      ) : null}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {left} {tx("left", "restant(s)")}
                      </span>
                      <Button size="sm" disabled={pending === deal.id || left === 0} onClick={() => void onClaim(deal.id)}>
                        {tx("Claim deal", "Réclamer")}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          {(claims.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Ticket className="size-5" aria-hidden />}
              title={tx("No claimed codes", "Aucun code réclamé")}
              description={tx("Claim a deal to get your redemption code.", "Réclamez une offre pour obtenir votre code.")}
            />
          ) : (
            <ul className="space-y-3">
              {(claims.data ?? []).map((row: any) => (
                <li key={row.id} className="tile flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{row.deal?.title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(row.claimed_at)}</p>
                  </div>
                  <span className="rounded-xl bg-primary/10 px-3 py-1.5 font-mono text-sm font-bold text-primary">{row.code}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          {(mine.data ?? []).length === 0 ? (
            <EmptyState
              title={tx("You have not published a deal", "Vous n'avez publié aucune offre")}
              description={tx("Deals bring customers back every single day.", "Les offres attirent les clients qui reviennent chaque jour.")}
              action={
                <Button asChild>
                  <Link to="/create">{tx("Create a deal", "Créer une offre")}</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {(mine.data ?? []).map((deal) => (
                <li key={deal.id} className="tile flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {deal.claimed_count}/{deal.claim_limit} {tx("claimed", "réclamés")} · {formatXAF(deal.deal_price)}
                    </p>
                  </div>
                  <PromoteDialog targetType="DEAL" targetId={deal.id} defaultHeadline={deal.title} city={deal.city} category={deal.category} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
