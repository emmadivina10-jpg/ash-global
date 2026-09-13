import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Lightbulb,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

// Brand Identity Constants
const GOLD = "#D4AF37";
const PURPLE = "#4B0082";

// Static Data Structures (Prepared for Supabase Hook Integration)
const STATS = [
  {
    label: "Overall Progress",
    value: "18%",
    subtext: "Week 2 of 8",
    icon: Target,
  },
  {
    label: "Milestones Completed",
    value: "4 / 22",
    subtext: "2 tasks pending",
    icon: CheckCircle2,
  },
  {
    label: "Project Stage",
    value: "Validation",
    subtext: "Phase 01 Active",
    icon: Rocket,
  },
  {
    label: "Active Cohort",
    value: "2026-Q1",
    subtext: "Spring Accelerator",
    icon: Users,
  },
];

const PROGRAM_STAGES = [
  { key: "discover", label: "DISCOVER", active: true },
  { key: "build", label: "BUILD", active: false },
  { key: "validate", label: "VALIDATE", active: false },
  { key: "launch", label: "LAUNCH", active: false },
];

const PROGRAM_MODULES = [
  {
    number: "01",
    title: "Problem Discovery & Customer Validation",
    description:
      "Formulate core hypotheses, conduct founder interviews, and validate market demand before building.",
    status: "Current",
    duration: "Weeks 1-2",
    icon: Lightbulb,
    completedTasks: 4,
    totalTasks: 6,
  },
  {
    number: "02",
    title: "MVP Architecture & Rapid Prototyping",
    description:
      "Translate validated problems into functional zero-to-one prototypes and scalable technology stacks.",
    status: "Upcoming",
    duration: "Weeks 3-4",
    icon: Rocket,
    completedTasks: 0,
    totalTasks: 5,
  },
  {
    number: "03",
    title: "Business Model & Unit Economics",
    description:
      "Structure revenue mechanisms, customer acquisition channels, and sustainable unit economic models.",
    status: "Upcoming",
    duration: "Weeks 5-6",
    icon: BriefcaseBusiness,
    completedTasks: 0,
    totalTasks: 5,
  },
  {
    number: "04",
    title: "Go-To-Market & Demo Day Preparation",
    description:
      "Position your product for launch, optimize launch funnels, and prepare pitch assets for investors.",
    status: "Upcoming",
    duration: "Weeks 7-8",
    icon: Target,
    completedTasks: 0,
    totalTasks: 6,
  },
];

const UPCOMING_EVENTS = [
  {
    id: "evt-1",
    day: "18",
    month: "SEP",
    title: "Incubator Cohort Orientation",
    time: "18:00 EST",
    type: "Live Session",
  },
  {
    id: "evt-2",
    day: "24",
    month: "SEP",
    title: "Problem Validation Masterclass",
    time: "19:00 EST",
    type: "Workshop",
  },
  {
    id: "evt-3",
    day: "01",
    month: "OCT",
    title: "Venture Architect Office Hours",
    time: "17:00 EST",
    type: "Mentorship",
  },
];

const OPPORTUNITIES = [
  {
    title: "ASH Pitch Showcase '26",
    description:
      "Present your validated MVP to partner seed funds and angel networks.",
    badge: "Applications Open",
    icon: Trophy,
  },
  {
    title: "Venture Mentor Network",
    description:
      "1-on-1 advisory with serial founders, staff engineers, and domain experts.",
    badge: "Available Now",
    icon: Users,
  },
  {
    title: "Verification & Grants",
    description:
      "Access non-dilutive credit pools and on-chain credential verification.",
    badge: "Ecosystem Access",
    icon: Award,
  },
];

