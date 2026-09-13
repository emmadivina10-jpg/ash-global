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
  Lightbulb,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";

// Brand Identity Constants
const GOLD = "#D4AF37";

// Data Models
const STATS = [
  { label: "Overall Progress", value: "18%", sub: "Week 2 of 8" },
  { label: "Tasks Completed", value: "4 / 22", sub: "2 pending this week" },
  { label: "Current Phase", value: "Discover", sub: "Phase 01 Active" },
  { label: "Active Cohort", value: "2026-Q1", sub: "Spring Accelerator" },
];

const STAGES = [
  { key: "discover", label: "01 DISCOVER", active: true },
  { key: "build", label: "02 BUILD", active: false },
  { key: "validate", label: "03 VALIDATE", active: false },
  { key: "launch", label: "04 LAUNCH", active: false },
];

const MODULES = [
  {
    number: "01",
    title: "Problem Discovery & Customer Validation",
    description: "Formulate core hypotheses, conduct founder interviews, and validate market demand before building.",
    status: "Current",
    duration: "Weeks 1–2",
    icon: Lightbulb,
    progress: "4/6 Tasks",
  },
  {
    number: "02",
    title: "MVP Architecture & Rapid Prototyping",
    description: "Translate validated problems into functional zero-to-one prototypes and scalable technology stacks.",
    status: "Upcoming",
    duration: "Weeks 3–4",
    icon: Rocket,
    progress: "0/5 Tasks",
  },
  {
    number: "03",
    title: "Business Model & Unit Economics",
    description: "Structure revenue mechanisms, customer acquisition channels, and sustainable unit economic models.",
    status: "Upcoming",
    duration: "Weeks 5–6",
    icon: BriefcaseBusiness,
    progress: "0/5 Tasks",
  },
  {
    number: "04",
    title: "Go-To-Market & Demo Day Preparation",
    description: "Position your product for launch, optimize acquisition funnels, and prepare pitch assets for investors.",
    status: "Upcoming",
    duration: "Weeks 7–8",
    icon: Target,
    progress: "0/6 Tasks",
  },
];

const EVENTS = [
  {
    id: "evt-1",
    day: "18",
    month: "SEP",
    title: "Cohort Orientation & Pitch Prep",
    time: "18:00 EST",
    type: "Live Session",
  },
  {
    id: "evt-2",
    day: "24",
    month: "SEP",
    title: "Customer Validation Masterclass",
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
    description: "Present your validated MVP to partner seed funds and angel networks.",
    badge: "Applications Open",
    icon: Trophy,
  },
  {
    title: "Venture Advisory Network",
    description: "1-on-1 advisory with serial founders, technical architects, and domain experts.",
    badge: "Available Now",
    icon: Users,
  },
];

