import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  CircleHelp,
  Code2,
  Compass,
  FolderKanban,
  GraduationCap,
  Lightbulb,
  MessageCircle,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/incubator/")({
  component: IncubatorForumPage,
});

type Track = {
  title: string;
  description: string;
  icon: typeof Rocket;
  accent: string;
  meta: string;
};

const TRACKS: Track[] = [
  {
    title: "Student Innovators",
    description: "Turn a problem you care about into a focused project, prototype, or research idea.",
    icon: GraduationCap,
    accent: "from-cyan-400/20 via-blue-500/10 to-transparent",
    meta: "Ideas · Projects · Mentors",
  },
  {
    title: "Future Founders",
    description: "Explore the founder journey from problem discovery to a clear business concept.",
    icon: Lightbulb,
    accent: "from-[#D4AF37]/25 via-amber-400/10 to-transparent",
    meta: "Validation · Strategy · Pitch",
  },
  {
    title: "Startup Builders",
    description: "A space for early-stage teams building products, testing markets, and finding traction.",
    icon: Rocket,
    accent: "from-fuchsia-500/20 via-purple-600/10 to-transparent",
    meta: "MVP · GTM · Growth",
  },
  {
    title: "Tech Builders",
    description: "Connect developers, cybersecurity practitioners, AI builders, and technical creators.",
    icon: Code2,
    accent: "from-emerald-400/20 via-teal-500/10 to-transparent",
    meta: "Code · AI · Security",
  },
];

const FORUMS = [
  {
    title: "Introductions & Community",
    description: "Meet other builders, founders, students, and creators across the ASH community.",
    icon: Users,
    count: "Community",
  },
  {
    title: "Build in Public",
    description: "Share what you are building, what you learned, and what you are trying next.",
    icon: FolderKanban,
    count: "Projects",
  },
  {
    title: "Technology & Innovation",
    description: "Discuss software, AI, cybersecurity, product design, and emerging technology.",
    icon: Sparkles,
    count: "Technology",
  },
  {
    title: "Business & Entrepreneurship",
    description: "Talk strategy, customers, operations, funding, partnerships, and market opportunities.",
    icon: BriefcaseBusiness,
    count: "Business",
  },
  {
    title: "Opportunities",
    description: "A future hub for events, internships, competitions, grants, and other opportunities.",
    icon: Compass,
    count: "Opportunities",
  },
  {
    title: "Help Desk",
    description: "A guided space for questions about the Incubator experience and ASH programs.",
    icon: CircleHelp,
    count: "Support",
  },
];

function IncubatorForumPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";

  return (
    <div className="relative min-h-[calc(100dvh-1rem)] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(212,175,55,0.14),transparent_32%),radial-gradient(circle_at_90%_5%,rgba(75,0,130,0.18),transparent_34%),linear-gradient(180deg,rgba(8,8,12,0.98),rgba(10,10,16,1))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:34px_34px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />

      <div className="mx-auto w-full max-w-6xl space-y-6 pb-12">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/45 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
          <div className="absolute right-[-8%] top-[-22%] size-64 rounded-full bg-[#4B0082]/25 blur-3xl" />
          <div className="absolute bottom-[-28%] left-[28%] size-72 rounded-full bg-[#D4AF37]/12 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/8 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#D4AF37]">
                <MessageCircle className="size-3.5" aria-hidden />
                ASH Forum
              </div>
              <h1 className="mt-4 max-w-3xl font-display text-3xl font-black tracking-tight text-white sm:text-5xl">
                {fr ? "L’espace où les idées deviennent des projets." : "Where ideas become projects."}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                {fr
                  ? "Le forum ASH est pensé pour connecter étudiants, créateurs, entrepreneurs et builders. La communauté sera activée dans une prochaine phase."
                  : "The ASH Forum is designed to connect students, creators, founders, and builders. Community activity will be enabled in a future phase."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="rounded-full bg-gradient-to-r from-[#D4AF37] via-[#a67c1a] to-[#4B0082] px-5 text-white shadow-lg shadow-purple-950/30 hover:opacity-95">
                  {fr ? "Explorer les parcours" : "Explore tracks"}
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button variant="outline" className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <BookOpen className="size-4" aria-hidden />
                  {fr ? "Comment ça marche" : "How it works"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {([
                ["Forum", fr ? "Bientôt" : "Coming soon", MessageCircle],
                ["Tracks", "4", Network],
                ["Mentorship", fr ? "Bientôt" : "Coming soon", Award],
                ["Community", fr ? "En préparation" : "In preparation", ShieldCheck],
              ] as const).map(([label, value, Icon]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                  <Icon className="size-4 text-[#D4AF37]" aria-hidden />
                  <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/40">{label}</p>
                  <p className="mt-1 text-sm font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#D4AF37]">ASH Incubator</p>
              <h2 className="mt-1 font-display text-xl font-black text-foreground sm:text-2xl">
                {fr ? "Choisissez votre parcours" : "Choose your track"}
              </h2>
            </div>
            <span className="rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-bold text-muted-foreground">
              {fr ? "Aperçu" : "Preview"}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {TRACKS.map((track) => {
              const Icon = track.icon;
              return (
                <button
                  key={track.title}
                  type="button"
                  className={cn(
                    "group relative overflow-hidden rounded-3xl border border-border bg-card p-5 text-left transition-all duration-300",
                    "hover:-translate-y-0.5 hover:border-[#D4AF37]/35 hover:shadow-[0_20px_50px_rgba(0,0,0,0.18)]",
                  )}
                >
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", track.accent)} />
                  <div className="relative flex items-start justify-between gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/25 text-white shadow-inner backdrop-blur">
                      <Icon className="size-5 text-[#D4AF37]" aria-hidden />
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </div>
                  <div className="relative mt-7">
                    <h3 className="text-base font-extrabold text-foreground">{track.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{track.description}</p>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.13em] text-[#D4AF37]">{track.meta}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="px-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#D4AF37]">Community spaces</p>
            <h2 className="mt-1 font-display text-xl font-black text-foreground sm:text-2xl">
              {fr ? "Les forums qui arriveront" : "Forum spaces coming to ASH"}
            </h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {FORUMS.map((forum) => {
              const Icon = forum.icon;
              return (
                <div
                  key={forum.title}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--shadow-card)] transition-colors hover:border-[#D4AF37]/30"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#D4AF37]/15 to-[#4B0082]/20 text-[#D4AF37] ring-1 ring-[#D4AF37]/15">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-extrabold text-foreground">{forum.title}</h3>
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[9px] font-bold text-muted-foreground">{forum.count}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{forum.description}</p>
                  </div>
                  <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Soon</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/15 bg-gradient-to-r from-[#D4AF37]/8 via-card to-[#4B0082]/10 p-5 sm:p-6">
          <div className="absolute right-0 top-0 size-32 rounded-full bg-[#4B0082]/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#4B0082] text-white shadow-lg">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-extrabold text-foreground">
                  {fr ? "Un espace construit avec confiance." : "A community built around trust."}
                </p>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                  {fr
                    ? "À l’ouverture, les espaces seront structurés par catégories, règles communautaires, profils et systèmes de modération ASH."
                    : "When enabled, spaces will be organized by categories, community rules, profiles, and ASH moderation systems."}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/8 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#D4AF37]">
              <Sparkles className="size-3" aria-hidden />
              {fr ? "En préparation" : "In preparation"}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
