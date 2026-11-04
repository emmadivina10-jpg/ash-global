import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  MessageCircle,
  Star,
  Store,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { useI18n } from "@/lib/i18n";
import { useMyBookings, useProviderReviews, useProviderServices } from "@/lib/marketplace.queries";
import {
  CAMPUS_COMMISSION_RATE,
  instructorTitle,
  useInstructorDetails,
  useInstructorEarnings,
  useMyCampusApplication,
  useMyInstructorProfile,
} from "@/lib/campus.queries";

export const Route = createFileRoute("/_authenticated/campus/teaching")({
  head: () => ({
    meta: [
      { title: "Instructor dashboard — ASH Campus" },
      {
        name: "description",
        content:
          "Your ASH Campus instructor profile, services, sessions, reviews and availability in one place.",
      },
      { property: "og:title", content: "Instructor dashboard — ASH Campus" },
      {
        property: "og:description",
        content: "Manage your ASH Campus teaching profile and sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachingDashboard,
});

function TeachingDashboard() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const { data: instructor, isLoading } = useMyInstructorProfile();
  const application = useMyCampusApplication();
  const details = useInstructorDetails(instructor?.id ?? "");
  const services = useProviderServices(instructor?.provider_id ?? undefined);
  const reviews = useProviderReviews(instructor?.provider_id ?? undefined);
  const bookings = useMyBookings();
  const earnings = useInstructorEarnings(instructor?.provider_id, instructor?.currency ?? "XAF");

  if (isLoading) return <LoadingState label={tx("Loading…", "Chargement…")} />;

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
          title={tx("Not an instructor yet", "Pas encore instructeur")}
          description={
            application.data
              ? fr
                ? `Statut de votre candidature : ${application.data.status.replaceAll("_", " ").toLowerCase()}.`
                : `Your application status: ${application.data.status.replaceAll("_", " ").toLowerCase()}.`
              : tx(
                  "Apply to teach on ASH Campus.",
                  "Envoyez votre candidature pour enseigner sur ASH Campus.",
                )
          }
          action={
            <Button asChild>
              <Link to="/campus/become-instructor">
                {tx("Become an Instructor", "Devenir instructeur")}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const sessions = (bookings.data ?? []) as {
    id: string;
    status: string;
    service_title?: string;
    scheduled_at?: string;
  }[];
  const upcoming = sessions.filter((item) =>
    ["PENDING", "CONFIRMED", "ACCEPTED"].includes(item.status),
  );
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
          {instructorTitle(instructor.instructor_types, fr)}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-foreground">
          {instructor.display_name}
        </h1>
        <p className="text-sm text-muted-foreground">{instructor.headline}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">
            {instructor.subjects.length} {tx("subjects", "matières")}
          </Badge>
          <Badge variant="outline">
            {details.data?.availability.length ?? 0} {tx("time slots", "créneaux")}
          </Badge>
          <Badge variant="outline">
            {instructor.is_active ? tx("Visible", "Visible") : tx("Hidden", "Masqué")}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/campus/instructors/$instructorId" params={{ instructorId: instructor.id }}>
              {tx("View public profile", "Voir mon profil public")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/studio">
              <Store className="size-4" aria-hidden />
              {tx("Manage services", "Gérer mes services")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/messages">
              <MessageCircle className="size-4" aria-hidden />
              {tx("Messages", "Messages")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/wallet">
              <Wallet className="size-4" aria-hidden />
              {tx("Wallet", "Portefeuille")}
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label={tx("Upcoming sessions", "Séances à venir")}
          value={upcoming.length}
          icon={CalendarDays}
        />
        <Stat
          label={tx("Completed sessions", "Séances terminées")}
          value={completed.length}
          icon={CalendarDays}
        />
        <Stat label={tx("Reviews", "Avis")} value={reviews.data?.length ?? 0} icon={Star} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-base font-bold text-foreground">
          {tx("Earnings", "Gains")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <Money
            label={tx("Gross revenue", "Revenu brut")}
            value={earnings.data?.gross ?? 0}
            currency={instructor.currency}
          />
          <Money
            label={tx("ASH commission (10%)", "Commission ASH (10 %)")}
            value={earnings.data?.commission ?? 0}
            currency={instructor.currency}
          />
          <Money
            label={tx("Your earnings", "Vos gains")}
            value={earnings.data?.net ?? 0}
            currency={instructor.currency}
          />
          <Money
            label={tx("Pending", "En attente")}
            value={earnings.data?.pending ?? 0}
            currency={instructor.currency}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {fr
            ? `L'inscription, la candidature, la vérification et la publication de services sont gratuites. ASH prélève ${Math.round(CAMPUS_COMMISSION_RATE * 100)} % sur chaque séance terminée, calculé côté serveur. Les gains disponibles se retirent depuis le portefeuille ASH.`
            : `Registration, application, verification and listing services are free. ASH takes ${Math.round(CAMPUS_COMMISSION_RATE * 100)}% of each completed session, calculated server-side. Available earnings are withdrawn from your ASH wallet.`}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-base font-bold text-foreground">
          {tx("My services", "Mes services")}
        </h2>
        {!instructor.provider_id ? (
          <p className="text-sm text-muted-foreground">
            {tx(
              "Create your provider space in Studio first to publish services and accept bookings.",
              "Créez d'abord votre espace prestataire dans le Studio pour publier des services et accepter des réservations.",
            )}
          </p>
        ) : !services.data?.length ? (
          <p className="text-sm text-muted-foreground">
            {tx("No services published yet.", "Aucun service publié pour l'instant.")}
          </p>
        ) : (
          <ul className="space-y-2">
            {services.data.map((service: { id: string; title: string; price: number }) => (
              <li
                key={service.id}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"
              >
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
        {tx(
          "Payments, bookings and earnings run through the existing ASH infrastructure. All amounts are calculated server-side.",
          "Les paiements, réservations et gains passent par l'infrastructure ASH existante. Les montants sont calculés côté serveur.",
        )}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof CalendarDays;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="size-4 text-primary" aria-hidden />
      <p className="mt-2 font-display text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Money({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-extrabold text-foreground">
        {value.toLocaleString()} {currency}
      </p>
    </div>
  );
}
