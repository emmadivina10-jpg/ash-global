import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Briefcase, CalendarDays, Home, Tag, Laptop, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type Card = {
  id: string;
  title: string;
  meta: string;
  to: string;
};

export type DiscoveryBlock = {
  id: "jobs" | "events" | "property" | "deals" | "freelance";
  title: string;
  hint: string;
  icon: typeof Briefcase;
  seeAll: string;
  cards: Card[];
};

/** Light-touch discovery data for the feed: listings the member can act on. */
export function useFeedDiscovery() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";

  return useQuery({
    queryKey: ["feed-discovery", fr],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DiscoveryBlock[]> => {
      const nowIso = new Date().toISOString();

      const [jobs, events, property, deals, freelance] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, title, company, city, employment_type")
          .eq("is_open", true)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("events")
          .select("id, title, city, starts_at, ticket_price, is_free")
          .eq("is_published", true)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(6),
        supabase
          .from("property_listings")
          .select("id, title, city, price, price_period, listing_kind")
          .eq("status", "ACTIVE")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("deals")
          .select("id, title, city, deal_price, original_price")
          .eq("is_active", true)
          .gte("ends_at", nowIso)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("freelance_projects")
          .select("id, title, budget, category, status")
          .eq("status", "OPEN")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const blocks: DiscoveryBlock[] = [];

      if (jobs.data?.length) {
        blocks.push({
          id: "jobs",
          icon: Briefcase,
          title: tx("Jobs hiring now", "Offres d'emploi"),
          hint: tx("Apply in-app in one tap", "Postulez en un clic depuis l'app"),
          seeAll: "/jobs",
          cards: jobs.data.map((job) => ({
            id: job.id,
            title: job.title,
            meta: [job.company, job.city, job.employment_type?.replace(/_/g, " ").toLowerCase()]
              .filter(Boolean)
              .join(" · "),
            to: "/jobs",
          })),
        });
      }

      if (events.data?.length) {
        blocks.push({
          id: "events",
          icon: CalendarDays,
          title: tx("Upcoming events", "Événements à venir"),
          hint: tx("Grab your ticket", "Réservez votre place"),
          seeAll: "/events",
          cards: events.data.map((event) => ({
            id: event.id,
            title: event.title,
            meta: [
              new Date(event.starts_at).toLocaleDateString(fr ? "fr-FR" : "en-GB", {
                day: "numeric",
                month: "short",
              }),
              event.city ?? "",
              event.is_free ? tx("Free", "Gratuit") : formatXAF(Number(event.ticket_price ?? 0)),
            ]
              .filter(Boolean)
              .join(" · "),
            to: "/events",
          })),
        });
      }

      if (property.data?.length) {
        blocks.push({
          id: "property",
          icon: Home,
          title: tx("Property listings", "Biens immobiliers"),
          hint: tx("To rent and to buy", "À louer et à vendre"),
          seeAll: "/property",
          cards: property.data.map((listing) => ({
            id: listing.id,
            title: listing.title,
            meta: [listing.city, formatXAF(Number(listing.price ?? 0))].filter(Boolean).join(" · "),
            to: "/property",
          })),
        });
      }

      if (deals.data?.length) {
        blocks.push({
          id: "deals",
          icon: Tag,
          title: tx("Deals near you", "Bons plans"),
          hint: tx("Limited-time offers", "Offres limitées"),
          seeAll: "/deals",
          cards: deals.data.map((deal) => ({
            id: deal.id,
            title: deal.title,
            meta: [deal.city, formatXAF(Number(deal.deal_price ?? 0))].filter(Boolean).join(" · "),
            to: "/deals",
          })),
        });
      }

      if (freelance.data?.length) {
        blocks.push({
          id: "freelance",
          icon: Laptop,
          title: tx("Freelance projects", "Missions freelance"),
          hint: tx("Send a proposal", "Envoyez une proposition"),
          seeAll: "/freelance",
          cards: freelance.data.map((project) => ({
            id: project.id,
            title: project.title,
            meta: [project.category, formatXAF(Number(project.budget ?? 0))]
              .filter(Boolean)
              .join(" · "),
            to: "/freelance",
          })),
        });
      }

      return blocks;
    },
  });
}

/** One calm, swipeable row of listings — designed to be easy to scroll past. */
export function DiscoveryRow({ block }: { block: DiscoveryBlock }) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const Icon = block.icon;

  return (
    <section className="tile overflow-hidden p-3">
      <div className="flex items-center gap-2.5 px-1 pb-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{block.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{block.hint}</p>
        </div>
        <Link
          to={block.seeAll}
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-primary"
        >
          {tx("See all", "Voir tout")}
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1">
        {block.cards.map((card) => (
          <Link
            key={card.id}
            to={card.to}
            className="w-[210px] shrink-0 snap-start rounded-2xl border border-border bg-background p-3 transition-transform hover:-translate-y-0.5"
          >
            <p className="line-clamp-2 text-sm font-semibold text-foreground">{card.title}</p>
            <p className="mt-1.5 line-clamp-1 text-[11px] text-muted-foreground">{card.meta}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
