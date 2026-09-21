import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";
import {
  CAMPUS_LEVELS,
  CAMPUS_MODES,
  CAMPUS_PARTS,
  INSTRUCTOR_TYPES,
  LANGUAGE_LEVELS,
  catalogueOf,
  instructorTypeLabel,
  languageLevelLabel,
  levelLabel,
  modeLabel,
  useCampusSubjects,
  useMyCampusApplication,
  useSubmitCampusApplication,
} from "@/lib/campus.queries";

export const Route = createFileRoute("/_authenticated/campus/become-instructor")({
  head: () => ({
    meta: [
      { title: "Become an Instructor — ASH Campus" },
      {
        name: "description",
        content: "Apply to teach on ASH Campus: share your subjects, levels, experience, qualifications and verification documents.",
      },
      { property: "og:title", content: "Become an Instructor — ASH Campus" },
      { property: "og:description", content: "Apply to teach on ASH Campus and get reviewed by the ASH team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BecomeInstructorPage,
});

const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function BecomeInstructorPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const subjects = useCampusSubjects();
  const existing = useMyCampusApplication();
  const submit = useSubmitCampusApplication();

  const [legalFullName, setLegalFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [methodology, setMethodology] = useState("");
  const [teachingExperience, setTeachingExperience] = useState("");
  const [chosenSubjects, setChosenSubjects] = useState<string[]>([]);
  const [instructorTypes, setInstructorTypes] = useState<string[]>([]);
  const [exams, setExams] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [languageLevels, setLanguageLevels] = useState<{ language: string; level: string }[]>([]);
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Douala";
    } catch {
      return "Africa/Douala";
    }
  });
  const [levels, setLevels] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [modes, setModes] = useState<string[]>([]);
  const [areasServed, setAreasServed] = useState("");
  const [yearsExperience, setYearsExperience] = useState("0");
  const [hourlyFrom, setHourlyFrom] = useState("");
  const [qualTitle, setQualTitle] = useState("");
  const [qualInstitution, setQualInstitution] = useState("");
  const [qualYear, setQualYear] = useState("");
  const [qualifications, setQualifications] = useState<{ kind: string; title: string; institution: string; year: string }[]>([]);
  const [availability, setAvailability] = useState<{ day: number; part: string }[]>([]);
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [qualificationDocument, setQualificationDocument] = useState<File | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const status = existing.data?.status;
  const locked = status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "APPROVED";

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function toggleSlot(day: number, part: string) {
    const exists = availability.some((slot) => slot.day === day && slot.part === part);
    setAvailability(
      exists ? availability.filter((slot) => !(slot.day === day && slot.part === part)) : [...availability, { day, part }],
    );
  }

  async function send() {
    setFormError(null);
    try {
      await submit.mutateAsync({
        legalFullName,
        displayName,
        country,
        city,
        dateOfBirth,
        headline,
        bio,
        methodology,
        teachingExperience,
        subjects: chosenSubjects,
        levels,
        languages,
        teachingModes: modes,
        instructorTypes,
        exams,
        skills,
        languageLevels,
        timezone,
        areasServed,
        yearsExperience: Number(yearsExperience) || 0,
        hourlyFrom: hourlyFrom ? Number(hourlyFrom) : null,
        currency: "XAF",
        qualifications,
        availability,
        identityDocument,
        qualificationDocument,
        declarationsAccepted: accepted,
      });
      toast.success(fr ? "Candidature envoyée pour examen." : "Application submitted for review.");
      void navigate({ to: "/campus" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit the application.";
      setFormError(message);
      toast.error(message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/campus">
          <ArrowLeft className="size-4" aria-hidden />
          ASH Campus
        </Link>
      </Button>

      <header>
        <h1 className="font-display text-2xl font-extrabold text-foreground">
          {fr ? "Devenir instructeur" : "Become an Instructor"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fr
            ? "Votre candidature est examinée manuellement par l'équipe ASH. Vos documents restent privés."
            : "Your application is reviewed manually by the ASH team. Your documents stay private."}
        </p>
      </header>

      {status ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <Badge variant="outline">{status.replaceAll("_", " ")}</Badge>
          {existing.data?.admin_note ? (
            <p className="mt-2 text-sm text-muted-foreground">{existing.data.admin_note}</p>
          ) : null}
          {locked ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {status === "APPROVED"
                ? fr
                  ? "Votre profil instructeur est actif."
                  : "Your instructor profile is active."
                : fr
                  ? "Votre candidature est en cours d'examen. Vous serez informé de la décision."
                  : "Your application is being reviewed. You will be told the decision."}
            </p>
          ) : null}
        </div>
      ) : null}

      {locked ? null : (
        <>
          <Card title={fr ? "Informations personnelles" : "Personal information"}>
            <Field label={fr ? "Nom légal complet" : "Legal full name"}>
              <Input value={legalFullName} onChange={(event) => setLegalFullName(event.target.value)} />
            </Field>
            <Field label={fr ? "Nom affiché" : "Display name"}>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={fr ? "Pays" : "Country"}>
                <Input value={country} onChange={(event) => setCountry(event.target.value)} />
              </Field>
              <Field label={fr ? "Ville" : "City"}>
                <Input value={city} onChange={(event) => setCity(event.target.value)} />
              </Field>
            </div>
            <Field label={fr ? "Date de naissance" : "Date of birth"}>
              <Input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
            </Field>
          </Card>

          <Card title={fr ? "Enseignement" : "Teaching information"}>
            <Field label={fr ? "Titre du profil" : "Profile headline"}>
              <Input value={headline} onChange={(event) => setHeadline(event.target.value)} />
            </Field>
            <Field label={fr ? "Présentation" : "About you"}>
              <Textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} />
            </Field>
            <Field label={fr ? "Méthode d'enseignement" : "Teaching methodology"}>
              <Textarea value={methodology} onChange={(event) => setMethodology(event.target.value)} rows={3} />
            </Field>
            <Field label={fr ? "Expérience d'enseignement" : "Teaching experience"}>
              <Textarea value={teachingExperience} onChange={(event) => setTeachingExperience(event.target.value)} rows={3} />
            </Field>

            <Field label={fr ? "Type d'instructeur" : "Instructor type"}>
              <div className="flex flex-wrap gap-1.5">
                {INSTRUCTOR_TYPES.map((type) => (
                  <Chip
                    key={type}
                    active={instructorTypes.includes(type)}
                    onClick={() => toggle(instructorTypes, type, setInstructorTypes)}
                  >
                    {instructorTypeLabel(type, fr)}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label={fr ? "Matières" : "Subjects"}>
              <div className="flex flex-wrap gap-1.5">
                {catalogueOf(subjects.data, "SUBJECT").map((subject) => (
                  <Chip
                    key={subject.id}
                    active={chosenSubjects.includes(subject.name_en)}
                    onClick={() => toggle(chosenSubjects, subject.name_en, setChosenSubjects)}
                  >
                    {fr ? subject.name_fr : subject.name_en}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label={fr ? "Examens préparés" : "Exams you prepare learners for"}>
              <div className="flex flex-wrap gap-1.5">
                {catalogueOf(subjects.data, "EXAM").map((item) => (
                  <Chip key={item.id} active={exams.includes(item.name_en)} onClick={() => toggle(exams, item.name_en, setExams)}>
                    {fr ? item.name_fr : item.name_en}
                  </Chip>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {fr
                  ? "Vos services s'affichent comme « Préparation TCF Canada ». ASH n'affirme aucune affiliation avec un organisme d'examen."
                  : "Your services appear as “TCF Canada Preparation”. ASH never claims affiliation with an examination organisation."}
              </p>
            </Field>

            <Field label={fr ? "Compétences professionnelles et techniques" : "Professional and technical skills"}>
              <div className="flex flex-wrap gap-1.5">
                {catalogueOf(subjects.data, "SKILL").map((item) => (
                  <Chip key={item.id} active={skills.includes(item.name_en)} onClick={() => toggle(skills, item.name_en, setSkills)}>
                    {fr ? item.name_fr : item.name_en}
                  </Chip>
                ))}
              </div>
            </Field>


            <Field label={fr ? "Niveaux" : "Education levels"}>
              <div className="flex flex-wrap gap-1.5">
                {CAMPUS_LEVELS.map((level) => (
                  <Chip key={level} active={levels.includes(level)} onClick={() => toggle(levels, level, setLevels)}>
                    {levelLabel(level, fr)}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label={fr ? "Format" : "Teaching mode"}>
              <div className="flex flex-wrap gap-1.5">
                {CAMPUS_MODES.map((mode) => (
                  <Chip key={mode} active={modes.includes(mode)} onClick={() => toggle(modes, mode, setModes)}>
                    {modeLabel(mode, fr)}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label={fr ? "Langues enseignées" : "Languages you teach"}>
              <div className="flex flex-wrap gap-1.5">
                {catalogueOf(subjects.data, "LANGUAGE").map((item) => (
                  <Chip
                    key={item.id}
                    active={languages.includes(item.name_en)}
                    onClick={() => {
                      toggle(languages, item.name_en, setLanguages);
                      setLanguageLevels((current) => current.filter((entry) => entry.language !== item.name_en));
                    }}
                  >
                    {fr ? item.name_fr : item.name_en}
                  </Chip>
                ))}
              </div>
            </Field>

            {languages.length ? (
              <Field label={fr ? "Niveaux et objectifs par langue" : "Level and focus for each language"}>
                <div className="space-y-2">
                  {languages.map((language) => (
                    <div key={language} className="rounded-xl border border-border p-3">
                      <p className="text-xs font-bold text-foreground">{language}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {LANGUAGE_LEVELS.map((level) => {
                          const active = languageLevels.some(
                            (entry) => entry.language === language && entry.level === level,
                          );
                          return (
                            <Chip
                              key={level}
                              active={active}
                              onClick={() =>
                                setLanguageLevels((current) =>
                                  active
                                    ? current.filter((entry) => !(entry.language === language && entry.level === level))
                                    : [...current, { language, level }],
                                )
                              }
                            >
                              {languageLevelLabel(level, fr)}
                            </Chip>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Field>
            ) : null}

            <Field label={fr ? "Fuseau horaire" : "Time zone"}>
              <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Africa/Douala" />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {fr
                  ? "Vos disponibilités sont affichées aux apprenants dans leur propre fuseau horaire."
                  : "Your availability is shown to learners in their own time zone."}
              </p>
            </Field>


            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={fr ? "Années d'expérience" : "Years of experience"}>
                <Input
                  type="number"
                  min={0}
                  value={yearsExperience}
                  onChange={(event) => setYearsExperience(event.target.value)}
                />
              </Field>
              <Field label={fr ? "Tarif horaire à partir de (XAF)" : "Starting hourly price (XAF)"}>
                <Input type="number" min={0} value={hourlyFrom} onChange={(event) => setHourlyFrom(event.target.value)} />
              </Field>
            </div>
            <Field label={fr ? "Zones couvertes" : "Areas served"}>
              <Input value={areasServed} onChange={(event) => setAreasServed(event.target.value)} />
            </Field>
          </Card>

          <Card title={fr ? "Qualifications" : "Qualifications"}>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input placeholder={fr ? "Diplôme" : "Degree or certificate"} value={qualTitle} onChange={(event) => setQualTitle(event.target.value)} />
              <Input placeholder={fr ? "Établissement" : "Institution"} value={qualInstitution} onChange={(event) => setQualInstitution(event.target.value)} />
              <Input placeholder={fr ? "Année" : "Year"} value={qualYear} onChange={(event) => setQualYear(event.target.value)} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                if (!qualTitle.trim()) return;
                setQualifications([
                  ...qualifications,
                  { kind: "DEGREE", title: qualTitle.trim(), institution: qualInstitution.trim(), year: qualYear.trim() },
                ]);
                setQualTitle("");
                setQualInstitution("");
                setQualYear("");
              }}
            >
              {fr ? "Ajouter" : "Add"}
            </Button>
            {qualifications.length ? (
              <ul className="mt-3 space-y-2">
                {qualifications.map((item, index) => (
                  <li key={`${item.title}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                    <span>
                      {item.title}
                      {item.institution ? ` · ${item.institution}` : ""}
                      {item.year ? ` · ${item.year}` : ""}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setQualifications(qualifications.filter((_, i) => i !== index))}
                    >
                      {fr ? "Retirer" : "Remove"}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card title={fr ? "Disponibilités" : "Availability"}>
            <div className="space-y-2">
              {(fr ? DAYS_FR : DAYS_EN).map((day, index) => (
                <div key={day} className="flex flex-wrap items-center gap-2">
                  <span className="w-12 text-xs font-bold text-muted-foreground">{day}</span>
                  {CAMPUS_PARTS.map((part) => (
                    <Chip
                      key={part}
                      active={availability.some((slot) => slot.day === index && slot.part === part)}
                      onClick={() => toggleSlot(index, part)}
                    >
                      {part === "MORNING"
                        ? fr
                          ? "Matin"
                          : "Morning"
                        : part === "AFTERNOON"
                          ? fr
                            ? "Après-midi"
                            : "Afternoon"
                          : fr
                            ? "Soir"
                            : "Evening"}
                    </Chip>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          <Card title={fr ? "Vérification des documents" : "Document verification"}>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {fr
                ? "Vos documents sont stockés de manière privée et ne sont visibles que par l'équipe d'examen ASH. Ils ne sont jamais publics."
                : "Your documents are stored privately and are only visible to the ASH review team. They are never public."}
            </p>
            <Field label={fr ? "Pièce d'identité" : "Identity document"}>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => setIdentityDocument(event.target.files?.[0] ?? null)}
                className="text-sm text-muted-foreground"
              />
            </Field>
            <Field label={fr ? "Diplôme ou certification (optionnel)" : "Qualification document (optional)"}>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => setQualificationDocument(event.target.files?.[0] ?? null)}
                className="text-sm text-muted-foreground"
              />
            </Field>
            <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} />
              <span>
                {fr
                  ? "Je confirme que ces informations sont exactes et j'accepte l'examen manuel d'ASH. Je comprends qu'ASH ne réalise pas de vérification d'antécédents judiciaires."
                  : "I confirm this information is accurate and accept ASH's manual review. I understand ASH does not perform criminal background checks."}
              </span>
            </label>
          </Card>

          {formError ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button size="lg" disabled={submit.isPending} onClick={() => void send()}>
              <Upload className="size-4" aria-hidden />
              {fr ? "Envoyer la candidature" : "Submit application"}
            </Button>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-4" aria-hidden />
              {fr ? "Examen manuel par ASH" : "Manual ASH review"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors " +
        (active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")
      }
    >
      {children}
    </button>
  );
}
