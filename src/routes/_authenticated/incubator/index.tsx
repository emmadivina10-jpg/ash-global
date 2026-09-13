import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Lightbulb,
  MoreHorizontal,
  Rocket,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/incubator/")({
  component: IncubatorPage,
});

const stats = [
  {
    label: "Program Progress",
    value: "18%",
    detail: "+6% this week",
    icon: Target,
  },
  {
    label: "Tasks Completed",
    value: "4 / 22",
    detail: "18 remaining",
    icon: CheckCircle2,
  },
  {
    label: "Project Status",
    value: "Planning",
    detail: "On track",
    icon: Rocket,
  },
  {
    label: "Active Cohort",
    value: "2026 · 01",
    detail: "8-week program",
    icon: Users,
  },
];

const modules = [
  {
    number: "01",
    title: "Problem Discovery",
    description:
      "Identify a meaningful problem and understand the people experiencing it.",
    status: "current",
    progress: 72,
    icon: Lightbulb,
  },
  {
    number: "02",
    title: "Build Your MVP",
    description:
      "Turn your validated idea into a practical minimum viable product.",
    status: "upcoming",
    progress: 0,
    icon: Rocket,
  },
  {
    number: "03",
    title: "Business Model",
    description:
      "Define your customers, value proposition, revenue and growth model.",
    status: "upcoming",
    progress: 0,
    icon: BriefcaseBusiness,
  },
  {
    number: "04",
    title: "Go-To-Market",
    description:
      "Prepare your product for launch, positioning and customer acquisition.",
    status: "upcoming",
    progress: 0,
    icon: Target,
  },
];

const events = [
  {
    day: "18",
    month: "SEP",
    title: "Incubator Orientation",
    type: "Live Session",
    time: "6:00 PM",
  },
  {
    day: "24",
    month: "SEP",
    title: "Problem Discovery Workshop",
    type: "Workshop",
    time: "7:00 PM",
  },
  {
    day: "01",
    month: "OCT",
    title: "Mentor Office Hours",
    type: "Mentorship",
    time: "5:00 PM",
  },
];

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <Link
      to={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4 transition-all duration-200 hover:border-amber-500/40 hover:bg-zinc-900/80 active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-all">
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
          {label}
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500">{description}</p>
      </div>
    </Link>
  );
}

