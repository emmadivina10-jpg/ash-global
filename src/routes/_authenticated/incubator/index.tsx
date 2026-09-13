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
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-200 hover:border-amber-500/30 hover:bg-white/[0.04] active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all">
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
      </div>

      <div className="mt-4">
        <p className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
          {label}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
    </Link>
  );
}

export function IncubatorPage() {
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070709] text-white selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background Atmosphere */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-48 -top-48 h-[500px] w-[500px] rounded-full bg-amber-600/10 blur-[130px]" />
        <div className="absolute -right-48 top-[15%] h-[550px] w-[550px] rounded-full bg-purple-900/15 blur-[150px]" />
        <div className="absolute bottom-[-200px] left-[30%] h-[600px] w-[600px] rounded-full bg-amber-500/5 blur-[160px]" />

        {/* Fine background grid grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-purple-900/20 backdrop-blur-md">
                <GraduationCap className="h-6 w-6 text-amber-400" strokeWidth={1.8} />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-500/80">
                ASH Ecosystem
              </p>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Incubator
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:border-amber-500/40 hover:bg-white/[0.07]"
            >
              <Bell className="h-4 w-4" strokeWidth={1.8} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            </button>

            <div className="hidden items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-4 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-[11px] font-black text-black">
                AD
              </div>
              <span className="text-xs font-semibold text-zinc-300">
                My Incubator
              </span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#120f0a] via-[#0b090c] to-[#0d0914] p-6 shadow-2xl sm:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400 via-purple-600 to-transparent" />

          <div className="relative z-10 max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold tracking-widest text-amber-400">
                <Sparkles className="h-3 w-3" />
                ASH INCUBATOR
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold tracking-wider text-zinc-400">
                COHORT 2026 · 01
              </span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Build something{" "}
              <span className="bg-gradient-to-r from-amber-300 via-amber-500 to-purple-400 bg-clip-text text-transparent">
                that matters.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
              A structured innovation program for founders, creators, and technology builders turning early ideas into validated products and sustainable ventures.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/incubator/program"
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 text-xs font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:brightness-110 active:scale-[0.99]"
              >
                Continue Program
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to="/incubator/projects"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 text-xs font-bold text-white transition hover:border-amber-500/30 hover:bg-white/[0.08]"
              >
                <Rocket className="h-4 w-4 text-amber-400" />
                My Project
              </Link>
            </div>
          </div>
        </section>

        {/* Announcement */}
        {showAnnouncement && (
          <section className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                <Zap className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-200">
                  Your incubator journey has started.
                </p>
                <p className="text-xs text-zinc-400">
                  Complete your current milestone to unlock the next stage.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/incubator/program"
                className="hidden text-xs font-bold text-amber-400 hover:underline sm:block"
              >
                View journey →
              </Link>

              <button
                type="button"
                onClick={() => setShowAnnouncement(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
                aria-label="Dismiss announcement"
              >
                ✕
              </button>
            </div>
          </section>
        )}

        {/* Quick Access Grid */}
        <section className="mb-8">
          <div className="mb-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500">
              Workspace
            </p>
            <h2 className="text-base font-bold text-zinc-100">Quick Access</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              href="/incubator/program"
              icon={BookOpen}
              label="My Program"
              description="Learning path"
            />
            <QuickAction
              href="/incubator/projects"
              icon={Rocket}
              label="My Project"
              description="Build & manage"
            />
            <QuickAction
              href="/incubator/documents"
              icon={FileText}
              label="Documents"
              description="Your records"
            />
            <QuickAction
              href="/incubator/certificates"
              icon={Award}
              label="Certificates"
              description="Achievements"
            />
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition hover:border-amber-500/20 hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <Icon className="h-4 w-4 text-amber-400" />
                  </div>
                  {index === 0 && (
                    <span className="text-xs font-bold text-emerald-400">
                      ↑ 6%
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-2xl font-extrabold text-zinc-100">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-zinc-400">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {stat.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Action Banner */}
        <section className="relative mb-8 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-purple-900/10 to-transparent p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
                <Target className="h-5 w-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    Your Next Move
                  </p>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                    THIS WEEK
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-zinc-100">
                  Complete Problem Validation
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Interview at least 5 potential users and document what you learn about the core problem.
                </p>
              </div>
            </div>

            <Link
              to="/incubator/program"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-xs font-bold text-black transition hover:bg-amber-300"
            >
              Start Task
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Content Layout */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main Column */}
          <section className="lg:col-span-7 rounded-3xl border border-white/5 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                  The Journey
                </p>
                <h2 className="text-xl font-bold text-white">Your Incubator Path</h2>
              </div>

              <Link
                to="/incubator/program"
                className="flex items-center gap-1 text-xs font-bold text-zinc-400 transition hover:text-amber-400"
              >
                Full program
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Overall Progress Progress Bar */}
            <div className="mb-6 rounded-2xl border border-white/5 bg-black/40 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-400">
                    Overall Completion
                  </p>
                  <p className="mt-1 text-3xl font-black text-amber-400">18%</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-zinc-300">Week 2 of 8</p>
                  <p className="text-zinc-500">6 weeks remaining</p>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-purple-500 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
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
                        ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-purple-950/20"
                        : "border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          isCurrent
                            ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                            : "border-white/10 bg-white/5 text-zinc-500"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-zinc-500">
                            MODULE {module.number}
                          </span>
                          {isCurrent && (
                            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                              YOU ARE HERE
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1 text-sm font-bold text-zinc-100">
                          {module.title}
                        </h3>
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                          {module.description}
                        </p>

                        {isCurrent && (
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-[10px] font-bold">
                              <span className="text-zinc-400">Module Progress</span>
                              <span className="text-amber-400">{module.progress}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
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

          {/* Right Sidebar Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* My Project Card */}
            <section className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/30 via-zinc-950 to-black p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                    Builder Workspace
                  </p>
                  <h2 className="text-lg font-bold text-white">My Project</h2>
                </div>

                <button
                  type="button"
                  aria-label="Project options"
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                    <Rocket className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">
                      Your Innovation Project
                    </h3>
                    <p className="text-xs text-zinc-500">Early-stage concept</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-500">STATUS</p>
                    <p className="text-xs font-bold text-amber-400">Planning</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-zinc-500">TEAM</p>
                    <p className="text-xs font-bold text-zinc-200">1 Member</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Upcoming Events List */}
            <section className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
              <h2 className="mb-4 text-base font-bold text-zinc-100">
                Upcoming Live Sessions
              </h2>

              <div className="space-y-3">
                {events.map((evt) => (
                  <div
                    key={evt.title}
                    className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.01] p-3 transition hover:border-white/10"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                      <span className="text-xs font-black leading-none">{evt.day}</span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase">{evt.month}</span>
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
