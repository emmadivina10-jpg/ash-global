import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Code2,
  Crown,
  FileCheck2,
  GraduationCap,
  Lightbulb,
  LockKeyhole,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Verified,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/incubator/")({
  component: IncubatorPage,
});

const BRAND_GOLD = "#D4AF37";
const BRAND_PURPLE = "#4B0082";

const quickActions = [
  {
    title: "My Program",
    description: "Track your cohort and learning journey.",
    href: "/incubator/program",
    icon: GraduationCap,
  },
  {
    title: "Projects",
    description: "Build, document and showcase your work.",
    href: "/incubator/projects",
    icon: Rocket,
  },
  {
    title: "Documents",
    description: "Access your official ASH records.",
    href: "/incubator/documents",
    icon: FileCheck2,
  },
  {
    title: "Certificates",
    description: "View your verified achievements.",
    href: "/incubator/certificates",
    icon: Award,
  },
];

const journey = [
  {
    week: "01",
    title: "Discover",
    description:
      "Identify a real problem, understand the people affected and define the opportunity.",
    icon: Lightbulb,
  },
  {
    week: "02",
    title: "Validate",
    description:
      "Research your market, test assumptions and turn your idea into a clear problem statement.",
    icon: Target,
  },
  {
    week: "03",
    title: "Build",
    description:
      "Design your solution and begin transforming the idea into a working MVP.",
    icon: Code2,
  },
  {
    week: "04",
    title: "Technology",
    description:
      "Choose the right technology, architecture and tools to bring your product to life.",
    icon: BriefcaseBusiness,
  },
  {
    week: "05",
    title: "Business",
    description:
      "Develop your business model, pricing strategy and path toward sustainability.",
    icon: Crown,
  },
  {
    week: "06",
    title: "Launch",
    description:
      "Build your go-to-market strategy and prepare your product for real users.",
    icon: Rocket,
  },
  {
    week: "07",
    title: "Trust & Security",
    description:
      "Learn the principles of cybersecurity, privacy, trust and responsible technology.",
    icon: ShieldCheck,
  },
  {
    week: "08",
    title: "Demo Day",
    description:
      "Present your work, receive feedback and showcase what you have built.",
    icon: Sparkles,
  },
];

const opportunities = [
  {
    title: "Startup Pitch Challenge",
    description:
      "Present your startup, product or business concept to mentors and judges.",
    label: "Pitch",
    icon: Rocket,
  },
  {
    title: "Mentorship Network",
    description:
      "Connect with builders, founders and professionals across the ASH ecosystem.",
    label: "Community",
    icon: Users,
  },
  {
    title: "ASH Tech Summit",
    description:
      "A future platform for innovation, technology, startups and cybersecurity.",
    label: "Event",
    icon: CalendarDays,
  },
];

function IncubatorPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
      {/* ============================================================
          AMBIENT ASH BACKGROUND
      ============================================================ */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full blur-[140px]"
          style={{
            background: "rgba(75, 0, 130, 0.20)",
          }}
        />

        <div
          className="absolute right-[-180px] top-[12%] h-[500px] w-[500px] rounded-full blur-[150px]"
          style={{
            background: "rgba(212, 175, 55, 0.10)",
          }}
        />

        <div
          className="absolute bottom-[-200px] left-[25%] h-[500px] w-[500px] rounded-full blur-[160px]"
          style={{
            background: "rgba(75, 0, 130, 0.14)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {/* ============================================================
            TOP BAR
        ============================================================ */}

        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D4AF37]/30"
              style={{
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.16), rgba(75,0,130,0.24))",
                boxShadow: "0 10px 40px rgba(75,0,130,0.18)",
              }}
            >
              <GraduationCap
                className="h-5 w-5"
                style={{ color: BRAND_GOLD }}
              />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/40">
                ASH
              </p>

              <h1 className="text-lg font-semibold tracking-tight">
                Incubator
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />

              <span className="text-xs text-white/60">
                Incubator platform online
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================
            HERO
        ============================================================ */}

        <section className="relative mb-8 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-[#4B0082]/20 via-transparent to-[#D4AF37]/10" />

          <div className="absolute right-[-100px] top-[-140px] h-[340px] w-[340px] rounded-full bg-[#4B0082]/20 blur-[100px]" />

          <div className="absolute bottom-[-160px] left-[25%] h-[300px] w-[300px] rounded-full bg-[#D4AF37]/10 blur-[110px]" />

          <div className="relative grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:p-12">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-3 py-1.5">
                <Sparkles
                  className="h-3.5 w-3.5"
                  style={{ color: BRAND_GOLD }}
                />

                <span className="text-xs font-medium text-[#D4AF37]">
                  BUILD • CONNECT • LAUNCH
                </span>
              </div>

              <h2 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Build something
                <span
                  className="block bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #D4AF37 0%, #B58C22 32%, #4B0082 100%)",
                  }}
                >
                  that matters.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
                ASH Incubator is a structured environment for students,
                creators, developers, founders and early-stage teams to turn
                ideas into real products, businesses and opportunities.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/incubator/program"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold text-black transition hover:scale-[1.01]"
                  style={{
                    background:
                      "linear-gradient(135deg, #D4AF37 0%, #B58C22 45%, #4B0082 100%)",
                    boxShadow: "0 12px 35px rgba(75,0,130,0.25)",
                  }}
                >
                  Explore the Program

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/incubator/projects"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-medium text-white transition hover:border-[#D4AF37]/30 hover:bg-white/[0.07]"
                >
                  View Projects
                </Link>
              </div>
            </div>

            {/* HERO VISUAL */}

            <div className="relative hidden min-h-[300px] lg:block">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-64 w-64">
                  <div className="absolute inset-0 rounded-full border border-[#4B0082]/40" />

                  <div className="absolute inset-6 rounded-full border border-[#D4AF37]/20" />

                  <div className="absolute inset-12 rounded-full border border-white/10" />

                  <div
                    className="absolute inset-[72px] flex items-center justify-center rounded-full"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(75,0,130,0.38))",
                      boxShadow:
                        "0 0 70px rgba(75,0,130,0.25), inset 0 0 30px rgba(212,175,55,0.08)",
                    }}
                  >
                    <div className="text-center">
                      <div
                        className="text-3xl font-bold"
                        style={{ color: BRAND_GOLD }}
                      >
                        ASH
                      </div>

                      <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-white/40">
                        Incubator
                      </div>
                    </div>
                  </div>

                  <div
                    className="absolute left-2 top-16 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#080808]/90"
                    style={{
                      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                    }}
                  >
                    <Lightbulb
                      className="h-5 w-5"
                      style={{ color: BRAND_GOLD }}
                    />
                  </div>

                  <div
                    className="absolute right-1 top-8 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#080808]/90"
                    style={{
                      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                    }}
                  >
                    <Code2 className="h-5 w-5 text-[#8F72B5]" />
                  </div>

                  <div
                    className="absolute bottom-10 right-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#080808]/90"
                    style={{
                      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                    }}
                  >
                    <Rocket
                      className="h-5 w-5"
                      style={{ color: BRAND_GOLD }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            QUICK ACCESS
        ============================================================ */}

        <section className="mb-8">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
              Your workspace
            </p>

            <h3 className="mt-1 text-xl font-semibold tracking-tight">
              Quick access
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quickActions.map((action) => (
              <QuickAction
                key={action.title}
                title={action.title}
                description={action.description}
                href={action.href}
                icon={action.icon}
              />
            ))}
          </div>
        </section>

        {/* ============================================================
            STATS
        ============================================================ */}

        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            value="08"
            label="Weeks"
            description="Structured journey"
            icon={CalendarDays}
          />

          <StatCard
            value="04"
            label="Tracks"
            description="Different pathways"
            icon={Target}
          />

          <StatCard
            value="01"
            label="Portfolio"
            description="Your project record"
            icon={BriefcaseBusiness}
          />

          <StatCard
            value="∞"
            label="Opportunities"
            description="Beyond the cohort"
            icon={Sparkles}
          />
        </section>

        {/* ============================================================
            YOUR NEXT MOVE
        ============================================================ */}

        <section className="mb-8 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.035]">
          <div className="relative p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#4B0082]/10 blur-[80px]" />

            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="flex gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/20"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(212,175,55,0.10), rgba(75,0,130,0.18))",
                  }}
                >
                  <Target
                    className="h-5 w-5"
                    style={{ color: BRAND_GOLD }}
                  />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#D4AF37]">
                    Your next move
                  </p>

                  <h3 className="mt-1 text-xl font-semibold">
                    Start building your idea.
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
                    Your Incubator workspace will become the central record of
                    your progress, projects, documents and achievements.
                  </p>
                </div>
              </div>

              <Link
                to="/incubator/program"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-4 py-3 text-sm font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/[0.10]"
              >
                Open workspace
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================
            THE JOURNEY
        ============================================================ */}

        <section className="mb-8">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
                The journey
              </p>

              <h3 className="mt-1 text-2xl font-semibold tracking-tight">
                From idea to launch
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                A practical progression designed to move you from an early
                idea toward something you can demonstrate in the real world.
              </p>
            </div>

            <Link
              to="/incubator/program"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#D4AF37]"
            >
              View full program
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {journey.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.week}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#D4AF37]/20 hover:bg-white/[0.04]"
                >
                  <div className="absolute right-[-30px] top-[-30px] h-24 w-24 rounded-full bg-[#4B0082]/10 blur-2xl transition group-hover:bg-[#4B0082]/20" />

                  <div className="relative flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold tracking-[0.18em] text-white/25">
                        WEEK
                      </span>

                      <span
                        className="mt-1 text-xl font-bold"
                        style={{ color: BRAND_GOLD }}
                      >
                        {item.week}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-semibold">{item.title}</h4>

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#4B0082]/15">
                          <Icon className="h-4 w-4 text-[#9B7BC1]" />
                        </div>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-white/40">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================
            PROJECT WORKSPACE
        ============================================================ */}

        <section className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035]">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
            <div className="relative overflow-hidden p-7 sm:p-9">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4B0082]/20 via-transparent to-[#D4AF37]/[0.04]" />

              <div className="relative">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4B0082]/20">
                  <Rocket className="h-5 w-5 text-[#A384C6]" />
                </div>

                <h3 className="text-2xl font-semibold">
                  Your project becomes your proof.
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/45">
                  Keep your idea, research, milestones, documentation and
                  progress in one structured workspace.
                </p>

                <Link
                  to="/incubator/projects"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#D4AF37]"
                >
                  Open project workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="border-t border-white/10 p-7 sm:p-9 lg:border-l lg:border-t-0">
              <div className="space-y-3">
                <WorkspaceRow
                  icon={Lightbulb}
                  title="Problem statement"
                  description="Define what you are solving."
                  status="Start"
                />

                <WorkspaceRow
                  icon={Target}
                  title="Validation"
                  description="Record research and user feedback."
                  status="Pending"
                />

                <WorkspaceRow
                  icon={Code2}
                  title="MVP"
                  description="Document the first working version."
                  status="Pending"
                />

                <WorkspaceRow
                  icon={Rocket}
                  title="Launch plan"
                  description="Prepare your route to real users."
                  status="Pending"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            OPPORTUNITIES
        ============================================================ */}

        <section className="mb-8">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
              Beyond the program
            </p>

            <h3 className="mt-1 text-2xl font-semibold tracking-tight">
              Where this can lead
            </h3>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {opportunities.map((item) => (
              <Opportunity
                key={item.title}
                title={item.title}
                description={item.description}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </div>
        </section>

        {/* ============================================================
            COMMUNITY
        ============================================================ */}

        <section className="mb-8 rounded-[26px] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#4B0082]/40 bg-[#4B0082]/15"
              >
                <Users className="h-5 w-5 text-[#A384C6]" />
              </div>

              <div>
                <h3 className="text-lg font-semibold">
                  You are not building alone.
                </h3>

                <p className="mt-1 max-w-xl text-sm leading-6 text-white/40">
                  Connect with other participants, founders, developers,
                  mentors and members of the wider ASH community.
                </p>
              </div>
            </div>

            <Link
              to="/network"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:border-[#4B0082]/40 hover:bg-[#4B0082]/10"
            >
              Explore community
              <Users className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ============================================================
            VERIFIED RECORDS
        ============================================================ */}

        <section
          className="relative overflow-hidden rounded-[28px] border border-[#D4AF37]/15"
          style={{
            background:
              "linear-gradient(135deg, rgba(212,175,55,0.07), rgba(75,0,130,0.13), rgba(255,255,255,0.02))",
          }}
        >
          <div className="absolute right-[-100px] top-[-100px] h-64 w-64 rounded-full bg-[#4B0082]/15 blur-[100px]" />

          <div className="relative p-7 sm:p-9">
            <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(75,0,130,0.25))",
                  }}
                >
                  <Verified
                    className="h-5 w-5"
                    style={{ color: BRAND_GOLD }}
                  />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
                    Your official record
                  </p>

                  <h3 className="mt-1 text-2xl font-semibold">
                    Build a portfolio that can be verified.
                  </h3>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                    Your completed program activities, documents,
                    achievements and certificates can become part of your ASH
                    digital record.
                  </p>
                </div>
              </div>

              <Link
                to="/incubator/certificates"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-black"
                style={{
                  background:
                    "linear-gradient(135deg, #D4AF37, #B58C22 45%, #4B0082)",
                }}
              >
                View certificates
                <Award className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================
            FOOTER
        ============================================================ */}

        <footer className="mt-10 border-t border-white/[0.06] pt-6">
          <div className="flex flex-col gap-3 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white/45">ASH</span>
              <span>Incubator</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <LockKeyhole className="h-3.5 w-3.5" />
                Secure workspace
              </span>

              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Trust focused
              </span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ================================================================
   QUICK ACTION
