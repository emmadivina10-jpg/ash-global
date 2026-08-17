import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Scissors, Search, Sparkle } from "lucide-react";
import { useProviders, useProvidersPortfolio } from "@/lib/marketplace.queries";
import { ProviderCard } from "@/components/refer/ProviderCard";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORY_KEY, SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/marketplace";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/services/")({
  head: () => ({
    meta: [
      { title: "Book a braider, nail or lash pro — ASH Glo REFER" },
      {
        name: "description",
        content: "Browse verified braiders, nail and lash technicians, see their work, book a slot and chat live.",
      },
      { property: "og:title", content: "Book a braider, nail or lash pro — ASH Glo REFER" },
      { property: "og:description", content: "Discover beauty pros near you, view their portfolio and book instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { t } = useI18n();
  const { data: providers, isLoading } = useProviders();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "ALL">("ALL");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (providers ?? []).filter((p) => {
      const matchesCategory = category === "ALL" || (p.categories ?? []).includes(category);
      const matchesTerm =
        term.length === 0 ||
        p.business_name.toLowerCase().includes(term) ||
        (p.city ?? "").toLowerCase().includes(term) ||
        (p.bio ?? "").toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [providers, search, category]);

  const { data: photosByProvider } = useProvidersPortfolio(filtered.map((p) => p.id));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{t("svc.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("svc.subtitle")}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/studio">
            <Sparkle className="size-4" aria-hidden />
            {t("svc.becomePro")}
          </Link>
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("svc.search")}
          className="pl-9"
          aria-label={t("svc.search")}
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(["ALL", ...SERVICE_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c as ServiceCategory | "ALL")}
            className={cn(
              "shrink-0 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              category === c ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {c === "ALL" ? t("svc.all") : t(CATEGORY_KEY[c as ServiceCategory])}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("svc.empty")}
          description={t("svc.emptyCopy")}
          icon={<Scissors className="size-5" aria-hidden />}
          action={
            <Button asChild>
              <Link to="/studio">{t("svc.becomePro")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} photos={photosByProvider?.[provider.id] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
