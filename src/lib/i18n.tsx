import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Compass,
  Gift,
  Hammer,
  Heart,
  Menu,
  MessageCircle,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useI18n } from "./i18n";

type LandingProps = {
  onSignIn?: () => void;
  onGetStarted?: () => void;
};

const categories = [
  {
    title: "Beauty & Grooming",
    description: "Book trusted beauty professionals near you.",
    icon: Heart,
  },
  {
    title: "Home & Trades",
    description: "Find electricians, plumbers, cleaners and more.",
    icon: Hammer,
  },
  {
    title: "Tech & Digital",
    description: "Connect with developers, designers and IT experts.",
    icon: Sparkles,
  },
  {
    title: "Health & Wellness",
    description: "Discover wellness and care professionals.",
    icon: ShieldCheck,
  },
];

const ecosystem = [
  {
    title: "Marketplace",
    description: "Discover products, sellers and local businesses.",
    icon: Store,
  },
  {
    title: "Services",
    description: "Book verified professionals and chat directly.",
    icon: Users,
  },
  {
    title: "Property",
    description: "Find rooms, apartments, houses and land.",
    icon: Building2,
  },
  {
    title: "Freelance",
    description: "Find talent or discover your next project.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Events",
    description: "Discover events, experiences and opportunities.",
    icon: CalendarDays,
  },
  {
    title: "Deals",
    description: "Find promotions and exclusive local offers.",
    icon: Gift,
  },
];

const referralLevels = [
  {
    level: "01",
    amount: "1,500",
    title: "Direct referrals",
    description: "People who join ASH through your referral link.",
  },
  {
    level: "02",
    amount: "750",
    title: "Second level",
    description: "People brought into ASH by your direct referrals.",
  },
  {
    level: "03",
    amount: "250",
    title: "Third level",
    description: "Your network continues to grow three levels deep.",
  },
];