export default function IncubatorPage() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-100 font-sans antialiased selection:bg-[#D4AF37]/30 selection:text-white pb-24">
      {/* Background Ambient Depth */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-[#D4AF37]/[0.03] blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-[#4B0082]/[0.05] blur-[160px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {/* Navigation & Workspace Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
              <GraduationCap className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">
                  ASH ECOSYSTEM
                </span>
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-mono text-zinc-500">2026 / Q1 COHORT</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">ASH Incubator</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
            </button>

            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-[10px] font-mono font-bold text-zinc-200">
                AD
              </div>
              <span className="text-xs font-semibold text-zinc-300">Alex Dev</span>
            </div>
          </div>
        </header>

        {/* HERO WORKSPACE OVERVIEW */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-[#0a0a0d] p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#D4AF37]">
                <Sparkles className="h-3 w-3" />
                BUILD • CONNECT • LAUNCH
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Transforming raw technical concepts into venture-ready products.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Welcome back, Alex. You are currently in <strong className="text-zinc-200">Phase 01: Problem Discovery</strong>. Complete user validation tasks to unlock core architecture review.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
              <Link
                to="/incubator/program"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-95 active:scale-95"
                style={{ backgroundColor: GOLD }}
              >
                Resume Problem Validation
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/incubator/projects"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white active:scale-95"
              >
                My Workspace
              </Link>
            </div>
          </div>

          {/* Metric Bar */}
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <span className="block text-[10px] font-mono uppercase text-zinc-500">{s.label}</span>
                <span className="mt-1 block text-lg font-bold text-white">{s.value}</span>
                <span className="block text-[11px] text-zinc-400">{s.sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* QUICK NAVIGATION STRIP */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickTile href="/incubator/program" icon={BookOpen} title="Curriculum" sub="8-Week Roadmap" />
          <QuickTile href="/incubator/projects" icon={Rocket} title="Active Project" sub="Project Nova" />
          <QuickTile href="/incubator/documents" icon={FileText} title="Knowledge Base" sub="Templates & Legal" />
          <QuickTile href="/incubator/certificates" icon={Award} title="Verified Record" sub="Credentials" />
        </section>

        {/* MAIN DASHBOARD LAYOUT */}
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* LEFT COLUMN: ACTION & ROADMAP */}
          <div className="space-y-8">
            {/* NEXT MOVE CONTAINER */}
            <section className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-r from-[#12100a] to-[#09090c] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#D4AF37]">
                    YOUR NEXT MOVE
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">Target: 3 Days Remaining</span>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-white">Conduct 5 Customer Problem Interviews</h4>
                  <p className="mt-1 text-xs text-zinc-400 max-w-lg leading-relaxed">
                    Validate pain points with real target users. Document key observations in your project log before moving to MVP specs.
                  </p>
                </div>
                <Link
                  to="/incubator/program"
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-black transition hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: GOLD }}
                >
                  Start Task
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </section>

            {/* ROADMAP & MODULES */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">ROADMAP</span>
                  <h3 className="text-lg font-bold text-white">Accelerator Curriculum</h3>
                </div>
                <Link to="/incubator/program" className="text-xs font-semibold text-zinc-400 hover:text-white">
                  View Details →
                </Link>
              </div>

              {/* Accelerator Phase Progress */}
              <div className="mb-4 rounded-xl border border-white/[0.08] bg-[#09090c] p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300">Phase Timeline</span>
                  <span className="font-mono text-[#D4AF37]">18% Completed</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: "18%", backgroundColor: GOLD }} />
                </div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {STAGES.map((s) => (
                    <span
                      key={s.key}
                      className={`text-[10px] font-mono font-bold ${
                        s.active ? "text-[#D4AF37]" : "text-zinc-600"
                      }`}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Module List */}
              <div className="space-y-3">
                {MODULES.map((m) => {
                  const Icon = m.icon;
                  const isCurrent = m.status === "Current";

                  return (
                    <div
                      key={m.number}
                      className={`rounded-xl border p-4 transition ${
                        isCurrent
                          ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.02]"
                          : "border-white/[0.06] bg-[#09090c]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                              isCurrent
                                ? "border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]"
                                : "border-white/10 bg-white/[0.03] text-zinc-500"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-zinc-500">{m.number}</span>
                              <h4 className="text-sm font-bold text-white">{m.title}</h4>
                              {isCurrent && (
                                <span className="rounded bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-2 py-0.5 text-[9px] font-mono font-bold text-[#D4AF37]">
                                  YOU ARE HERE
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-zinc-400 leading-relaxed max-w-lg">
                              {m.description}
                            </p>
                          </div>
                        </div>

                        <div className="hidden sm:block shrink-0 text-right">
                          <span className="block font-mono text-[11px] text-zinc-500">{m.duration}</span>
                          <span className="text-xs text-zinc-400">{m.progress}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ACTIVE PROJECT SUMMARY */}
            <section className="rounded-2xl border border-white/10 bg-[#09090c] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-500">FOUNDER WORKSPACE</span>
                  <h3 className="text-base font-bold text-white">Project Nova</h3>
                </div>
                <Link
                  to="/incubator/projects"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white"
                >
                  Open Workspace
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                <div>
                  <span className="block font-mono text-[10px] text-zinc-500">STAGE</span>
                  <span className="mt-0.5 block font-semibold text-white">Validation</span>
                </div>
                <div>
                  <span className="block font-mono text-[10px] text-zinc-500">TEAM</span>
                  <span className="mt-0.5 block font-semibold text-white">2 Builders</span>
                </div>
                <div>
                  <span className="block font-mono text-[10px] text-zinc-500">PITCH DECK</span>
                  <span className="mt-0.5 block font-semibold text-zinc-300">Draft v0.2</span>
                </div>
                <div>
                  <span className="block font-mono text-[10px] text-zinc-500">SUPABASE</span>
                  <span className="mt-0.5 block font-mono text-emerald-400">Connected</span>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: EVENTS, OPPORTUNITIES & RECORD */}
          <div className="space-y-8">
            {/* UPCOMING EVENTS */}
            <section className="border-b border-white/[0.08] pb-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-sm font-bold text-white">Upcoming Sessions</h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Q3 Schedule</span>
              </div>

              <div className="space-y-3">
                {EVENTS.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.02]">
                      <span className="text-xs font-bold leading-none text-white">{evt.day}</span>
                      <span className="text-[9px] font-mono uppercase text-zinc-500 mt-0.5">{evt.month}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-mono text-zinc-400 uppercase">{evt.type}</span>
                      <h4 className="truncate text-xs font-semibold text-white">{evt.title}</h4>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-500">
                        <Clock className="h-3 w-3" />
                        <span>{evt.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* OPPORTUNITIES */}
            <section className="border-b border-white/[0.08] pb-6">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Opportunities</h3>
                <p className="text-xs text-zinc-500">Ecosystem resources & funding</p>
              </div>

              <div className="space-y-3">
                {OPPORTUNITIES.map((opp) => {
                  const Icon = opp.icon;
                  return (
                    <div key={opp.title} className="rounded-xl border border-white/[0.06] bg-[#09090c] p-3.5">
                      <div className="flex items-center justify-between">
                        <Icon className="h-4 w-4 text-zinc-400" />
                        <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[9px] font-mono text-zinc-300">
                          {opp.badge}
                        </span>
                      </div>
                      <h4 className="mt-2 text-xs font-bold text-white">{opp.title}</h4>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{opp.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* FOUNDER COMMUNITY */}
            <section className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0c0814] to-[#050505] p-5">
              <div className="flex items-center gap-2 text-purple-400">
                <MessageSquare className="h-4 w-4" />
                <span className="text-[10px] font-mono font-bold uppercase">COMMUNITY</span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-white">Founder Network</h3>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Connect with cohort founders, request technical peer reviews, and find co-builders.
              </p>
              <button
                type="button"
                className="mt-4 min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs font-semibold text-purple-200 transition hover:bg-purple-500/20 active:scale-95"
              >
                Enter Founder Channel
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </section>

            {/* VERIFIED RECORDS */}
            <section className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#09090c] p-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <h4 className="text-xs font-bold text-white">ASH Verified Records</h4>
                <p className="mt-0.5 text-[11px] text-zinc-400 leading-relaxed">
                  Milestones and certificate IDs are signed on-chain upon program completion.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Clean Utility Navigation Tile
 */
function QuickTile({
  href,
  icon: Icon,
  title,
  sub,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  sub: string;
}) {
  return (
    <Link
      to={href}
      className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#09090c] p-3.5 transition hover:border-white/20 active:scale-95"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-zinc-400 group-hover:text-white transition" />
        <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:translate-x-0.5 transition" />
      </div>
      <div className="mt-3">
        <span className="block text-xs font-bold text-white">{title}</span>
        <span className="block text-[10px] font-mono text-zinc-500">{sub}</span>
      </div>
    </Link>
  );
}
