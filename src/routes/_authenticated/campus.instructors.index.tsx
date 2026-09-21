import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Baby, MapPin, Search, Star, UserPlus } from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { useI18n } from "@/lib/i18n";
import {
  CAMPUS_LEVELS,
  CAMPUS_MODES,
  levelLabel,
  modeLabel,
  useCampusSubjects,
  useInstructors,
  type CampusInstructor,
} from "@/lib/campus.queries";

export const Route = createFileRoute("/_authenticated/campus/instructors/")({
  head: () => ({
    meta: [
      { title: "Find an Instructor — ASH Campus" },
      {
        name: "description",
        content:
          "Connect with ASH instructors for mathematics, sciences, languages, technology, engineering and professional skills, online or in person.",
      },
      { property: "og:title", content: "Find an Instructor — ASH Campus" },
      { property: "og:description", content: "Search ASH instructors by subject, level, language, location and teaching mode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FindInstructorPage,
});

function FindInstructorPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [term, setTerm] = useState("");
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState("");
  const [city, setCity] = useState("");
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState<"relevance" | "experience" | "price">("relevance");
  const [parentMode, setParentMode] = useState(false);
  const subjects = useCampusSubjects();

  const filters = useMemo(
    () => ({ term, level, mode, city, language, sort }),
    [term, level, mode, city, language, sort],
  );
  const { data, isLoading } = useInstructors(filters);

  const examples = (subjects.data ?? []).slice(0, 8).map((s) => (fr ? s.name_fr : s.name_en));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/campus">
            <ArrowLeft className="size-4" aria-hidden />
            {fr ? "ASH Campus" : "ASH Campus"}
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
          {fr ? "Trouver un instructeur" : "Find an Instructor"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fr
            ? "Trouvez des instructeurs qui peuvent vous aider à apprendre, progresser et atteindre vos objectifs."
            : "Connect with instructors who can help you learn, improve and achieve your goals."}
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={fr ? "Que voulez-vous apprendre ?" : "What do you want to learn?"}
            className="pl-9"
          />
        </div>
        {examples.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setTerm(example)}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={level} onChange={setLevel} label={fr ? "Niveau" : "Level"}>
            <option value="">{fr ? "Tous les niveaux" : "All levels"}</option>
            {CAMPUS_LEVELS.map((item) => (
              <option key={item} value={item}>
                {levelLabel(item, fr)}
              </option>
            ))}
          </Select>
          <Select value={mode} onChange={setMode} label={fr ? "Format" : "Teaching mode"}>
            <option value="">{fr ? "En ligne et présentiel" : "Online and in-person"}</option>
            {CAMPUS_MODES.map((item) => (
              <option key={item} value={item}>
                {modeLabel(item, fr)}
              </option>
            ))}
          </Select>
          <Select value={language} onChange={setLanguage} label={fr ? "Langue" : "Language"}>
            <option value="">{fr ? "Toutes les langues" : "All languages"}</option>
            <option value="English">English</option>
            <option value="French">Français</option>
          </Select>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {fr ? "Ville" : "City"}
            </p>
            <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder={fr ? "Ville" : "City"} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["relevance", "experience", "price"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSort(option)}
              className={
                "rounded-full border px-3 py-1 text-xs font-bold transition-colors " +
                (sort === option
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {option === "relevance"
                ? fr
                  ? "Pertinence"
                  : "Relevance"
                : option === "experience"
                  ? fr
                    ? "Expérience"
                    : "Experience"
                  : fr
                    ? "Prix"
                    : "Price"}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setParentMode((current) => !current)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
      >
        <Baby className="size-5 shrink-0 text-primary" aria-hidden />
        <span>
          <span className="block text-sm font-bold text-foreground">
            {fr ? "Vous cherchez un instructeur pour votre enfant ?" : "Looking for an instructor for your child?"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {fr
              ? "Choisissez le niveau, la matière et le format — le parent reste titulaire du compte."
              : "Choose the level, subject and format — the parent stays the account holder."}
          </span>
        </span>
      </button>

      {parentMode ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={level} onChange={setLevel} label={fr ? "Niveau de l'enfant" : "Child's education level"}>
              <option value="">{fr ? "Choisir un niveau" : "Select a level"}</option>
              {CAMPUS_LEVELS.map((item) => (
                <option key={item} value={item}>
                  {levelLabel(item, fr)}
                </option>
              ))}
            </Select>
            <Select value={mode} onChange={setMode} label={fr ? "Format" : "Format"}>
              <option value="">{fr ? "En ligne et présentiel" : "Online and in-person"}</option>
              {CAMPUS_MODES.map((item) => (
                <option key={item} value={item}>
                  {modeLabel(item, fr)}
                </option>
              ))}
            </Select>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {fr
              ? "Pour un élève mineur, le parent ou tuteur garde la réservation, le paiement, la communication principale et les avis. Les enfants ne doivent pas contacter directement un instructeur."
              : "Where the learner is a minor, the parent or guardian keeps the booking, payment, main communication and reviews. Children should not contact an instructor directly."}
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState label={fr ? "Chargement des instructeurs…" : "Loading instructors…"} />
      ) : !data?.length ? (
        <EmptyState
          title={fr ? "Aucun instructeur pour l'instant" : "No instructors yet"}
          description={
            fr
              ? "Aucun instructeur approuvé ne correspond encore à cette recherche. Revenez bientôt ou proposez votre candidature."
              : "No approved instructor matches this search yet. Check back soon, or apply to teach."
          }
          icon={<UserPlus className="size-5" aria-hidden />}
          action={
            <Button asChild>
              <Link to="/campus/become-instructor">{fr ? "Devenir instructeur" : "Become an Instructor"}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {data.map((instructor) => (
            <InstructorCard key={instructor.id} instructor={instructor} fr={fr} />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
      >
        {children}
      </select>
    </div>
  );
}

function InstructorCard({ instructor, fr }: { instructor: CampusInstructor; fr: boolean }) {
  const name = instructor.profile?.full_name || instructor.display_name;
  const rating = instructor.rating_count ? instructor.rating_avg : null;
  return (
    <Link
      to="/campus/instructors/$instructorId"
      params={{ instructorId: instructor.id }}
      className="block w-full rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex gap-3">
        <Avatar path={instructor.profile?.avatar_url} name={name} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary">
            <BadgeCheck className="size-3.5" aria-hidden />
            {fr ? "Instructeur vérifié ASH" : "ASH Verified Instructor"}
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 font-display text-base font-bold text-foreground">
            <span className="truncate">{name}</span>
            <VerifiedBadge
              tier={instructor.profile?.verified_tier ?? null}
              until={instructor.profile?.verified_until ?? null}
              size={14}
            />
          </p>
          {instructor.profile?.username ? (
            <p className="text-xs text-muted-foreground">@{instructor.profile.username}</p>
          ) : null}
          {instructor.subjects.length ? (
            <p className="mt-1 text-sm font-medium text-foreground">{instructor.subjects.join(" • ")}</p>
          ) : null}
          {instructor.levels.length ? (
            <p className="text-xs text-muted-foreground">
              {instructor.levels.map((level) => levelLabel(level, fr)).join(" • ")}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {instructor.teaching_modes.length ? (
              <span>{instructor.teaching_modes.map((mode) => modeLabel(mode, fr)).join(" • ")}</span>
            ) : null}
            {instructor.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden />
                {instructor.city}
                {instructor.country ? `, ${instructor.country}` : ""}
              </span>
            ) : null}
            {rating ? (
              <span className="inline-flex items-center gap-1 text-foreground">
                <Star className="size-3 fill-gold text-gold" aria-hidden />
                {rating.toFixed(1)}
                <span className="text-muted-foreground">
                  ({instructor.rating_count} {fr ? "avis" : "reviews"})
                </span>
              </span>
            ) : (
              <span>{fr ? "Pas encore d'avis" : "No reviews yet"}</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {instructor.years_experience > 0 ? (
              <Badge variant="outline">
                {instructor.years_experience} {fr ? "ans d'expérience" : "years experience"}
              </Badge>
            ) : null}
            {instructor.hourly_from ? (
              <Badge variant="outline">
                {fr ? "À partir de" : "From"} {instructor.hourly_from} {instructor.currency}
                {fr ? "/heure" : "/hour"}
              </Badge>
            ) : null}
            {instructor.languages.length ? <Badge variant="outline">{instructor.languages.join(" • ")}</Badge> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
