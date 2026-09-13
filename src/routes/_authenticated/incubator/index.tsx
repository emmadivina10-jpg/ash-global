import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GraduationCap,
  Lightbulb,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/incubator/")({
  component: IncubatorPage,
});

const GOLD = "#D4AF37";
const PURPLE = "#4B0082";

const stats = [
  {
    label: "Program Progress",
    value: "18%",
    icon: Target,
  },
  {
    label: "Tasks Completed",
    value: "4 / 22",
    icon: CheckCircle2,
  },
  {
    label: "Project Status",
    value: "Planning",
    icon: Rocket,
  },
  {
    label: "Cohort",
    value: "2026 / 01",
    icon: Users,
  },
];

const programModules = [
  {
    number: "01",
    title: "Problem Discovery",
    description:
      "Identify meaningful problems and validate whether people actually need your solution.",
    status: "Current",
    icon: Lightbulb,
  },
  {
    number: "02",
    title: "Build Your MVP",
    description:
      "Turn your idea into a practical minimum viable product.",
    status: "Upcoming",
    icon: Rocket,
  },
  {
    number: "03",
    title: "Business Model",
    description:
      "Understand customers, revenue, pricing and sustainable business models.",
    status: "Upcoming",
    icon: BriefcaseBusiness,
  },
  {
    number: "04",
    title: "Go-To-Market",
    description:
      "Learn how to position, launch and grow your product.",
    status: "Upcoming",
    icon: Target,
  },
];

const upcomingEvents = [
  {
    date: "18",
    month: "SEP",
    title: "Incubator Orientation",
    time: "6:00 PM",
    type: "Live Session",
  },
  {
    date: "24",
    month: "SEP",
    title: "Problem Discovery Workshop",
    time: "7:00 PM",
    type: "Workshop",
  },
  {
    date: "01",
    month: "OCT",
    title: "Mentor Office Hours",
    time: "5:00 PM",
    type: "Mentorship",
  },
];

const opportunities = [
  {
    title: "Startup Pitch Challenge",
    description:
      "Present your idea and compete for recognition and startup support.",
    icon: Trophy,
  },
  {
    title: "Mentorship Network",
    description:
      "Connect with founders, developers, professionals and industry mentors.",
    icon: Users,
  },
  {
    title: "ASH Certificate",
    description:
      "Complete the program and receive a verifiable ASH Incubator certificate.",
    icon: Award,
  },
];