export default function IncubatorPage() {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Dynamic Visual Layering Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-[160px] opacity-15"
          style={{ backgroundColor: PURPLE }}
        />
        <div
          className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full blur-[180px] opacity-10"
          style={{ backgroundColor: GOLD }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#1f1f2e_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        {/* Navigation & Ecosystem Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#09090b]/80 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4AF37]/30"
              style={{ background: `linear-gradient(135deg, ${GOLD}15, transparent)` }}
            >
              <GraduationCap className="h-5.5 w-5.5" style={{ color: GOLD }} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  ASH Ecosystem
                </span>
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-mono text-zinc-500">
                  BUILD • CONNECT • LAUNCH
                </span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                ASH Incubator
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span
                className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: GOLD }}
              />
            </button>

            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold text-black"
                style={{ backgroundColor: GOLD }}
              >
                AD
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold leading-tight text-zinc-200">
                  Alex Dev
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Cohort 2026/01
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        {showWelcome && (
          <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0e0e12] via-[#09090c] to-[#120a17] p-6 sm:p-10 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowWelcome(false)}
              className="absolute right-5 top-5 rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Dismiss hero overview"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-bold tracking-wide text-[#D4AF37]">
                <Sparkles className="h-3.5 w-3.5" />
                PREMIUM ACCELERATOR PLATFORM
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
                Transform bold concepts into <br className="hidden sm:inline" />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(135deg, #FFFFFF 30%, ${GOLD} 100%)`,
                  }}
                >
                  market-ready ventures.
                </span>
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base max-w-2xl">
                A structured innovation ecosystem connecting founders, builders, and industry leaders.
                Build your core tech stack, validate customer demand, and prepare for market launch.
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <Link
                  to="/incubator/program"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: GOLD }}
                >
                  Continue Program
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/incubator/projects"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/[0.08] active:scale-[0.98]"
                >
                  <Rocket className="h-4 w-4 text-zinc-400" />
                  My Active Workspace
                </Link>
              </div>
            </div>

            {/* Decorative Architectural Ring */}
            <div className="pointer-events-none absolute -bottom-24 -right-24 hidden h-80 w-80 rounded-full border border-[#D4AF37]/15 md:block">
              <div className="absolute inset-10 rounded-full border border-[#4B0082]/30">
                <div className="absolute inset-10 rounded-full border border-[#D4AF37]/10" />
              </div>
            </div>
          </section>
        )}

        {/* Quick Route Access Grid */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
              Ecosystem Navigation
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickLinkCard
              href="/incubator/program"
              icon={BookOpen}
              title="Curriculum"
              subtitle="8-Week Track"
            />
            <QuickLinkCard
              href="/incubator/projects"
              icon={Rocket}
              title="Project Workspace"
              subtitle="Active MVP"
            />
            <QuickLinkCard
              href="/incubator/documents"
              icon={FileText}
              title="Knowledge Vault"
              subtitle="Templates & Pitch"
            />
            <QuickLinkCard
              href="/incubator/certificates"
              icon={Award}
              title="Verified Records"
              subtitle="Certificates"
            />
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#09090c] p-4 sm:p-5 backdrop-blur-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">
                    {stat.label}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                    <Icon className="h-4 w-4" style={{ color: GOLD }} />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <p className="mt-1 text-[11px] font-mono text-zinc-500">{stat.subtext}</p>
              </div>
            );
          })}
        </section>

        {/* Main Content Layout */}
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Main Left Column */}
          <div className="space-y-8">
            {/* NEXT ACTION SYSTEM */}
            <section className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#14120b] via-[#0b0a0f] to-[#09090b] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                      style={{ backgroundColor: GOLD }}
                    />
                    <span
                      className="relative inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: GOLD }}
                    />
                  </span>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#D4AF37]">
                    YOUR NEXT MOVE
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  Due in 3 days
                </span>
              </div>

              <div className="mt-4 sm:flex sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white">
                    Complete Problem Validation Interviews
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400 max-w-xl">
                    Conduct structured discovery interviews with at least 5 target users and upload key interview takeaways into your project log.
                  </p>
                </div>
                <div className="mt-4 shrink-0 sm:mt-0">
                  <Link
                    to="/incubator/program"
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-black transition hover:brightness-110"
                    style={{ backgroundColor: GOLD }}
                  >
                    Execute Task
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </section>

            {/* PROGRAM JOURNEY & MODULES */}
            <section className="rounded-3xl border border-white/10 bg-[#09090c] p-6 backdrop-blur-sm">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    ACCELERATOR TRACK
                  </span>
                  <h3 className="text-xl font-bold text-white">Program Modules</h3>
                </div>
                <Link
                  to="/incubator/program"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4AF37] hover:underline"
                >
                  Full Roadmap
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Progress Milestones Tracker */}
              <div className="mb-6 rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300">Phase Timeline</span>
                  <span className="font-mono font-bold text-[#D4AF37]">
                    18% Completed
                  </span>
                </div>

                {/* Progressive Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: "18%",
                      background: `linear-gradient(90deg, ${GOLD}, #a38218)`,
                    }}
                  />
                </div>

                {/* Stage Indicators */}
                <div className="mt-4 grid grid-cols-4 gap-1 text-center">
                  {PROGRAM_STAGES.map((stage) => (
                    <div key={stage.key} className="flex flex-col items-center">
                      <span
                        className={`text-[10px] font-mono font-bold tracking-wider ${
                          stage.active ? "text-[#D4AF37]" : "text-zinc-600"
                        }`}
                      >
                        {stage.label}
                      </span>
                      <div
                        className={`mt-1 h-1.5 w-1.5 rounded-full ${
                          stage.active ? "bg-[#D4AF37]" : "bg-zinc-800"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Module Cards */}
              <div className="space-y-4">
                {PROGRAM_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const isCurrent = mod.status === "Current";

                  return (
                    <div
                      key={mod.number}
                      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
                        isCurrent
                          ? "border-[#D4AF37]/50 bg-[#D4AF37]/[0.03] shadow-lg shadow-[#D4AF37]/5"
                          : "border-white/5 bg-white/[0.01] hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                              isCurrent
                                ? "border-[#D4AF37]/40 bg-[#D4AF37]/10"
                                : "border-white/10 bg-white/[0.04]"
                            }`}
                          >
                            <Icon
                              className="h-5 w-5"
                              style={{ color: isCurrent ? GOLD : "#71717a" }}
                            />
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-zinc-500">
                                {mod.number}
                              </span>
                              <h4 className="text-base font-bold text-white">
                                {mod.title}
                              </h4>
                              {isCurrent && (
                                <span className="rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-2 py-0.5 text-[10px] font-bold uppercase text-[#D4AF37]">
                                  YOU ARE HERE
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-xs leading-relaxed text-zinc-400 max-w-lg">
                              {mod.description}
                            </p>
                          </div>
                        </div>

                        <div className="hidden shrink-0 text-right sm:block">
                          <span className="block font-mono text-xs text-zinc-500">
                            {mod.duration}
                          </span>
                          <span className="mt-1 inline-block text-[11px] font-medium text-zinc-400">
                            {mod.completedTasks}/{mod.totalTasks} Tasks
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* PROJECT WORKSPACE */}
            <section className="rounded-3xl border border-white/10 bg-[#09090c] p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    VENTURE SUMMARY
                  </span>
                  <h3 className="text-xl font-bold text-white">My Active Project</h3>
                </div>
                <Link
                  to="/incubator/projects"
                  className="inline-flex items-center gap-1 text-xs font-bold text-white hover:text-[#D4AF37]"
                >
                  Open Workspace
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] border border-white/10 font-bold text-white">
                      AP
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Project Nova (ASH Platform)</h4>
                      <p className="text-xs text-zinc-400">
                        AI-assisted venture orchestration pipeline
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                    Status: Planning & Validation
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 sm:grid-cols-4">
                  <div>
                    <span className="block text-[10px] font-mono text-zinc-500">PROBLEM STATEMENT</span>
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-200 truncate">Defined</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-zinc-500">TEAM SIZE</span>
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-200">2 Builders</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-zinc-500">PITCH DECK</span>
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-200">Draft v0.2</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-zinc-500">SUPABASE INTEGRATION</span>
                    <span className="mt-0.5 block text-xs font-mono text-amber-400">Ready</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* UPCOMING EVENTS */}
            <section className="rounded-3xl border border-white/10 bg-[#09090c] p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" style={{ color: GOLD }} />
                  <h3 className="text-base font-bold text-white">Ecosystem Events</h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Q3 Schedule</span>
              </div>

              <div className="space-y-3">
                {UPCOMING_EVENTS.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-center">
                      <span className="text-xs font-bold leading-none text-white">
                        {evt.day}
                      </span>
                      <span className="text-[9px] font-mono uppercase text-zinc-500 mt-1">
                        {evt.month}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="inline-block text-[10px] font-semibold uppercase text-[#D4AF37]">
                        {evt.type}
                      </span>
                      <h4 className="truncate text-xs font-bold text-white">
                        {evt.title}
                      </h4>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-400">
                        <Clock className="h-3 w-3" />
                        <span>{evt.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* OPPORTUNITIES */}
            <section className="rounded-3xl border border-white/10 bg-[#09090c] p-6 backdrop-blur-sm">
              <div className="mb-4 border-b border-white/10 pb-4">
                <h3 className="text-base font-bold text-white">Ventures & Funding</h3>
                <p className="text-xs text-zinc-400">Exclusive founder opportunities</p>
              </div>

              <div className="space-y-3.5">
                {OPPORTUNITIES.map((opp) => {
                  const Icon = opp.icon;
                  return (
                    <div
                      key={opp.title}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-white/15"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05]">
                          <Icon className="h-4 w-4" style={{ color: GOLD }} />
                        </div>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300 border border-white/10">
                          {opp.badge}
                        </span>
                      </div>

                      <h4 className="mt-3 text-xs font-bold text-white">{opp.title}</h4>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                        {opp.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* COMMUNITY PLATFORM */}
            <section className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#0e0917] via-[#09090c] to-[#07050a] p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-purple-400">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  FOUNDER NETWORK
                </span>
              </div>

              <h3 className="mt-2 text-lg font-bold text-white">
                Connect with the Cohort
              </h3>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Share milestone wins, ask technical questions, and pair up with co-founders across the network.
              </p>

              <button
                type="button"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 py-2.5 text-xs font-bold text-purple-200 transition hover:bg-purple-500/20 active:scale-[0.99]"
              >
                Join Founder Channel
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </section>

            {/* VERIFIED RECORDS / CERTIFICATION FOOTPRINT */}
            <section className="rounded-3xl border border-white/10 bg-[#09090c] p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
                  ASH VERIFIED RECORDS
                </h3>
              </div>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                Program completion and milestone verifications are signed on-chain upon final Demo Day review.
              </p>
              <div className="mt-3 font-mono text-[10px] text-zinc-600 truncate">
                RECORD ID: 0x8F92...C41A
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Reusable Quick Action Link Card
 */
function QuickLinkCard({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={href}
      className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#09090c] p-4 transition duration-200 hover:border-[#D4AF37]/40 hover:bg-white/[0.02]"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] transition group-hover:bg-[#D4AF37]/10">
          <Icon className="h-4.5 w-4.5 text-zinc-300 transition group-hover:text-[#D4AF37]" />
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-white" />
      </div>

      <div className="mt-4">
        <span className="block text-xs font-bold text-white">{title}</span>
        <span className="block text-[10px] font-mono text-zinc-500">{subtitle}</span>
      </div>
    </Link>
  );
}