export function IncubatorPage() {
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100 selection:bg-amber-500/20 selection:text-amber-300 font-sans antialiased">
      {/* Precision Ambient Lighting */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-48 -top-48 h-[600px] w-[600px] rounded-full bg-amber-600/[0.04] blur-[140px]" />
        <div className="absolute -right-48 top-[20%] h-[600px] w-[600px] rounded-full bg-zinc-700/[0.03] blur-[150px]" />
      </div>

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        {/* Navigation Bar Header */}
        <header className="mb-10 flex items-center justify-between border-b border-zinc-800/50 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-zinc-900 shadow-inner">
                <GraduationCap className="h-5 w-5 text-amber-400" strokeWidth={1.75} />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-amber-500/90">
                ASH ECOSYSTEM
              </p>
              <h1 className="text-lg font-extrabold tracking-tight text-white">
                Incubator
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
            >
              <Bell className="h-4 w-4" strokeWidth={1.8} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
            </button>

            <div className="hidden items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 py-1 pl-1.5 pr-3.5 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-[11px] font-bold text-amber-400 border border-zinc-700/50">
                AD
              </div>
              <span className="text-xs font-semibold text-zinc-300">
                My Workspace
              </span>
            </div>
          </div>
        </header>

        {/* Professional Hero Section */}
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/50 to-zinc-950 p-8 shadow-2xl lg:p-12">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-zinc-800/10 to-transparent" />

          <div className="relative z-10 max-w-2xl">
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                <Sparkles className="h-3 w-3" />
                COHORT 2026 · 01
              </span>
              <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
                8-Week Venture Track
              </span>
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Turn validated concepts into{" "}
              <span className="bg-gradient-to-r from-zinc-100 via-amber-200 to-amber-400 bg-clip-text text-transparent">
                scalable products.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
              A structured venture builder framework providing founders with real-time feedback, operational milestones, and go-to-market guidance.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/incubator/program"
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 text-xs font-bold text-zinc-950 transition hover:bg-amber-300 active:scale-[0.99]"
              >
                Continue Program
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to="/incubator/projects"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-6 text-xs font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
              >
                <Rocket className="h-4 w-4 text-amber-400" />
                View Project Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Announcement Banner */}
        {showAnnouncement && (
          <section className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md">
            <div className="flex items-center gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <Zap className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-200">
                  Sprint Milestone Pending
                </p>
                <p className="text-[11px] text-zinc-400">
                  Complete your market assessment to unlock Module 02.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/incubator/program"
                className="hidden text-xs font-semibold text-amber-400 hover:text-amber-300 sm:block"
              >
                View roadmap →
              </Link>

              <button
                type="button"
                onClick={() => setShowAnnouncement(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          </section>
        )}

        {/* Workspace Quick Actions */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Workspace Tools</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              href="/incubator/program"
              icon={BookOpen}
              label="Curriculum"
              description="Syllabus & modules"
            />
            <QuickAction
              href="/incubator/projects"
              icon={Rocket}
              label="My Venture"
              description="Build & submit"
            />
            <QuickAction
              href="/incubator/documents"
              icon={FileText}
              label="Resources"
              description="Templates & guides"
            />
            <QuickAction
              href="/incubator/certificates"
              icon={Award}
              label="Certifications"
              description="Verified credentials"
            />
          </div>
        </section>

        {/* Stat Cards */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 transition hover:border-zinc-700/80"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-amber-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  {index === 0 && (
                    <span className="text-[11px] font-bold text-emerald-400">
                      +6% this week
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-2xl font-black text-white">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-zinc-400">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Layout Split */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main Program Column */}
          <section className="lg:col-span-7 rounded-3xl border border-zinc-800/80 bg-zinc-900/30 p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                  ROADMAP
                </p>
                <h2 className="text-lg font-bold text-white">Program Architecture</h2>
              </div>

              <Link
                to="/incubator/program"
                className="flex items-center gap-1 text-xs font-semibold text-zinc-400 transition hover:text-amber-400"
              >
                Full Syllabus
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Overall Progress Progress Bar */}
            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-400">
                    Overall Curriculum Completion
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">18%</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold text-zinc-300">Phase 1: Week 2 of 8</p>
                  <p className="text-[11px] text-zinc-500">6 Weeks Remaining</p>
                </div>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                  style={{ width: "18%" }}
                />
              </div>
            </div>

            {/* Modules List */}
            <div className="space-y-3">
              {modules.map((module) => {
                const Icon = module.icon;
                const isCurrent = module.status === "current";

                return (
                  <div
                    key={module.number}
                    className={`relative overflow-hidden rounded-2xl border p-4 transition ${
                      isCurrent
                        ? "border-amber-500/30 bg-zinc-900/90"
                        : "border-zinc-800/50 bg-zinc-950/30 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          isCurrent
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-500 tracking-wider">
                            MODULE {module.number}
                          </span>
                          {isCurrent && (
                            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400 uppercase">
                              Active Stage
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1 text-xs font-bold text-zinc-100">
                          {module.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {module.description}
                        </p>

                        {isCurrent && (
                          <div className="mt-3">
                            <div className="mb-1.5 flex justify-between text-[10px] font-bold">
                              <span className="text-zinc-500">Module Progress</span>
                              <span className="text-amber-400">{module.progress}%</span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className="h-full bg-amber-400"
                                style={{ width: `${module.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Column / Events Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            {/* Active Venture Slate */}
            <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                    PORTFOLIO
                  </p>
                  <h2 className="text-base font-bold text-white">Active Venture</h2>
                </div>

                <button
                  type="button"
                  aria-label="Options"
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300">
                    <Rocket className="h-4 w-4 text-amber-400" />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-zinc-100">
                      Project Vanguard
                    </h3>
                    <p className="text-[11px] text-zinc-500">B2B SaaS • Validation Phase</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-800/80 pt-3">
                  <div>
                    <p className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase">Status</p>
                    <p className="text-xs font-bold text-amber-400">On Schedule</p>
                  </div>

                  <div>
                    <p className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase">Team Size</p>
                    <p className="text-xs font-semibold text-zinc-300">2 Co-founders</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Live Sessions Agenda */}
            <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6">
              <h2 className="mb-4 text-xs font-bold tracking-widest text-zinc-400 uppercase">
                Cohort Schedule
              </h2>

              <div className="space-y-2.5">
                {events.map((evt) => (
                  <div
                    key={evt.title}
                    className="flex items-center gap-3.5 rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-3 transition hover:border-zinc-700"
                  >
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200">
                      <span className="text-xs font-bold leading-none">{evt.day}</span>
                      <span className="mt-0.5 text-[8px] font-bold uppercase text-zinc-500">{evt.month}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-200 truncate">{evt.title}</p>
                      <p className="text-[11px] text-zinc-500">{evt.type} • {evt.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
