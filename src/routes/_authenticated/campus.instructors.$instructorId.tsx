import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Flag,
  MapPin,
  MessageCircle,
  Star,
  Store,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/refer/AvatarUpload";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { RatingStars } from "@/components/refer/RatingStars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { ReportDialog } from "@/components/refer/ReportDialog";
import { openMemberConversation } from "@/lib/contact-vendor";
import { useI18n } from "@/lib/i18n";
import { useProviderReviews, useProviderServices } from "@/lib/marketplace.queries";
import { useSendFriendRequest } from "@/lib/social.queries";
import {
  instructorTitle,
  languageLevelLabel,
  levelLabel,
  modeLabel,
  trackInstructorView,
  useInstructor,
  useInstructorDetails,
} from "@/lib/campus.queries";
import { providerTimeZone, zoneLabel } from "@/lib/timezone";

export const Route = createFileRoute("/_authenticated/campus/instructors/$instructorId")({
  head: () => ({
    meta: [
      { title: "Instructor profile — ASH Campus" },
      {
        name: "description",
        content:
          "Qualifications, subjects, availability, services and reviews for an ASH Campus instructor.",
      },
      { property: "og:title", content: "Instructor profile — ASH Campus" },
      {
        property: "og:description",
        content: "See an ASH instructor's subjects, experience, availability and services.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstructorProfilePage,
});

const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function InstructorProfilePage() {
  const { instructorId } = Route.useParams();
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const { data: instructor, isLoading } = useInstructor(instructorId);
  const { data: details } = useInstructorDetails(instructorId);
  const services = useProviderServices(instructor?.provider_id ?? undefined);
  const reviews = useProviderReviews(instructor?.provider_id ?? undefined);
  const follow = useSendFriendRequest();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (instructor) trackInstructorView(instructor.id, instructor.subjects);
  }, [instructor]);

  if (isLoading) return <LoadingState label={tx("Loading profile…", "Chargement du profil…")} />;
  if (!instructor) {
    return (
      <EmptyState
        title={tx("Instructor not found", "Instructeur introuvable")}
        description={tx("This profile is no longer available.", "Ce profil n'est plus disponible.")}
        action={
          <Button asChild>
            <Link to="/campus/instructors">{tx("Back to instructors", "Retour")}</Link>
          </Button>
        }
      />
    );
  }

  const name = instructor.profile?.full_name || instructor.display_name;

  async function message() {
    if (!instructor) return;
    setBusy(true);
    try {
      const conversationId = await openMemberConversation(instructor.user_id);
      if (!conversationId) throw new Error("Could not open the conversation.");
      void navigate({ to: "/messages", search: { c: conversationId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the conversation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/campus/instructors">
          <ArrowLeft className="size-4" aria-hidden />
          {tx("Instructors", "Instructeurs")}
        </Link>
      </Button>

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap gap-4">
          <Avatar path={instructor.profile?.avatar_url} name={name} className="size-20" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary">
              <BadgeCheck className="size-3.5" aria-hidden />
              {instructorTitle(instructor.instructor_types, fr)}
            </p>
            <h1 className="mt-0.5 flex min-w-0 items-center gap-1 font-display text-2xl font-extrabold text-foreground">
              <span className="truncate">{name}</span>
              <VerifiedBadge
                tier={instructor.profile?.verified_tier ?? null}
                until={instructor.profile?.verified_until ?? null}
                size={16}
              />
            </h1>
            {instructor.headline ? (
              <p className="text-sm text-muted-foreground">{instructor.headline}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {instructor.city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" aria-hidden />
                  {instructor.city}
                  {instructor.country ? `, ${instructor.country}` : ""}
                </span>
              ) : null}
              {instructor.languages.length ? <span>{instructor.languages.join(" • ")}</span> : null}
              {instructor.teaching_modes.length ? (
                <span>
                  {instructor.teaching_modes.map((mode) => modeLabel(mode, fr)).join(" • ")}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {instructor.bio ? (
          <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">{instructor.bio}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void message()} disabled={busy}>
            <MessageCircle className="size-4" aria-hidden />
            {tx("Message", "Message")}
          </Button>
          {instructor.provider_id ? (
            <Button asChild variant="outline">
              <Link to="/services/$providerId" params={{ providerId: instructor.provider_id }}>
                <CalendarDays className="size-4" aria-hidden />
                {tx("Book a Session", "Réserver une séance")}
              </Link>
            </Button>
          ) : null}
          {instructor.provider_id ? (
            <Button asChild variant="outline">
              <Link to="/services/$providerId" params={{ providerId: instructor.provider_id }}>
                <Store className="size-4" aria-hidden />
                {tx("View Services", "Voir les services")}
              </Link>
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={follow.isPending}
            onClick={() =>
              follow.mutate(instructor.user_id, {
                onSuccess: () => toast.success(tx("Request sent.", "Demande envoyée.")),
                onError: (error) =>
                  toast.error(
                    error instanceof Error ? error.message : "Could not send the request.",
                  ),
              })
            }
          >
            <UserPlus className="size-4" aria-hidden />
            {tx("Follow", "Suivre")}
          </Button>
          <ReportDialog targetType="USER" targetUserId={instructor.user_id} targetLabel={name} />
        </div>
      </section>

      <Section title={tx("What is taught", "Ce qui est enseigné")}>
        <div className="flex flex-wrap gap-2">
          {instructor.years_experience > 0 ? (
            <Badge variant="outline">
              {instructor.years_experience} {tx("years experience", "ans d'expérience")}
            </Badge>
          ) : null}
          {instructor.exams.map((exam) => (
            <Badge key={exam} variant="outline">
              {exam} {tx("Preparation", "— préparation")}
            </Badge>
          ))}
          {instructor.subjects.map((subject) => (
            <Badge key={subject} variant="outline">
              {subject}
            </Badge>
          ))}
          {instructor.skills.map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
          {instructor.levels.map((level) => (
            <Badge key={level} variant="outline">
              {levelLabel(level, fr)}
            </Badge>
          ))}
        </div>
        {instructor.language_levels?.length ? (
          <div className="mt-3 space-y-1">
            {instructor.languages.map((language) => {
              const levels = instructor.language_levels
                .filter((entry) => entry.language === language)
                .map((entry) => languageLevelLabel(String(entry.level ?? ""), fr));
              if (!levels.length) return null;
              return (
                <p key={language} className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{language}</span> —{" "}
                  {levels.join(", ")}
                </p>
              );
            })}
          </div>
        ) : null}
        {instructor.exams.length ? (
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {tx(
              "This instructor offers independent preparation. They are not affiliated with, endorsed by or certified by the organisation that administers these examinations.",
              "Cet instructeur propose une préparation indépendante. Il n'est ni affilié, ni approuvé, ni certifié par l'organisme qui administre ces examens.",
            )}
          </p>
        ) : null}
      </Section>

      <Section title={tx("Qualifications", "Qualifications")}>
        {!details?.qualifications.length ? (
          <p className="text-sm text-muted-foreground">
            {tx("No qualifications published.", "Aucune qualification publiée.")}
          </p>
        ) : (
          <ul className="space-y-2">
            {details.qualifications.map((item) => (
              <li key={item.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.institution, item.completed_year ?? ""].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={tx("Teaching", "Enseignement")}>
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {instructor.methodology || tx("No teaching method provided.", "Méthode non renseignée.")}
        </p>
        {instructor.areas_served ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {tx("Areas served: ", "Zones couvertes : ")}
            {instructor.areas_served}
          </p>
        ) : null}
      </Section>

      <Section title={tx("Availability", "Disponibilités")}>
        <p className="mb-2 text-xs text-muted-foreground">
          {tx("Instructor's time zone: ", "Fuseau de l'instructeur : ")}
          {zoneLabel(instructor.timezone || providerTimeZone(instructor.country))} ·{" "}
          {tx("Your time zone: ", "Votre fuseau : ")}
          {zoneLabel(Intl.DateTimeFormat().resolvedOptions().timeZone)}
        </p>
        {!details?.availability.length ? (
          <p className="text-sm text-muted-foreground">
            {tx("No availability published.", "Aucune disponibilité publiée.")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {details.availability.map((slot) => (
              <Badge key={slot.id} variant="outline">
                {(fr ? DAYS_FR : DAYS_EN)[slot.day_of_week]} ·{" "}
                {slot.part_of_day === "MORNING"
                  ? tx("Morning", "Matin")
                  : slot.part_of_day === "AFTERNOON"
                    ? tx("Afternoon", "Après-midi")
                    : tx("Evening", "Soir")}
              </Badge>
            ))}
          </div>
        )}
      </Section>

      <Section title={tx("Services", "Services")}>
        {!instructor.provider_id || !services.data?.length ? (
          <p className="text-sm text-muted-foreground">
            {tx("No services published yet.", "Aucun service publié pour l'instant.")}
          </p>
        ) : (
          <ul className="space-y-2">
            {services.data.map(
              (service: {
                id: string;
                title: string;
                price: number;
                duration_minutes?: number;
              }) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {service.title}
                    </span>
                    {service.duration_minutes ? (
                      <span className="block text-xs text-muted-foreground">
                        {service.duration_minutes} min
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {service.price} {instructor.currency}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </Section>

      <Section title={tx("Reviews", "Avis")}>
        {!reviews.data?.length ? (
          <p className="text-sm text-muted-foreground">
            {tx(
              "No reviews yet. Reviews come only from completed sessions.",
              "Aucun avis pour l'instant. Les avis proviennent uniquement de séances terminées.",
            )}
          </p>
        ) : (
          <ul className="space-y-3">
            {reviews.data.map(
              (review: { id: string; rating: number; comment: string | null; author: string }) => (
                <li key={review.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <RatingStars value={review.rating} />
                    <span className="text-xs font-semibold text-foreground">{review.author}</span>
                  </div>
                  {review.comment ? (
                    <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        )}
      </Section>

      <p className="flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        <Star className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        {tx(
          "“ASH Verified Instructor” means the ASH team reviewed the application and submitted documents. ASH does not perform criminal background checks, government verification or professional licensing checks.",
          "« Instructeur vérifié ASH » signifie que l'équipe ASH a examiné la candidature et les documents fournis. ASH ne réalise pas de vérification d'antécédents judiciaires, de contrôle gouvernemental ni de licence professionnelle.",
        )}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 font-display text-base font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
