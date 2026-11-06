import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Car,
  GraduationCap,
  MapPin,
  Music2,
  Search,
  Store,
  Tag,
} from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { NotificationBell } from "@/components/refer/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { useRegion } from "@/lib/region-context";
import { TALENT_ROLES, useTalentProviders, type TalentRole } from "@/lib/talent.queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_browse/discover")({
  head: () => ({
    meta: [
      { title: "ASH Talent — Discover musicians" },
      { name: "description", content: "Discover music providers and explore ASH." },
    ],
  }),
  component: TalentPage,
});

function TalentPage() {
  const { tx, lang } = useI18n();
  const region = useRegion();
  const { location, request, busy } = useLocation();
  const [city, setCity] = useState("");
  const [role, setRole] = useState<TalentRole>("all");
  const [locationError, setLocationError] = useState(false);
  const providers = useTalentProviders(region.seesEverything ? null : region.country, city, role);

  const nearMe = async () => {
    setLocationError(false);
    const result = location ?? (await request());
    if (result?.label) setCity(result.label);
    else setLocationError(true);
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 pt-2 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">
            ASH Glo
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {tx("ASH Talent", "ASH Talent")}
          </h1>
        </div>
        <NotificationBell />
      </header>
      <section className="talent-hero overflow-hidden rounded-3xl p-5 text-white sm:p-8">
        <div className="grid size-10 place-items-center rounded-2xl bg-white/10">
          <Music2 className="size-5" aria-hidden />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
          {tx("Find musicians near you", "Trouvez des musiciens près de vous")}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-white/75">
          {tx(
            "Discover music providers and connect through their existing ASH profiles.",
            "Découvrez des prestataires musicaux et contactez-les sur ASH.",
          )}
        </p>
        <Button
          type="button"
          onClick={() => void nearMe()}
          disabled={busy}
          className="mt-4 rounded-full bg-white text-black hover:bg-white/90"
        >
          <MapPin className="size-4" aria-hidden />
          {busy
            ? tx("Finding your city…", "Recherche de votre ville…")
            : tx("Find musicians near me", "Musiciens près de moi")}
        </Button>
        {locationError ? (
          <p role="alert" className="mt-2 text-xs text-white">
            {tx(
              "Could not determine a nearby city. Enter a city below.",
              "Ville introuvable. Saisissez une ville ci-dessous.",
            )}
          </p>
        ) : null}
      </section>
      <section aria-label={tx("Find talent", "Trouver des talents")} className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder={tx("Filter by city", "Filtrer par ville")}
            aria-label={tx("Filter by city", "Filtrer par ville")}
            className="h-11 rounded-2xl pl-10"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setRole("all")}
            aria-pressed={role === "all"}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-xs font-bold",
              role === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card",
            )}
          >
            {tx("All", "Tout")}
          </button>
          {TALENT_ROLES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRole(item.id)}
              aria-pressed={role === item.id}
              className={cn(
                "shrink-0 rounded-full border px-3 py-2 text-xs font-bold",
                role === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card",
              )}
            >
              {lang === "fr" ? item.fr : item.en}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {tx(
            "Results are based on provider profiles and active service descriptions.",
            "Résultats basés sur les profils et les descriptions de services actifs.",
          )}
        </p>
        {providers.isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">
            {tx("Finding talent…", "Recherche de talents…")}
          </p>
        ) : providers.isError ? (
          <div role="alert" className="text-sm text-destructive">
            {tx("Could not load talent.", "Impossible de charger les talents.")}{" "}
            <button type="button" className="underline" onClick={() => void providers.refetch()}>
              {tx("Try again", "Réessayer")}
            </button>
          </div>
        ) : providers.data?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.data.map((provider) => (
              <article
                key={provider.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <Link
                  to="/services/$providerId"
                  params={{ providerId: provider.id }}
                  className="flex items-center gap-3"
                >
                  <Avatar
                    path={provider.avatar_url}
                    name={provider.business_name}
                    className="size-14"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-bold">
                      <span className="truncate">{provider.business_name}</span>
                      {provider.is_verified ? (
                        <BadgeCheck
                          className="size-4 shrink-0 text-primary"
                          aria-label={tx("Verified", "Vérifié")}
                        />
                      ) : null}
                    </span>
                    {provider.city ? (
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" aria-hidden />
                        {provider.city}
                      </span>
                    ) : null}
                  </span>
                </Link>
                {provider.bio ? (
                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{provider.bio}</p>
                ) : null}
                <Button asChild size="sm" className="mt-3 w-full rounded-full">
                  <Link to="/services/$providerId" params={{ providerId: provider.id }}>
                    {provider.accepting_bookings
                      ? tx("View profile & book", "Voir le profil et réserver")
                      : tx("View profile", "Voir le profil")}
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {tx(
              "No matching music providers found. Try another role or city.",
              "Aucun prestataire musical trouvé. Essayez un autre rôle ou une autre ville.",
            )}
          </p>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display font-bold">{tx("Opportunities", "Opportunités")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {tx(
            "Job postings and applications are coming soon.",
            "Les offres et candidatures arrivent bientôt.",
          )}
        </p>
        <Link to="/jobs" className="mt-2 inline-block text-xs font-bold text-primary">
          {tx("Explore ASH Jobs", "Explorer ASH Jobs")}
        </Link>
      </section>
      <section aria-labelledby="explore-ash-heading" className="space-y-3">
        <h2 id="explore-ash-heading" className="font-display text-xl font-bold">
          {tx("Explore ASH", "Explorer ASH")}
        </h2>
        <nav
          aria-label={tx("Explore ASH", "Explorer ASH")}
          className="grid grid-cols-3 gap-2 sm:grid-cols-6"
        >
          {[
            { href: "/services", label: tx("Services", "Services"), icon: Store },
            {
              href: "/property",
              label: tx("Properties & Land", "Immobilier et terrains"),
              icon: Building2,
            },
            { href: "/search?q=vehicles", label: tx("Vehicles", "Véhicules"), icon: Car },
            { href: "/deals", label: tx("Deals", "Offres"), icon: Tag },
            { href: "/events", label: tx("Events", "Événements"), icon: CalendarDays },
            { href: "/campus", label: tx("Courses", "Cours"), icon: GraduationCap },
          ].map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="discover-category flex min-h-24 flex-col justify-between rounded-2xl p-3 text-white"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-white/10">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-xs font-bold leading-tight">{label}</span>
            </a>
          ))}
        </nav>
      </section>
    </main>
  );
}