================================================================ */

function QuickAction({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: typeof GraduationCap;
}) {
  return (
    <Link
      to={href}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[#D4AF37]/20 hover:bg-white/[0.045]"
    >
      <div className="absolute right-[-25px] top-[-25px] h-20 w-20 rounded-full bg-[#4B0082]/10 blur-2xl transition group-hover:bg-[#4B0082]/20" />

      <div className="relative">
        <div
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10"
          style={{
            background:
              "linear-gradient(135deg, rgba(212,175,55,0.09), rgba(75,0,130,0.18))",
          }}
        >
          <Icon className="h-5 w-5" style={{ color: BRAND_GOLD }} />
        </div>

        <h4 className="text-sm font-semibold">{title}</h4>

        <p className="mt-1 text-xs leading-5 text-white/35">
          {description}
        </p>

        <div className="mt-4 flex items-center gap-1 text-xs font-medium text-white/35 transition group-hover:text-[#D4AF37]">
          Open
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

/* ================================================================
   STAT CARD
================================================================ */

function StatCard({
  value,
  label,
  description,
  icon: Icon,
}: {
  value: string;
  label: string;
  description: string;
  icon: typeof CalendarDays;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold tracking-tight text-white">
            {value}
          </div>

          <div className="mt-1 text-sm font-medium text-white/70">
            {label}
          </div>

          <div className="mt-1 text-xs text-white/30">{description}</div>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4B0082]/15">
          <Icon className="h-4 w-4 text-[#9B7BC1]" />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   WORKSPACE ROW
================================================================ */

function WorkspaceRow({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: typeof Lightbulb;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
        <Icon className="h-4 w-4 text-white/50" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-white/30">{description}</p>
      </div>

      <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/35">
        {status}
      </span>
    </div>
  );
}

/* ================================================================
   OPPORTUNITY
================================================================ */

function Opportunity({
  title,
  description,
  label,
  icon: Icon,
}: {
  title: string;
  description: string;
  label: string;
  icon: typeof Rocket;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#4B0082]/40">
      <div className="absolute right-[-40px] top-[-40px] h-28 w-28 rounded-full bg-[#4B0082]/10 blur-3xl transition group-hover:bg-[#4B0082]/20" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4B0082]/15">
            <Icon className="h-4.5 w-4.5 text-[#A384C6]" />
          </div>

          <span
            className="rounded-full border px-2.5 py-1 text-[10px] font-medium"
            style={{
              color: BRAND_GOLD,
              borderColor: "rgba(212,175,55,0.18)",
              backgroundColor: "rgba(212,175,55,0.05)",
            }}
          >
            {label}
          </span>
        </div>

        <h4 className="mt-5 text-sm font-semibold">{title}</h4>

        <p className="mt-2 text-sm leading-6 text-white/35">
          {description}
        </p>

        <div className="mt-5 flex items-center gap-1 text-xs text-white/30 transition group-hover:text-[#D4AF37]">
          Learn more
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