export default function Landing({ onSignIn, onGetStarted }: LandingProps) {
  const { t } = useI18n();

  const [menuOpen, setMenuOpen] = React.useState(false);

  const scrollTo = (id: string) => {
    setMenuOpen(false);

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-white selection:bg-[#D4AF37] selection:text-black">
      {/* =========================================================
          NAVIGATION
      ========================================================= */}
      <header className="fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto max-w-7xl px-5 pt-5 md:px-8">
          <nav className="border border-white/10 bg-black/65 px-4 py-3 backdrop-blur-2xl md:px-6">
            <div className="flex items-center justify-between">
              {/* LOGO */}
              <button onClick={() => scrollTo("home")} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-[#D4AF37]/50 bg-[#D4AF37]/10">
                  <span className="text-xl font-black tracking-tighter text-[#D4AF37]">A</span>
                </div>

                <div className="text-left">
                  <div className="text-lg font-black tracking-[0.18em]">ASH</div>
                  <div className="-mt-1 text-[8px] uppercase tracking-[0.28em] text-white/45">
                    Where Opportunities Connect
                  </div>
                </div>
              </button>

              {/* DESKTOP NAV */}
              <div className="hidden items-center gap-7 lg:flex">
                <button
                  onClick={() => scrollTo("discover")}
                  className="text-sm text-white/65 transition hover:text-white"
                >
                  Discover
                </button>

                <button
                  onClick={() => scrollTo("ecosystem")}
                  className="text-sm text-white/65 transition hover:text-white"
                >
                  Marketplace
                </button>

                <button
                  onClick={() => scrollTo("services")}
                  className="text-sm text-white/65 transition hover:text-white"
                >
                  Services
                </button>

                <button
                  onClick={() => scrollTo("property")}
                  className="text-sm text-white/65 transition hover:text-white"
                >
                  Property
                </button>

                <button onClick={() => scrollTo("refer")} className="text-sm text-white/65 transition hover:text-white">
                  Refer & Earn
                </button>
              </div>

              {/* ACTIONS */}
              <div className="hidden items-center gap-3 md:flex">
                <button
                  onClick={onSignIn}
                  className="px-4 py-2.5 text-sm font-medium text-white/75 transition hover:text-white"
                >
                  {t("landing.signIn")}
                </button>

                <button
                  onClick={onGetStarted}
                  className="group flex items-center gap-2 bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#E5C45A]"
                >
                  {t("landing.getStarted")}
                  <ArrowUpRight
                    size={16}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </button>
              </div>

              {/* MOBILE MENU */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center border border-white/10 md:hidden"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            {menuOpen && (
              <div className="mt-4 border-t border-white/10 pt-4 md:hidden">
                <div className="flex flex-col gap-1">
                  {[
                    ["discover", "Discover"],
                    ["ecosystem", "Marketplace"],
                    ["services", "Services"],
                    ["property", "Property"],
                    ["refer", "Refer & Earn"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => scrollTo(id)}
                      className="px-3 py-3 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      {label}
                    </button>
                  ))}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={onSignIn} className="border border-white/10 py-3 text-sm">
                      {t("landing.signIn")}
                    </button>

                    <button onClick={onGetStarted} className="bg-[#D4AF37] py-3 text-sm font-bold text-black">
                      {t("landing.getStarted")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* =========================================================
          HERO
      ========================================================= */}
      <section id="home" className="relative min-h-screen overflow-hidden pt-32">
        {/* Background glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-[#D4AF37]/[0.07] blur-[140px]" />

        <div className="pointer-events-none absolute -right-40 top-20 h-[450px] w-[450px] rounded-full bg-[#4B0082]/20 blur-[120px]" />

        <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl items-center gap-14 px-5 pb-20 md:px-8 lg:grid-cols-[1.05fr_.95fr]">
          {/* LEFT */}
          <div className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] px-4 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                Built for Cameroon · Powered by opportunity
              </span>
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl md:text-7xl lg:text-[82px]">
              Where
              <br />
              <span className="text-[#D4AF37]">opportunities</span>
              <br />
              connect.
            </h1>

            <p className="mt-8 max-w-2xl text-base leading-7 text-white/55 md:text-lg md:leading-8">
              Discover services, products, properties, freelancers, events and opportunities — all in one growing
              digital ecosystem.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onGetStarted}
                className="group flex items-center justify-center gap-3 bg-[#D4AF37] px-7 py-4 font-bold text-black transition hover:bg-[#E5C45A]"
              >
                Explore ASH
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => scrollTo("ecosystem")}
                className="flex items-center justify-center gap-2 border border-white/15 px-7 py-4 font-medium text-white transition hover:border-white/30 hover:bg-white/5"
              >
                Discover the ecosystem
                <ChevronDown size={17} />
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-white/40">
              <span className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#D4AF37]" />
                Built around trust
              </span>

              <span className="flex items-center gap-2">
                <Wallet size={15} className="text-[#D4AF37]" />
                Mobile money ready
              </span>

              <span className="flex items-center gap-2">
                <Sparkles size={15} className="text-[#D4AF37]" />
                ASH AI
              </span>
            </div>
          </div>

          {/* RIGHT — ASH ORB */}
          <div className="relative mx-auto flex w-full max-w-[550px] items-center justify-center">
            <div className="absolute h-[430px] w-[430px] rounded-full border border-[#D4AF37]/10" />
            <div className="absolute h-[350px] w-[350px] rounded-full border border-[#D4AF37]/10" />
            <div className="absolute h-[275px] w-[275px] rounded-full bg-[#D4AF37]/5 blur-2xl" />

            {/* orbit points */}
            <div className="absolute right-[12%] top-[18%] flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF37]/25 bg-black/80 text-[#D4AF37] backdrop-blur-xl">
              <Store size={19} />
            </div>

            <div className="absolute bottom-[17%] left-[13%] flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF37]/25 bg-black/80 text-[#D4AF37] backdrop-blur-xl">
              <Building2 size={19} />
            </div>

            <div className="absolute bottom-[12%] right-[18%] flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF37]/25 bg-black/80 text-[#D4AF37] backdrop-blur-xl">
              <BriefcaseBusiness size={19} />
            </div>

            {/* MAIN ORB */}
            <div className="relative flex h-[260px] w-[260px] items-center justify-center rounded-full border border-[#D4AF37]/40 bg-gradient-to-br from-[#17120A] via-black to-[#0C0614] shadow-[0_0_100px_rgba(212,175,55,0.14)]">
              <div className="absolute inset-[20px] rounded-full border border-white/5" />

              <div className="text-center">
                <div className="text-7xl font-black tracking-[-0.08em] text-[#D4AF37]">A</div>

                <div className="mt-1 text-[10px] uppercase tracking-[0.45em] text-white/40">ASH</div>

                <div className="mt-4 text-xs text-white/40">One ecosystem</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-white/25 md:flex">
          Scroll to explore
          <div className="h-8 w-px bg-gradient-to-b from-[#D4AF37]/50 to-transparent" />
        </div>
      </section>

      {/* =========================================================
          DISCOVERY STRIP
      ========================================================= */}
      <section id="discover" className="border-y border-white/10 bg-[#090909]">
        <div className="mx-auto max-w-7xl px-5 py-7 md:px-8">
          <div className="grid gap-5 md:grid-cols-4">
            {[
              ["01", "Discover", "Find opportunities around you."],
              ["02", "Connect", "Meet people, businesses and professionals."],
              ["03", "Create", "Sell, offer services or build projects."],
              ["04", "Earn", "Turn connections into opportunity."],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-4 border-l border-white/10 pl-4">
                <span className="text-xs text-[#D4AF37]">{number}</span>

                <div>
                  <h3 className="text-sm font-bold">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-white/35">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          ECOSYSTEM
      ========================================================= */}
      <section id="ecosystem" className="relative px-5 py-28 md:px-8 md:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">The ASH ecosystem</p>

            <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] md:text-6xl">
              More than a marketplace.
              <br />
              <span className="text-white/35">A connected ecosystem.</span>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/45">
              ASH brings everyday services, commerce, property, freelance, events and earning opportunities into one
              digital environment.
            </p>
          </div>

          <div className="mt-16 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {ecosystem.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  className="group relative min-h-[230px] bg-[#080808] p-7 text-left transition hover:bg-[#0D0D0D]"
                >
                  <div className="flex h-11 w-11 items-center justify-center border border-white/10 text-[#D4AF37] transition group-hover:border-[#D4AF37]/40 group-hover:bg-[#D4AF37]/10">
                    <Icon size={20} />
                  </div>

                  <h3 className="mt-8 text-xl font-bold">{item.title}</h3>

                  <p className="mt-3 max-w-xs text-sm leading-6 text-white/40">{item.description}</p>

                  <ArrowUpRight
                    size={18}
                    className="absolute right-7 top-7 text-white/20 transition group-hover:text-[#D4AF37]"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          MARKETPLACE / SERVICES
      ========================================================= */}
      <section
        id="services"
        className="relative overflow-hidden border-y border-white/10 bg-[#080808] px-5 py-28 md:px-8 md:py-36"
      >
        <div className="pointer-events-none absolute right-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-[#4B0082]/10 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">ASH Marketplace</p>

              <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] md:text-6xl">
                Find someone who
                <br />
                <span className="text-[#D4AF37]">can do it.</span>
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/45">
                Browse trusted professionals, explore their work, compare services and connect directly.
              </p>
            </div>

            <button
              onClick={onGetStarted}
              className="group flex items-center gap-3 border border-white/15 px-6 py-3 text-sm font-semibold transition hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5"
            >
              Explore marketplace
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category, index) => {
              const Icon = category.icon;

              return (
                <div
                  key={category.title}
                  className="group relative overflow-hidden border border-white/10 bg-black p-6 transition hover:-translate-y-1 hover:border-[#D4AF37]/30"
                >
                  <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[#D4AF37]/5 blur-2xl transition group-hover:bg-[#D4AF37]/10" />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <Icon size={22} className="text-[#D4AF37]" />

                      <span className="text-[10px] text-white/20">0{index + 1}</span>
                    </div>

                    <h3 className="mt-16 text-lg font-bold">{category.title}</h3>

                    <p className="mt-3 text-sm leading-6 text-white/35">{category.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          PROPERTY
      ========================================================= */}
      <section id="property" className="px-5 py-28 md:px-8 md:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-[#17120A] via-[#090909] to-[#100818] p-8 md:p-14 lg:p-20">
            <div className="absolute right-[-120px] top-[-120px] h-[400px] w-[400px] rounded-full bg-[#D4AF37]/10 blur-[100px]" />

            <div className="relative grid gap-12 lg:grid-cols-[1fr_.7fr] lg:items-end">
              <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
                  <Building2 size={22} />
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">ASH Property</p>

                <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] md:text-6xl">
                  Find your
                  <br />
                  <span className="text-white/40">next place.</span>
                </h2>

                <p className="mt-6 max-w-xl text-base leading-7 text-white/45">
                  Student housing, apartments, houses, rentals, property for sale and land — discover it all in one
                  place.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {["Student housing", "Apartments & rentals", "Houses for sale", "Land & opportunities"].map((item) => (
                  <button
                    key={item}
                    onClick={onGetStarted}
                    className="group flex items-center justify-between border border-white/10 bg-black/30 px-5 py-4 text-left transition hover:border-[#D4AF37]/30 hover:bg-black/50"
                  >
                    <span className="text-sm text-white/65">{item}</span>

                    <ArrowUpRight size={16} className="text-white/25 transition group-hover:text-[#D4AF37]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          REFER & EARN
      ========================================================= */}
      <section id="refer" className="border-y border-white/10 bg-[#070707] px-5 py-28 md:px-8 md:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">ASH Refer</p>

              <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] md:text-6xl">
                Your network
                <br />
                <span className="text-[#D4AF37]">can earn with you.</span>
              </h2>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/45">
                Activate your ASH account once, share your unique referral link and earn commissions as your network
                grows.
              </p>

              <div className="mt-8 border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-5">
                <div className="flex items-start gap-4">
                  <CircleDollarSign className="mt-0.5 shrink-0 text-[#D4AF37]" size={22} />

                  <div>
                    <p className="text-sm font-bold">One-time activation</p>

                    <p className="mt-1 text-2xl font-black text-[#D4AF37]">5,000 XAF</p>

                    <p className="mt-1 text-xs leading-5 text-white/35">Activate once to unlock referral earnings.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onGetStarted}
                className="mt-8 group flex items-center gap-3 bg-[#D4AF37] px-7 py-4 font-bold text-black transition hover:bg-[#E5C45A]"
              >
                Start earning
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <div className="space-y-3">
              {referralLevels.map((item) => (
                <div
                  key={item.level}
                  className="group grid grid-cols-[55px_1fr_auto] items-center gap-5 border border-white/10 bg-black p-5 transition hover:border-[#D4AF37]/30 md:p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center border border-[#D4AF37]/20 bg-[#D4AF37]/5 text-sm font-bold text-[#D4AF37]">
                    {item.level}
                  </div>

                  <div>
                    <h3 className="font-bold">{item.title}</h3>

                    <p className="mt-1 text-xs leading-5 text-white/35">{item.description}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-[#D4AF37]">{item.amount}</div>

                    <div className="text-[9px] uppercase tracking-wider text-white/25">XAF</div>
                  </div>
                </div>
              ))}

              <div className="mt-5 flex items-center gap-3 px-2 text-xs text-white/30">
                <Network size={15} className="text-[#D4AF37]" />
                Three levels. One connected network.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}
      <section className="px-5 py-28 md:px-8 md:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">Simple by design</p>

            <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] md:text-6xl">
              One place.
              <br />
              <span className="text-white/35">Endless possibilities.</span>
            </h2>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-4">
            {[
              {
                number: "01",
                title: "Create",
                copy: "Create your ASH account in minutes.",
              },
              {
                number: "02",
                title: "Discover",
                copy: "Explore people, services, products and opportunities.",
              },
              {
                number: "03",
                title: "Connect",
                copy: "Chat, book, buy, sell or collaborate.",
              },
              {
                number: "04",
                title: "Grow",
                copy: "Build your network and unlock new opportunities.",
              },
            ].map((step) => (
              <div key={step.number} className="border border-white/10 bg-[#080808] p-7">
                <div className="text-sm font-bold text-[#D4AF37]">{step.number}</div>

                <h3 className="mt-14 text-xl font-bold">{step.title}</h3>

                <p className="mt-3 text-sm leading-6 text-white/35">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          ASH AI
      ========================================================= */}
      <section className="overflow-hidden border-y border-white/10 bg-[#080808] px-5 py-28 md:px-8 md:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-14 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <div className="flex h-12 w-12 items-center justify-center border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
                <Sparkles size={22} />
              </div>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">ASH AI</p>

              <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] md:text-6xl">
                Ask.
                <br />
                <span className="text-white/35">ASH knows where to look.</span>
              </h2>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/45">
                Your intelligent guide through the ASH ecosystem. Ask about services, opportunities, bookings, earnings,
                events and more.
              </p>
            </div>

            {/* AI MOCKUP */}
            <div className="relative">
              <div className="absolute -inset-10 rounded-full bg-[#4B0082]/10 blur-[100px]" />

              <div className="relative border border-white/10 bg-black shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4AF37] text-black">
                      <Sparkles size={15} />
                    </div>

                    <div>
                      <div className="text-sm font-bold">ASH AI</div>

                      <div className="text-[10px] text-white/30">Your opportunity assistant</div>
                    </div>
                  </div>

                  <div className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                </div>

                <div className="space-y-5 p-5 md:p-7">
                  <div className="max-w-[80%] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs leading-6 text-white/55">Find me a trusted beauty professional near me.</p>
                  </div>

                  <div className="ml-auto max-w-[85%] border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] p-4">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                      <ShieldCheck size={12} />
                      ASH recommendation
                    </div>

                    <p className="text-xs leading-6 text-white/65">
                      I found verified professionals matching your request. You can compare their services, reviews and
                      availability before booking.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {["Find a service", "Explore deals", "Check my earnings", "Find property"].map((item) => (
                      <button
                        key={item}
                        className="border border-white/10 px-3 py-2 text-[10px] text-white/40 transition hover:border-[#D4AF37]/30 hover:text-white"
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 border-t border-white/10 pt-5">
                    <div className="flex-1 border border-white/10 px-4 py-3 text-xs text-white/20">
                      Ask ASH anything…
                    </div>

                    <button className="flex h-11 w-11 items-center justify-center bg-[#D4AF37] text-black">
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          TRUST
      ========================================================= */}
      <section className="px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Built around trust",
                copy: "Verified profiles, reviews and safer transactions help people connect with confidence.",
              },
              {
                icon: Wallet,
                title: "Mobile money native",
                copy: "ASH is designed around the payment methods people already use every day.",
              },
              {
                icon: MessageCircle,
                title: "Direct connection",
                copy: "Chat with providers, sellers, property owners and collaborators without unnecessary barriers.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="bg-[#080808] p-7 md:p-9">
                  <Icon size={22} className="text-[#D4AF37]" />

                  <h3 className="mt-7 text-lg font-bold">{item.title}</h3>

                  <p className="mt-3 text-sm leading-6 text-white/35">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          FINAL CTA
      ========================================================= */}
      <section className="relative overflow-hidden px-5 pb-20 pt-10 md:px-8 md:pb-32">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden border border-[#D4AF37]/20 bg-gradient-to-br from-[#17120A] via-[#0B0B0B] to-[#100818] px-6 py-20 text-center md:px-12 md:py-28">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/10 blur-[110px]" />

            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#D4AF37]">Welcome to ASH</p>

              <h2 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-[-0.05em] md:text-7xl">
                Your next opportunity
                <br />
                could be one connection away.
              </h2>

              <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-white/40 md:text-base">
                Discover what is possible when people, businesses, professionals and opportunities come together.
              </p>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={onGetStarted}
                  className="group flex items-center justify-center gap-3 bg-[#D4AF37] px-8 py-4 font-bold text-black transition hover:bg-[#E5C45A]"
                >
                  Create your ASH account
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => scrollTo("ecosystem")}
                  className="border border-white/15 px-8 py-4 font-medium text-white transition hover:bg-white/5"
                >
                  Explore ASH
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="border-t border-white/10 bg-black px-5 py-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-[1fr_auto_auto_auto]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center border border-[#D4AF37]/40 text-[#D4AF37]">
                  <span className="font-black">A</span>
                </div>

                <span className="font-black tracking-[0.18em]">ASH</span>
              </div>

              <p className="mt-5 max-w-sm text-xs leading-6 text-white/30">
                Where opportunities connect. Discover, connect, create and grow with ASH.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">Explore</h4>

              <div className="mt-4 space-y-3 text-xs text-white/30">
                <button onClick={() => scrollTo("ecosystem")} className="block hover:text-white">
                  Marketplace
                </button>

                <button onClick={() => scrollTo("services")} className="block hover:text-white">
                  Services
                </button>

                <button onClick={() => scrollTo("property")} className="block hover:text-white">
                  Property
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">Opportunities</h4>

              <div className="mt-4 space-y-3 text-xs text-white/30">
                <button className="block hover:text-white">Freelance</button>

                <button className="block hover:text-white">Events</button>

                <button className="block hover:text-white">Deals</button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">Account</h4>

              <div className="mt-4 space-y-3 text-xs text-white/30">
                <button onClick={onSignIn} className="block hover:text-white">
                  Sign in
                </button>

                <button onClick={onGetStarted} className="block hover:text-white">
                  Create account
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-[10px] text-white/20 sm:flex-row">
            <span>© {new Date().getFullYear()} ASH Glo. All rights reserved.</span>

            <span>ASH — Where Opportunities Connect.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