function IncubatorPage() {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-[#4B0082]/20 blur-[120px]" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#4B0082]/10 blur-[130px]" />
      </div>

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
              style={{
                borderColor: `${GOLD}55`,
                background: `${GOLD}12`,
              }}
            >
              <GraduationCap
                className="h-6 w-6"
                style={{ color: GOLD }}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500 sm:text-xs">
                ASH Ecosystem
              </p>

              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
                ASH Incubator
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/[0.08]"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />

              <span
                className="absolute right-2 top-2 h-2 w-2 rounded-full"
                style={{ backgroundColor: GOLD }}
              />
            </button>

            <div className="hidden h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 sm:flex">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-black"
                style={{ backgroundColor: GOLD }}
              >
                AD
              </div>

              <span className="text-sm font-medium text-zinc-300">
                My Incubator
              </span>
            </div>
          </div>
        </header>

        {/* Hero */}
        {showWelcome && (
          <section className="relative mb-6 overflow-hidden rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#15110a] via-[#0d0b0b] to-[#130b19] p-6 shadow-2xl sm:p-8 lg:p-10">
            <button
              type="button"
              onClick={() => setShowWelcome(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/5 hover:text-white"
              aria-label="Close welcome section"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="relative z-10 max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-[#D4AF37] sm:text-xs">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                BUILD • CONNECT • LAUNCH
              </div>

              <h2 className="max-w-2xl text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                Welcome to the{" "}
                <span style={{ color: GOLD }}>
                  ASH Incubator.
                </span>
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
                A practical ecosystem designed to help students, innovators,
                founders and technology builders transform ideas into real
                products, businesses and opportunities.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/incubator/program"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.99]"
                  style={{ backgroundColor: GOLD }}
                >
                  Continue Program
                  <ArrowRight
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </Link>

                <Link
                  to="/incubator/projects"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.09] active:scale-[0.99]"
                >
                  My Project
                </Link>
              </div>
            </div>

            {/* Decorative orbital element */}
            <div
              className="pointer-events-none absolute -bottom-32 -right-32 hidden h-96 w-96 rounded-full border border-[#D4AF37]/10 md:block"
              aria-hidden="true"
            >
              <div className="absolute inset-8 rounded-full border border-[#4B0082]/30">
                <div className="absolute inset-8 rounded-full border border-[#D4AF37]/10">
                  <div className="absolute inset-10 rounded-full bg-[#D4AF37]/[0.025]" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quick Access */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              Quick Access
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              href="/incubator/program"
              icon={BookOpen}
              label="My Program"
            />

            <QuickAction
              href="/incubator/projects"
              icon={Rocket}
              label="My Project"
            />

            <QuickAction
              href="/incubator/documents"
              icon={FileText}
              label="Documents"
            />

            <QuickAction
              href="/incubator/certificates"
              icon={Award}
              label="Certificates"
            />
          </div>
        </section>

        {/* Stats */}
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-[#D4AF37]/20 hover:bg-white/[0.045]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
                    <Icon
                      className="h-4 w-4"
                      style={{ color: GOLD }}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <p className="text-xl font-black tracking-tight">
                  {stat.value}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </section>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Program */}
          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D4AF37]">
                  Your Journey
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Incubator Program
                </h2>
              </div>

              <Link
                to="/incubator/program"
                className="hidden items-center gap-1 text-xs font-semibold text-zinc-500 transition hover:text-white sm:flex"
              >
                View all
                <ChevronRight
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </Link>
            </div>

            {/* Progress */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Overall Progress
                </span>

                <span
                  className="text-sm font-bold"
                  style={{ color: GOLD }}
                >
                  18%
                </span>
              </div>

              <div
                className="h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={18}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Program progress"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "18%",
                    background: `linear-gradient(90deg, ${GOLD}, #8b6f19)`,
                  }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Week 2 of 8</span>
                <span>4 tasks completed</span>
              </div>
            </div>

            {/* Modules */}
            <div className="space-y-3">
              {programModules.map((module) => {
                const Icon = module.icon;
                const current = module.status === "Current";

                return (
                  <div
                    key={module.number}
                    className={`group flex gap-3 rounded-2xl border p-4 transition ${
                      current
                        ? "border-[#D4AF37]/25 bg-[#D4AF37]/[0.05]"
                        : "border-white/5 bg-black/10 hover:border-white/10 hover:bg-white/[0.025]"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        current
                          ? "bg-[#D4AF37]/15"
                          : "bg-white/[0.05]"
                      }`}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{
                          color: current ? GOLD : "#71717a",
                        }}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-bold tracking-[0.14em] text-zinc-600">
                          MODULE {module.number}
                        </span>

                        {current && (
                          <span className="rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[9px] font-bold tracking-wide text-[#D4AF37]">
                            CURRENT
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 text-sm font-bold">
                        {module.title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {module.description}
                      </p>
                    </div>

                    <ChevronRight
                      className="mt-2 hidden h-4 w-4 shrink-0 text-zinc-700 transition group-hover:text-zinc-400 sm:block"
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right column */}
          <div className="space-y-6">
            {/* Events */}
            <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D4AF37]">
                    Calendar
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    Upcoming
                  </h2>
                </div>

                <CalendarDays
                  className="h-5 w-5"
                  style={{ color: GOLD }}
                  aria-hidden="true"
                />
              </div>

              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.title}
                    className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/10 p-3 transition hover:border-white/10 hover:bg-white/[0.025]"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white/[0.05]">
                      <span className="text-sm font-black">
                        {event.date}
                      </span>

                      <span
                        className="text-[8px] font-bold tracking-wider"
                        style={{ color: GOLD }}
                      >
                        {event.month}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {event.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
                        <Clock3
                          className="h-3 w-3"
                          aria-hidden="true"
                        />
                        <span>{event.time}</span>
                        <span>•</span>
                        <span>{event.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                View Full Calendar
                <ArrowRight
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
              </button>
            </section>

            {/* Opportunities */}
            <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D4AF37]">
                  Ecosystem
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Opportunities
                </h2>
              </div>

              <div className="space-y-1">
                {opportunities.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="flex gap-3 rounded-2xl p-3 transition hover:bg-white/[0.04]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4B0082]/20">
                        <Icon
                          className="h-5 w-5 text-[#a78bfa]"
                          aria-hidden="true"
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Community */}
        <section className="mt-6 rounded-[28px] border border-[#4B0082]/25 bg-gradient-to-r from-[#10091a] to-[#0b0b0b] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#4B0082]/20">
                <MessageCircle
                  className="h-6 w-6 text-[#a78bfa]"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="font-bold">
                  Connect with the ASH Incubator community
                </h2>

                <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">
                  Share progress, ask questions, discover collaborators and
                  connect with other innovators across the ASH ecosystem.
                </p>
              </div>
            </div>

            <Link
              to="/network"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-xs font-bold transition hover:bg-white/[0.1]"
            >
              Explore Community
              <ArrowRight
                className="h-4 w-4"
                aria-hidden="true"
              />
            </Link>
          </div>
        </section>

        {/* Verified records */}
        <section className="mt-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <ShieldCheck
                className="h-5 w-5 text-emerald-400"
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Verified ASH Records
              </p>

              <p className="text-xs leading-5 text-zinc-500">
                Program activity, documents and certificates are securely
                recorded.
              </p>
            </div>
          </div>

          <Link
            to="/incubator/documents"
            className="flex items-center gap-1 text-xs font-semibold text-zinc-400 transition hover:text-white"
          >
            Open Documents
            <ChevronRight
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Link>
        </section>
      </main>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={href}
      className="group flex min-h-16 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-[#D4AF37]/25 hover:bg-[#D4AF37]/[0.04]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/10 transition group-hover:bg-[#D4AF37]/15">
        <Icon
          className="h-5 w-5 text-[#D4AF37]"
          aria-hidden="true"
        />
      </div>

      <span className="text-xs font-semibold text-zinc-300">
        {label}
      </span>

      <ChevronRight
        className="ml-auto h-4 w-4 shrink-0 text-zinc-700 transition group-hover:text-zinc-400"
        aria-hidden="true"
      />
    </Link>
  );
}
