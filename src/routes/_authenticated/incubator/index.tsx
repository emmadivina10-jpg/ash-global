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
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GraduationCap,
  Lightbulb,
  MessageCircle,
  MoreHorizontal,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/incubator/")({
  component: IncubatorPage,
});

const GOLD = "#D4AF37";
const PURPLE = "#4B0082";

const stats = [
  {
    label: "Program progress",
    value: "18%",
    detail: "+6% this week",
    icon: Target,
  },
  {
    label: "Tasks completed",
    value: "4/22",
    detail: "18 remaining",
    icon: CheckCircle2,
  },
  {
    label: "Project status",
    value: "Planning",
    detail: "On track",
    icon: Rocket,
  },
  {
    label: "Cohort",
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

function IncubatorPage() {
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      {/* =========================================================
          ASH AMBIENT BRAND BACKGROUND
      ========================================================== */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Gold glow */}
        <div
          className="absolute -left-48 -top-48 h-[520px] w-[520px] rounded-full opacity-20 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, #D4AF37 0%, transparent 68%)",
          }}
        />

        {/* Purple glow */}
        <div
          className="absolute -right-48 top-[18%] h-[600px] w-[600px] rounded-full opacity-20 blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, #4B0082 0%, transparent 68%)",
          }}
        />

        {/* Bottom glow */}
        <div
          className="absolute bottom-[-300px] left-[25%] h-[650px] w-[650px] rounded-full opacity-10 blur-[150px]"
          style={{
            background:
              "radial-gradient(circle, #D4AF37 0%, #4B0082 45%, transparent 70%)",
          }}
        />

        {/* Fine grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8">
        {/* =========================================================
            TOP HEADER
        ========================================================== */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl opacity-40 blur-xl"
                style={{ backgroundColor: GOLD }}
              />

              <div
                className="relative flex h-12 w-12 items-center justify-center rounded-2xl border"
                style={{
                  borderColor: `${GOLD}66`,
                  background:
                    "linear-gradient(145deg, rgba(212,175,55,.18), rgba(75,0,130,.18))",
                }}
              >
                <GraduationCap
                  className="h-6 w-6"
                  style={{ color: GOLD }}
                  strokeWidth={1.8}
                />
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-zinc-500 sm:text-[10px]">
                ASH Ecosystem
              </p>

              <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">
                Incubator
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-300 transition hover:border-[#D4AF37]/30 hover:bg-white/[0.07]"
            >
              <Bell className="h-5 w-5" strokeWidth={1.8} />

              <span
                className="absolute right-2 top-2 h-2 w-2 rounded-full"
                style={{
                  backgroundColor: GOLD,
                  boxShadow: `0 0 10px ${GOLD}`,
                }}
              />
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] py-1.5 pl-1.5 pr-3 sm:flex">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black text-black"
                style={{
                  background:
                    "linear-gradient(135deg, #D4AF37, #8b6914)",
                }}
              >
                AD
              </div>

              <span className="text-xs font-semibold text-zinc-300">
                My Incubator
              </span>
            </div>
          </div>
        </header>

        {/* =========================================================
            PREMIUM HERO
        ========================================================== */}
        <section className="relative mb-6 overflow-hidden rounded-[30px] border border-[#D4AF37]/20">
          {/* Hero background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 15% 20%, rgba(212,175,55,.13), transparent 35%), radial-gradient(circle at 90% 80%, rgba(75,0,130,.20), transparent 40%), linear-gradient(135deg, #120f08 0%, #090909 45%, #100914 100%)",
            }}
          />

          {/* Orbital lines */}
          <div
            className="pointer-events-none absolute -right-28 -top-28 h-[430px] w-[430px] rounded-full border border-[#D4AF37]/10"
            aria-hidden="true"
          >
            <div className="absolute inset-8 rounded-full border border-[#4B0082]/20">
              <div className="absolute inset-8 rounded-full border border-[#D4AF37]/10">
                <div className="absolute inset-16 rounded-full border border-white/[0.03]" />
              </div>
            </div>
          </div>

          <div
            className="pointer-events-none absolute right-[120px] top-[90px] h-2 w-2 rounded-full"
            style={{
              backgroundColor: GOLD,
              boxShadow: `0 0 25px 8px ${GOLD}55`,
            }}
          />

          <div className="relative z-10 p-6 sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black tracking-[0.18em]"
                  style={{
                    borderColor: `${GOLD}45`,
                    backgroundColor: `${GOLD}0D`,
                    color: GOLD,
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  ASH INCUBATOR
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[9px] font-bold tracking-[0.12em] text-zinc-500">
                  COHORT 2026 · 01
                </span>
              </div>

              <h2 className="max-w-2xl text-[34px] font-black leading-[1.03] tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
                Build something{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(110deg, #D4AF37 0%, #f3d878 38%, #8b5cf6 100%)",
                  }}
                >
                  that matters.
                </span>
              </h2>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
                A structured innovation program for students, founders,
                creators and technology builders turning ideas into validated
                products, businesses and opportunities.
              </p>

              {/* Brand line */}
              <div className="mt-6 flex items-center gap-3">
                <div
                  className="h-px w-12"
                  style={{
                    background:
                      "linear-gradient(90deg, #D4AF37, #4B0082)",
                  }}
                />

                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                  BUILD · CONNECT · LAUNCH
                </span>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/incubator/program"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-black shadow-lg transition hover:brightness-110 active:scale-[0.99]"
                  style={{
                    background:
                      "linear-gradient(135deg, #D4AF37 0%, #f0d36b 100%)",
                    boxShadow: `0 10px 35px ${GOLD}20`,
                  }}
                >
                  Continue Program
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>

                <Link
                  to="/incubator/projects"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:border-[#D4AF37]/25 hover:bg-white/[0.08]"
                >
                  <Rocket className="h-4 w-4" />
                  My Project
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            ANNOUNCEMENT
        ========================================================== */}
        {showAnnouncement && (
          <section className="mb-6 flex items-center gap-3 rounded-2xl border border-[#4B0082]/30 bg-gradient-to-r from-[#4B0082]/10 to-[#D4AF37]/[0.03] p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4B0082]/20">
              <Zap className="h-4 w-4 text-purple-300" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">
                Your incubator journey has started.
              </p>

              <p className="mt-0.5 text-[10px] text-zinc-500">
                Complete your current milestone to unlock the next stage.
              </p>
            </div>

            <Link
              to="/incubator/program"
              className="hidden text-[10px] font-bold text-[#D4AF37] sm:block"
            >
              View journey →
            </Link>

            <button
              type="button"
              onClick={() => setShowAnnouncement(false)}
              aria-label="Dismiss announcement"
              className="p-1 text-zinc-600 transition hover:text-white"
            >
              ×
            </button>
          </section>
        )}

        {/* =========================================================
            QUICK ACCESS
        ========================================================== */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">
                Workspace
              </p>

              <h2 className="mt-1 text-sm font-bold text-zinc-200">
                Quick Access
              </h2>
            </div>
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

        {/* =========================================================
            STATS
        ========================================================== */}
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.028] p-4 transition hover:border-[#D4AF37]/20 hover:bg-white/[0.045]"
              >
                {/* Tiny brand glow */}
                <div
                  className="absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-10 blur-2xl"
                  style={{
                    backgroundColor:
                      index % 2 === 0 ? GOLD : PURPLE,
                  }}
                />

                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl border"
                      style={{
                        borderColor:
                          index === 0
                            ? `${GOLD}30`
                            : "rgba(255,255,255,.06)",
                        background:
                          index === 0
                            ? `${GOLD}0C`
                            : "rgba(255,255,255,.03)",
                      }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{
                          color:
                            index === 0 ? GOLD : "#a1a1aa",
                        }}
                      />
                    </div>

                    {index === 0 && (
                      <span className="text-[9px] font-bold text-emerald-400">
                        ↑ 6%
                      </span>
                    )}
                  </div>

                  <p className="text-xl font-black tracking-tight sm:text-2xl">
                    {stat.value}
                  </p>

                  <p className="mt-1 text-[10px] font-medium text-zinc-500">
                    {stat.label}
                  </p>

                  <p className="mt-1 text-[9px] text-zinc-700">
                    {stat.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* =========================================================
            NEXT MOVE
        ========================================================== */}
        <section className="relative mb-6 overflow-hidden rounded-[28px] border border-[#D4AF37]/25">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(110deg, rgba(212,175,55,.075), rgba(75,0,130,.075))",
            }}
          />

          <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                <div
                  className="absolute inset-2 rounded-xl opacity-20 blur-md"
                  style={{ backgroundColor: GOLD }}
                />

                <Target
                  className="relative h-5 w-5"
                  style={{ color: GOLD }}
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
                    Your next move
                  </p>

                  <span className="rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[8px] font-bold text-[#D4AF37]">
                    THIS WEEK
                  </span>
                </div>

                <h2 className="mt-1 text-base font-black sm:text-lg">
                  Complete Problem Validation
                </h2>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                  Interview at least 5 potential users and document what you
                  learn about the problem you are solving.
                </p>
              </div>
            </div>

            <Link
              to="/incubator/program"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black text-black transition hover:brightness-110"
              style={{
                backgroundColor: GOLD,
              }}
            >
              Start Task
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* =========================================================
            CONTENT GRID
        ========================================================== */}
        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          {/* =======================================================
              PROGRAM JOURNEY
          ======================================================== */}
          <section className="rounded-[28px] border border-white/10 bg-white/[0.028] p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                  The journey
                </p>

                <h2 className="mt-1 text-xl font-black tracking-tight">
                  Your Incubator Path
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Progress through the program one milestone at a time.
                </p>
              </div>

              <Link
                to="/incubator/program"
                className="hidden items-center gap-1 text-[10px] font-bold text-zinc-500 transition hover:text-[#D4AF37] sm:flex"
              >
                Full program
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Journey progress */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Overall completion
                  </p>

                  <p
                    className="mt-1 text-3xl font-black"
                    style={{ color: GOLD }}
                  >
                    18%
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400">
                    Week 2 of 8
                  </p>

                  <p className="mt-1 text-[9px] text-zinc-600">
                    6 weeks remaining
                  </p>
                </div>
              </div>

              <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: "18%",
                    background:
                      "linear-gradient(90deg, #D4AF37, #f0d36b, #8B5CF6)",
                    boxShadow: `0 0 15px ${GOLD}45`,
                  }}
                />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  ["Discover", true],
                  ["Build", false],
                  ["Validate", false],
                  ["Launch", false],
                ].map(([label, active], index) => (
                  <div key={String(label)}>
                    <div className="mb-2 flex items-center gap-1.5">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          active
                            ? "bg-[#D4AF37]"
                            : "bg-white/10"
                        }`}
                        style={
                          active
                            ? {
                                boxShadow: `0 0 8px ${GOLD}`,
                              }
                            : undefined
                        }
                      />

                      <span
                        className={`text-[8px] font-bold ${
                          active
                            ? "text-[#D4AF37]"
                            : "text-zinc-600"
                        }`}
                      >
                        {String(label)}
                      </span>
                    </div>

                    {index < 3 && (
                      <div className="h-px bg-white/[0.05]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modules */}
            <div className="space-y-3">
              {modules.map((module) => {
                const Icon = module.icon;
                const current = module.status === "current";

                return (
                  <div
                    key={module.number}
                    className={`group relative overflow-hidden rounded-2xl border p-4 transition ${
                      current
                        ? "border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/[0.06] to-[#4B0082]/[0.04]"
                        : "border-white/[0.06] bg-black/10 hover:border-white/10 hover:bg-white/[0.025]"
                    }`}
                  >
                    {current && (
                      <div
                        className="absolute left-0 top-0 h-full w-[2px]"
                        style={{
                          background:
                            "linear-gradient(180deg, #D4AF37, #4B0082)",
                        }}
                      />
                    )}

                    <div className="flex gap-3">
                      <div
                        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                          current
                            ? "border-[#D4AF37]/30 bg-[#D4AF37]/10"
                            : "border-white/[0.06] bg-white/[0.03]"
                        }`}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{
                            color: current ? GOLD : "#71717a",
                          }}
                        />

                        {current && (
                          <span
                            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0c0c0c]"
                            style={{
                              backgroundColor: GOLD,
                            }}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[8px] font-black tracking-[0.18em] text-zinc-600">
                            MODULE {module.number}
                          </span>

                          {current ? (
                            <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-2 py-0.5 text-[8px] font-black text-[#D4AF37]">
                              YOU ARE HERE
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold text-zinc-700">
                              UPCOMING
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1 text-sm font-black">
                          {module.title}
                        </h3>

                        <p className="mt-1 max-w-xl text-[11px] leading-5 text-zinc-500">
                          {module.description}
                        </p>

                        {current && (
                          <div className="mt-3 max-w-sm">
                            <div className="mb-1.5 flex justify-between">
                              <span className="text-[8px] font-bold text-zinc-600">
                                Module progress
                              </span>

                              <span
                                className="text-[8px] font-bold"
                                style={{ color: GOLD }}
                              >
                                {module.progress}%
                              </span>
                            </div>

                            <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${module.progress}%`,
                                  background:
                                    "linear-gradient(90deg, #D4AF37, #8B5CF6)",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <ChevronRight
                        className="mt-2 hidden h-4 w-4 shrink-0 text-zinc-700 transition group-hover:text-zinc-400 sm:block"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =======================================================
              RIGHT COLUMN
          ======================================================== */}
          <div className="space-y-6">
            {/* Project */}
            <section className="relative overflow-hidden rounded-[28px] border border-[#4B0082]/30 bg-gradient-to-br from-[#130b1b] via-[#0c090f] to-[#080808] p-5">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl"
                style={{
                  backgroundColor: PURPLE,
                }}
              />

              <div className="relative">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-purple-300">
                      Builder workspace
                    </p>

                    <h2 className="mt-1 text-xl font-black">
                      My Project
                    </h2>
                  </div>

                  <button
                    type="button"
                    aria-label="Project options"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 hover:bg-white/5 hover:text-white"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4B0082]/25">
                      <Rocket className="h-5 w-5 text-purple-300" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">
                        Current project
                      </p>

                      <h3 className="mt-1 text-sm font-black">
                        Your Innovation Project
                      </h3>

                      <p className="mt-1 text-[10px] text-zinc-500">
                        Early-stage concept
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">
                        Status
                      </p>

                      <p className="mt-1 text-xs font-bold text-[#D4AF37]">
                        Planning
                      </p>
                    </div>

                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">
                        Team
                      </p>

                      <p className="mt-1 text-xs font-bold">
                        1 member
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-[8px] font-bold text-zinc-600">
                        Project readiness
                      </span>

                      <span className="text-[8px] font-bold text-zinc-400">
                        12%
                      </span>
                    </div>

                    <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: "12%",
                          background:
                            "linear-gradient(90deg, #4B0082, #8B5CF6)",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Link
                  to="/incubator/projects"
                  className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] text-xs font-bold text-zinc-300 transition hover:border-purple-400/20 hover:bg-white/[0.06] hover:text-white"
                >
                  Open Project Workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>

            {/* Events */}
            <section className="rounded-[28px] border border-white/10 bg-white/[0.028] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                    Calendar
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Upcoming
                  </h2>
                </div>

                <CalendarDays
                  className="h-5 w-5"
                  style={{ color: GOLD }}
                />
              </div>

              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.title}
                    className="group flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-black/10 p-3 transition hover:border-[#D4AF37]/15 hover:bg-white/[0.025]"
                  >
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035]">
                      <span className="text-sm font-black">
                        {event.day}
                      </span>

                      <span
                        className="text-[7px] font-black tracking-wider"
                        style={{ color: GOLD }}
                      >
                        {event.month}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">
                        {event.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-zinc-600">
                        <Clock3 className="h-3 w-3" />
                        <span>{event.time}</span>
                        <span>•</span>
                        <span>{event.type}</span>
                      </div>
                    </div>

                    <ChevronRight className="h-3.5 w-3.5 text-zinc-700 transition group-hover:text-zinc-400" />
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] text-[10px] font-bold text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
              >
                View full calendar
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>
          </div>
        </div>

        {/* =========================================================
            OPPORTUNITIES
        ========================================================== */}
        <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.028] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                Beyond the program
              </p>

              <h2 className="mt-1 text-xl font-black">
                Opportunities waiting for you
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                The Incubator connects your learning journey to the wider ASH
                ecosystem.
              </p>
            </div>

            <span className="text-[9px] font-bold text-zinc-700">
              MORE OPPORTUNITIES WILL APPEAR AS YOU PROGRESS
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Opportunity
              icon={Trophy}
              title="Startup Pitch Challenge"
              description="Present your solution and compete for recognition, exposure and opportunities."
              accent="gold"
            />

            <Opportunity
              icon={Users}
              title="Mentorship Network"
              description="Connect with experienced builders, founders and professionals."
              accent="purple"
            />

            <Opportunity
              icon={Award}
              title="ASH Certificate"
              description="Complete the program and receive a verifiable ASH Incubator record."
              accent="gold"
            />
          </div>
        </section>

        {/* =========================================================
            COMMUNITY + VERIFIED RECORDS
        ========================================================== */}
        <div className="mt-6 grid gap-6 md:grid-cols-[1.5fr_1fr]">
          {/* Community */}
          <section className="relative overflow-hidden rounded-[28px] border border-[#4B0082]/30 bg-gradient-to-br from-[#12091a] to-[#080808] p-5 sm:p-6">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-20 blur-3xl"
              style={{ backgroundColor: PURPLE }}
            />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#4B0082]/25">
                <MessageCircle className="h-6 w-6 text-purple-300" />
              </div>

              <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-300">
                  Community
                </p>

                <h2 className="mt-1 text-lg font-black">
                  You don't have to build alone.
                </h2>

                <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">
                  Share your progress, ask questions, find collaborators and
                  connect with innovators across ASH.
                </p>
              </div>

              <Link
                to="/network"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-purple-400/20 bg-purple-500/10 px-5 py-3 text-[10px] font-black text-purple-200 transition hover:bg-purple-500/15"
              >
                Explore Community
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          {/* Records */}
          <section className="rounded-[28px] border border-white/10 bg-white/[0.028] p-5 sm:p-6">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  ASH Records
                </p>

                <h2 className="mt-1 text-sm font-black">
                  Your progress is recorded.
                </h2>

                <p className="mt-1 text-[10px] leading-5 text-zinc-500">
                  Activities, achievements, documents and certificates can
                  become part of your verified ASH record.
                </p>
              </div>
            </div>

            <Link
              to="/incubator/documents"
              className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2.5 text-[10px] font-bold text-zinc-500 transition hover:bg-white/[0.03] hover:text-white"
            >
              Open Documents
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        </div>

        {/* =========================================================
            FINAL BRAND FOOTER
        ========================================================== */}
        <div className="mt-10 flex flex-col items-center justify-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <div
              className="h-px w-8"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #D4AF37)",
              }}
            />

            <span
              className="text-[9px] font-black uppercase tracking-[0.3em]"
              style={{ color: GOLD }}
            >
              ASH
            </span>

            <div
              className="h-px w-8"
              style={{
                background:
                  "linear-gradient(90deg, #4B0082, transparent)",
              }}
            />
          </div>

          <p className="text-[9px] font-medium tracking-wide text-zinc-700">
            BUILD · CONNECT · LAUNCH
          </p>
        </div>
      </main>
    </div>
  );
}

/* ================================================================
   QUICK ACTION
================================================================ */

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <Link
      to={href}
      className="group relative flex min-h-[76px] items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.028] p-3 transition duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/25 hover:bg-[#D4AF37]/[0.035]"
    >
      <div
        className="absolute bottom-0 left-0 h-px w-0 transition-all duration-300 group-hover:w-full"
        style={{
          background:
            "linear-gradient(90deg, #D4AF37, #4B0082)",
        }}
      />

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
        <Icon
          className="h-5 w-5 text-[#D4AF37]"
          strokeWidth={1.8}
        />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-black text-zinc-200">
          {label}
        </p>

        <p className="mt-0.5 text-[9px] text-zinc-600">
          {description}
        </p>
      </div>

      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-zinc-700 transition group-hover:translate-x-0.5 group-hover:text-[#D4AF37]" />
    </Link>
  );
}

/* ================================================================
   OPPORTUNITY
================================================================ */

function Opportunity({
  icon: Icon,
  title,
  description,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accent: "gold" | "purple";
}) {
  const isGold = accent === "gold";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 transition ${
        isGold
          ? "border-[#D4AF37]/10 bg-[#D4AF37]/[0.025] hover:border-[#D4AF37]/25"
          : "border-[#4B0082]/20 bg-[#4B0082]/[0.035] hover:border-[#4B0082]/40"
      }`}
    >
      <div
        className="absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-10 blur-2xl"
        style={{
          backgroundColor: isGold ? GOLD : PURPLE,
        }}
      />

      <div className="relative">
        <div
          className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${
            isGold ? "bg-[#D4AF37]/10" : "bg-[#4B0082]/20"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              isGold ? "text-[#D4AF37]" : "text-purple-300"
            }`}
          />
        </div>

        <h3 className="text-sm font-black">{title}</h3>

        <p className="mt-1.5 text-[10px] leading-5 text-zinc-500">
          {description}
        </p>

        <div
          className={`mt-4 flex items-center gap-1 text-[9px] font-bold ${
            isGold ? "text-[#D4AF37]" : "text-purple-300"
          }`}
        >
          Explore opportunity
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}
