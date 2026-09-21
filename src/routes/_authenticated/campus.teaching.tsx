import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, CalendarDays, MessageCircle, Star, Store, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { useI18n } from "@/lib/i18n";
import { useMyBookings, useProviderReviews, useProviderServices } from "@/lib/marketplace.queries";
import { useInstructorDetails, useMyCampusApplication, useMyInstructorProfile } from "@/lib/campus.queries";

export const Route = createFileRoute("/_authenticated/campus/teaching")({
  head: () => ({
    meta: [
      { title: "Instructor dashboard — ASH Campus" },
      { name: "description", content: "Your ASH Campus instructor profile, services, sessions, reviews and availability in one place." },
      { property: "og:title", content: "Instructor dashboard — ASH Campus" },
      { property: "og:description", content: "Manage your ASH Campus teaching profile and sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachingDashboard,
});

function TeachingDashboard() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { data: instructor, isLoading } = useMyInstructorProfile();
  const application = useMyCampusApplication();
  const details = useInstructorDetails(instructor?.id ?? "");
  const services = useProviderServices(instructor?.provider_id ?? undefined);
  const reviews = useProviderReviews(instructor?.provider_id ?? undefined);
  const bookings = useMyBookings();

  if (isLoading) return <LoadingState label={fr ? "Chargement…" : "Loading…"} />;

  if (!instructor) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/campus">
            <ArrowLeft className="size-4" aria-hidden />
            ASH Campus
          </Link>
        </Button>
        <EmptyState
          title={fr ? "Pas encore instructeur" : "Not an instructor yet"}
          description={
            application.data
              ? fr
                ? `Statut de votre candidature : ${application.data.status.replaceAll("_", " ").toLowerCase()}.`
                : `Your application status: ${application.data.status.replaceAll("_", " ").toLowerCase()}.`
              : fr
                ? "Envoyez votre candidature pour enseigner sur ASH Campus."
                : "Apply to teach on ASH Campus."
          }
          action={
            <Button asChild>
              <Link to="/campus/become-instructor">{fr ? "Devenir instructeur" : "Become an Instructor"}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const sessions = (bookings.data ?? []) as { id: string; status: string; service_title?: string; scheduled_at?: string }[];
  const upcoming = sessions.filter((item) => ["PENDING", "CONFIRMED", "ACCEPTED"].includes(item.status));
  const completed = sessions.filter((item) => item.status === "COMPLETED");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/campus">
          <ArrowLeft className="size-4" aria-hidden />
          ASH Campus
        </Link>
      </Button>

      <header className="rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary">
          <BadgeCheck className="size-3.5" aria-hidden />
          {fr ? "Instructeur vérifié ASH" : "ASH Verified Instructor"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-foreground">{instructor.display_name}</h1>
        <p className="text-sm text-muted-foreground">{instructor.headline}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">
            {instructor.subjects.length} {fr ? "matières" : "subjects"}
          </Badge>
          <Badge variant="outline">
            {details.data?.availability.length ?? 0} {fr ? "créneaux" : "time slots"}
          </Badge>
          <Badge variant="outline">{instructor.is_active ? (fr ? "Visible" : "Visible") : fr ? "Masqué" : "Hidden"}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/campus/instructors/$instructorId" params={{ instructorId: instructor.id }}>
              {fr ? "Voir mon profil public" : "View public profile"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/studio">
              <Store className="size-4" aria-hidden />
              {fr ? "Gérer mes services" : "Manage services"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/messages">
              <MessageCircle className="size-4" aria-hidden />
              {fr ? "Messages" : "Messages"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/wallet">
              <Wallet className="size-4" aria-hidden />
              {fr ? "Portefeuille" : "Wallet"}
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={fr ? "Séances à venir" : "Upcoming sessions"} value={upcoming.length} icon={CalendarDays} />
        <Stat label={fr ? "Séances terminées" : "Completed sessions"} value={completed.length} icon={CalendarDays} />
        <Stat label={fr ? "Avis" : "Reviews"} value={reviews.data?.length ?? 0} icon={Star} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-base font-bold text-foreground">{fr ? "Mes services" : "My services"}</h2>
        {!instructor.provider_id ? (
          <p className="text-sm text-muted-foreground">
            {fr
              ? "Créez d'abord votre espace prestataire dans le Studio pour publier des services et accepter des réservations."
              : "Create your provider space in Studio first to publish services and accept bookings."}
          </p>
        ) : !services.data?.length ? (
          <p className="text-sm text-muted-foreground">
            {fr ? "Aucun service publié pour l'instant." : "No services published yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {services.data.map((service: { id: string; title: string; price: number }) => (
              <li key={service.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <span className="font-semibold text-foreground">{service.title}</span>
                <span className="text-muted-foreground">
                  {service.price} {instructor.currency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        {fr
          ? "Les paiements, réservations et gains passent par l'infrastructure ASH existante. Les montants sont calculés côté serveur."
          : "Payments, bookings and earnings run through the existing ASH infrastructure. All amounts are calculated server-side."}
      </p>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CalendarDays }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="size-4 text-primary" aria-hidden />
      <p className="mt-2 font-display text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
