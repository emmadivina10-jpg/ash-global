import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Bot,
  Briefcase,
  FileQuestion,
  GraduationCap,
  Layers,
  Lightbulb,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useMyCampusApplication, useMyInstructorProfile } from "@/lib/campus.queries";

export const Route = createFileRoute("/_authenticated/campus/")({
  head: () => ({
    meta: [
      { title: "ASH Campus — learn, teach and grow" },
      {
        name: "description",
        content:
          "ASH Campus brings GCE, HND and university learning, study materials, past questions, study groups and instructors together in one place.",
      },
      { property: "og:title", content: "ASH Campus — learn, teach and grow" },
      { property: "og:description", content: "Find an instructor, study materials, past questions and study groups inside ASH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CampusPage,
});

const SECTIONS: { en: string; fr: string; icon: typeof BookOpen; to?: string; soon?: boolean }[] = [
  { en: "GCE", fr: "GCE", icon: FileQuestion, soon: true },
  { en: "HND", fr: "HND", icon: Layers, soon: true },
  { en: "University", fr: "Université", icon: GraduationCap, soon: true },
  { en: "Study Materials", fr: "Supports de cours", icon: BookOpen, soon: true },
  { en: "Past Questions", fr: "Anciens sujets", icon: FileQuestion, soon: true },
  { en: "AI Tutor", fr: "Tuteur IA", icon: Bot, soon: true },
  { en: "Study Groups", fr: "Groupes d'étude", icon: Users, to: "/groups" },
  { en: "Scholarships", fr: "Bourses", icon: Award, soon: true },
  { en: "Internships & Jobs", fr: "Stages et emplois", icon: Briefcase, to: "/jobs" },
  { en: "Student Projects", fr: "Projets étudiants", icon: Lightbulb, to: "/freelance" },
  { en: "Student Marketplace", fr: "Marché étudiant", icon: ShoppingBag, to: "/services" },
  { en: "Instructor Services", fr: "Services des instructeurs", icon: Store, to: "/campus/instructors" },
];

function CampusPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const { data: instructor } = useMyInstructorProfile();
  const { data: application } = useMyCampusApplication();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">ASH Campus</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-foreground sm:text-3xl">
          {tx("Learn. Teach. Grow.", "Apprenez. Enseignez. Progressez.")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tx("Everything you study in one place, with real ASH instructors.", "Tout votre apprentissage au même endroit, avec de vrais instructeurs ASH.")}
        </p>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,var(--color-verified-violet),var(--color-verified-magenta)_55%,var(--color-verified-coral))] p-6 text-on-dark shadow-[var(--shadow-card)]">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] opacity-90">
            {tx("Find an instructor", "Trouver un instructeur")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
            {tx("Find Someone Who Can Teach You.", "Trouvez quelqu'un qui peut vous apprendre.")}
          </h2>
          <p className="mt-2 max-w-lg text-sm opacity-95">
            {tx("Connect with instructors for school, university, languages, professional skills and international exam preparation — in Cameroon and around the world.", "Des instructeurs pour l'école, l'université, les langues, les compétences professionnelles et la préparation aux examens internationaux — au Cameroun et dans le monde.")}
          </p>
          <p className="mt-2 text-xs font-semibold opacity-90">
            TCF Canada · TEF Canada · IELTS · CELPIP · {tx("French", "Français")} · {tx("English", "Anglais")} ·{" "}
            {tx("German", "Allemand")} · {tx("Mathematics", "Mathématiques")} · {tx("Physics", "Physique")} ·
            Programming · Cybersecurity
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="lg" variant="secondary" className="rounded-full font-bold">
              <Link to="/campus/instructors">
                <Search className="size-4" aria-hidden />
                {tx("Find an Instructor", "Trouver un instructeur")}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/40 bg-white/10 font-bold text-on-dark hover:bg-white/20"
            >
              <Link to={instructor ? "/campus/teaching" : "/campus/become-instructor"}>
                <UserPlus className="size-4" aria-hidden />
                {instructor
                  ? tx("Instructor dashboard", "Espace instructeur")
                  : tx("Become an Instructor", "Devenir instructeur")}
              </Link>
            </Button>
          </div>
          {application && !instructor ? (
            <p className="mt-3 text-xs font-semibold opacity-95">
              {tx("Your application status: ", "Statut de votre candidature : ")}
              {application.status.replaceAll("_", " ").toLowerCase()}
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-foreground">
          {tx("Explore ASH Campus", "Explorer ASH Campus")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SECTIONS.map((section) => {
            const label = fr ? section.fr : section.en;
            const content = (
              <>
                <section.icon className="size-5 text-primary" aria-hidden />
                <span className="mt-2 block text-sm font-semibold text-foreground">{label}</span>
                {section.soon ? (
                  <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
                    {fr ? "Bientôt disponible" : "Coming soon"}
                  </span>
                ) : null}
              </>
            );
            return section.to ? (
              <Link
                key={section.en}
                to={section.to}
                className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                {content}
              </Link>
            ) : (
              <div key={section.en} className="rounded-2xl border border-dashed border-border bg-card/60 p-4">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex gap-3">
          <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {tx("ASH instructors are manually reviewed by our team before they appear as an ASH Verified Instructor. ASH does not perform criminal background checks or government verification.", "Les instructeurs ASH sont examinés manuellement par notre équipe avant d'être affichés comme « Instructeur vérifié ASH ». ASH ne réalise pas de vérification d'antécédents judiciaires ni de contrôle gouvernemental.")}
          </p>
        </div>
      </section>
    </div>
  );
}
