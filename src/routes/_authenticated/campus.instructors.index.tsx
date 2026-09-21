import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Baby,
  BadgeCheck,
  BookOpen,
  Building2,
  ChevronDown,
  Globe2,
  GraduationCap,
  Languages,
  MapPin,
  Palette,
  Search,
  SlidersHorizontal,
  Star,
  UserPlus,
  Wrench,
} from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { useI18n } from "@/lib/i18n";
import { countryMeta } from "@/lib/region";
import {
  CAMPUS_LEVELS,
  CAMPUS_MODES,
  CAMPUS_CATEGORIES,
  categoryLabel,
  catalogueOf,
  instructorTitle,
  levelLabel,
  modeLabel,
  useCampusSubjects,
  useInstructors,
  type CampusInstructor,
} from "@/lib/campus.queries";

export const Route = createFileRoute("/_authenticated/campus/instructors/")({
  head: () => ({
    meta: [
      { title: "Find Someone Who Can Teach You — ASH Campus" },
      {
        name: "description",
        content:
          "Find instructors for school, university, languages, professional skills and international exam preparation including TCF Canada, TEF Canada, IELTS and CELPIP.",
      },
      { property: "og:title", content: "Find Someone Who Can Teach You — ASH Campus" },
      {
        property: "og:description",
        content: "Search ASH instructors worldwide by subject, exam, language, level, country and teaching mode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FindInstructorPage,
});

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  ACADEMIC: BookOpen,
  LANGUAGES: Languages,
  EXAM_PREPARATION: GraduationCap,
  PROFESSIONAL: Building2,
  TECHNOLOGY: Wrench,
  ENGINEERING: Wrench,
  CREATIVE: Palette,
};

const SHORTCUTS = [
  "TCF Canada",
  "TEF Canada",
  "IELTS",
  "CELPIP",
  "French",
  "English",
  "German",
  "Mathematics",
  "Physics",
  "Programming",
  "Cybersecurity",
];

function FindInstructorPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [exam, setExam] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<"relevance" | "experience" | "price">("relevance");
  const [parentMode, setParentMode] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const catalogue = useCampusSubjects();

  const filters = useMemo(
    () => ({
      term,
      category,
      level,
      mode,
      city,
      country,
      language,
      exam,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      sort,
    }),
    [term, category, level, mode, city, country, language, exam, maxPrice, sort],
  );
  const { data, isLoading } = useInstructors(filters);

  const languages = catalogueOf(catalogue.data, "LANGUAGE");
  const exams = catalogueOf(catalogue.data, "EXAM");
  const activeFilterCount = [term, category, level, mode, city, country, language, exam, maxPrice].filter(Boolean).length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/campus">
            <ArrowLeft className="size-4" aria-hidden />
            ASH Campus
          </Link>
        </Button>
      </div>

      <header className="relative overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,var(--color-verified-violet),var(--color-verified-magenta)_55%,var(--color-verified-coral))] p-6 text-on-dark shadow-[var(--shadow-card)]">
        <div className="absolute -right-10 -top-12 size-44 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] opacity-90">ASH Campus</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
            {fr ? "Trouvez quelqu'un qui peut vous apprendre." : "Find Someone Who Can Teach You."}
          </h1>
          <p className="mt-2 max-w-xl text-sm opacity-95">
            {fr
              ? "Des instructeurs pour l'école, l'université, les langues, les compétences professionnelles et la préparation aux examens internationaux."
              : "Connect with instructors for school, university, languages, professional skills and international exam preparation."}
          </p>
          <Button asChild size="sm" variant="secondary" className="mt-4 rounded-full font-bold">
            <Link to="/campus/become-instructor">
              <UserPlus className="size-4" aria-hidden />
              {fr ? "Devenir instructeur — gratuit" : "Become an Instructor — free"}
            </Link>
          </Button>
        </div>
      </header>

      <section aria-labelledby="campus-instructors-heading">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-3">
          <div className="min-w-0">
            <h2 id="campus-instructors-heading" className="font-display text-xl font-extrabold text-foreground">
              {fr ? "Instructeurs" : "Instructors"}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {isLoading
                ? fr
                  ? "Recherche en cours…"
                  : "Finding instructors…"
                : `${data?.length ?? 0} ${fr ? "profils disponibles" : "profiles available"}`}
            </p>
          </div>
          <Button
            type="button"
            variant={showDiscovery ? "secondary" : "outline"}
            size="sm"
            className="shrink-0"
            aria-expanded={showDiscovery}
            aria-controls="campus-discovery-tools"
            onClick={() => setShowDiscovery((current) => !current)}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {fr ? "Rechercher" : "Find & filter"}
            {activeFilterCount ? <Badge className="min-w-5 justify-center px-1.5">{activeFilterCount}</Badge> : null}
            <ChevronDown className={`size-4 transition-transform ${showDiscovery ? "rotate-180" : ""}`} aria-hidden />
          </Button>
        </div>
      </section>

      {showDiscovery ? (
        <section id="campus-discovery-tools" className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={fr ? "Que voulez-vous apprendre ?" : "What do you want to learn?"}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CAMPUS_CATEGORIES.map((item) => {
              const Icon = CATEGORY_ICONS[item] ?? BookOpen;
              const active = category === item;
              return (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={active ? "secondary" : "outline"}
                  className="h-auto shrink-0 gap-2 px-3 py-2"
                  onClick={() => setCategory(active ? "" : item)}
                >
                  <Icon className={active ? "size-4 text-primary" : "size-4 text-muted-foreground"} aria-hidden />
                  {categoryLabel(item, fr)}
                </Button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {SHORTCUTS.map((shortcut) => (
              <Button
                key={shortcut}
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground"
                onClick={() => setTerm(shortcut)}
              >
                {shortcut}
              </Button>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={exam} onChange={setExam} label={fr ? "Examen" : "Exam"}>
              <option value="">{fr ? "Tous les examens" : "All exams"}</option>
              {exams.map((item) => <option key={item.id} value={item.name_en}>{fr ? item.name_fr : item.name_en}</option>)}
            </Select>
            <Select value={language} onChange={setLanguage} label={fr ? "Langue" : "Language"}>
              <option value="">{fr ? "Toutes les langues" : "All languages"}</option>
              {languages.map((item) => <option key={item.id} value={item.name_en}>{fr ? item.name_fr : item.name_en}</option>)}
            </Select>
            <Select value={level} onChange={setLevel} label={fr ? "Niveau" : "Level"}>
              <option value="">{fr ? "Tous les niveaux" : "All levels"}</option>
              {CAMPUS_LEVELS.map((item) => <option key={item} value={item}>{levelLabel(item, fr)}</option>)}
            </Select>
            <Select value={mode} onChange={setMode} label={fr ? "Format" : "Teaching mode"}>
              <option value="">{fr ? "En ligne et présentiel" : "Online and in-person"}</option>
              {CAMPUS_MODES.map((item) => <option key={item} value={item}>{modeLabel(item, fr)}</option>)}
            </Select>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {fr ? "Pays" : "Country"}
              <Input className="mt-1" value={country} onChange={(event) => setCountry(event.target.value)} placeholder="CM, CA, NG…" />
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {fr ? "Ville" : "City"}
              <Input className="mt-1" value={city} onChange={(event) => setCity(event.target.value)} placeholder={fr ? "Ville" : "City"} />
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {fr ? "Prix maximum / heure" : "Max price per hour"}
              <Input className="mt-1" type="number" min={0} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="10000" />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(["relevance", "experience", "price"] as const).map((option) => (
              <Button key={option} type="button" size="sm" variant={sort === option ? "secondary" : "outline"} className="h-7 rounded-full text-xs" onClick={() => setSort(option)}>
                {option === "relevance" ? (fr ? "Pertinence" : "Relevance") : option === "experience" ? (fr ? "Expérience" : "Experience") : fr ? "Prix" : "Price"}
              </Button>
            ))}
          </div>

          <Button type="button" variant="ghost" className="mt-3 h-auto w-full justify-start gap-3 px-2 py-2 text-left" onClick={() => setParentMode((current) => !current)}>
            <Baby className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 whitespace-normal">
              <span className="block text-sm font-bold text-foreground">{fr ? "Vous cherchez un instructeur pour votre enfant ?" : "Looking for an instructor for your child?"}</span>
              <span className="block text-xs font-normal text-muted-foreground">{fr ? "Affichez les options adaptées aux parents." : "Show the parent-friendly options."}</span>
            </span>
            <ChevronDown className={`ml-auto size-4 shrink-0 transition-transform ${parentMode ? "rotate-180" : ""}`} aria-hidden />
          </Button>

          {parentMode ? (
            <div className="mt-2 border-t border-border pt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={level} onChange={setLevel} label={fr ? "Niveau de l'enfant" : "Child's education level"}>
                  <option value="">{fr ? "Choisir un niveau" : "Select a level"}</option>
                  {CAMPUS_LEVELS.map((item) => <option key={item} value={item}>{levelLabel(item, fr)}</option>)}
                </Select>
                <Select value={mode} onChange={setMode} label={fr ? "Format" : "Format"}>
                  <option value="">{fr ? "En ligne et présentiel" : "Online and in-person"}</option>
                  {CAMPUS_MODES.map((item) => <option key={item} value={item}>{modeLabel(item, fr)}</option>)}
                </Select>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {fr
                  ? "Pour un élève mineur, le parent ou tuteur garde la réservation, le paiement, la communication principale et les avis. Les enfants ne doivent pas contacter directement un instructeur."
                  : "Where the learner is a minor, the parent or guardian keeps the booking, payment, main communication and reviews. Children should not contact an instructor directly."}
              </p>
            </div>
          ) : null}
        </section>
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

      <p className="rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        {fr
          ? "Les instructeurs ASH sont indépendants. Ils ne sont ni affiliés, ni approuvés, ni certifiés par TCF, TEF, IELTS, CELPIP, Goethe, DELF, DALF ou toute autre organisation d'examen. ASH n'effectue pas de vérification d'antécédents judiciaires."
          : "ASH instructors are independent. They are not affiliated with, endorsed by or certified by TCF, TEF, IELTS, CELPIP, Goethe, DELF, DALF or any examination organisation. ASH does not perform criminal background checks."}
      </p>
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
  const country = instructor.country ? countryMeta(instructor.country) : null;
  const teaches = [...(instructor.exams ?? []), ...(instructor.subjects ?? []), ...(instructor.skills ?? [])].slice(0, 4);
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
            {instructorTitle(instructor.instructor_types, fr)}
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
          {teaches.length ? <p className="mt-1 text-sm font-medium text-foreground">{teaches.join(" • ")}</p> : null}
          {instructor.levels.length ? (
            <p className="text-xs text-muted-foreground">
              {instructor.levels.map((level) => levelLabel(level, fr)).join(" • ")}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {country ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>{country.flag}</span>
                {country.name}
              </span>
            ) : null}
            {instructor.city && instructor.teaching_modes.includes("IN_PERSON") ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden />
                {instructor.city}
              </span>
            ) : null}
            {instructor.teaching_modes.includes("ONLINE") ? (
              <span className="inline-flex items-center gap-1">
                <Globe2 className="size-3" aria-hidden />
                {fr ? "En ligne" : "Online"}
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
