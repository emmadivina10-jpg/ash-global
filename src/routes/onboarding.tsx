import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  House,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      {
        title: "Welcome to ASH Glo",
      },
      {
        name: "description",
        content: "Discover services, jobs, products, property and opportunities with ASH Glo.",
      },
    ],
  }),
  component: OnboardingPage,
});

type OnboardingItem = {
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
};

type OnboardingSlide = {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  items: OnboardingItem[];
  visual: React.ReactNode;
};

const STORAGE_KEY = "ash_glo_onboarding_completed";

function Mark() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 shadow-[0_0_30px_rgba(236,72,153,0.28)]">
        <span className="font-display text-2xl font-black text-white">A</span>
      </div>

      <div>
        <div className="font-display text-[18px] font-black tracking-tight text-white">
          ASH <span className="text-pink-400">Glo</span>
        </div>

        <div className="text-[10px] font-medium tracking-wide text-white/45">Where Opportunities Connect</div>
      </div>
    </div>
  );
}

function Pill({ item, active }: { item: OnboardingItem; active?: boolean }) {
  const Icon = item.icon;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-full border px-3 py-2.5 transition-all duration-300",
        active
          ? "border-white/15 bg-white/[0.08] shadow-[0_8px_35px_rgba(0,0,0,0.18)]"
          : "border-white/[0.07] bg-white/[0.035]",
      )}
    >
      <div className={cn("grid size-9 shrink-0 place-items-center rounded-full", item.accent)}>
        <Icon className="size-4 text-white" strokeWidth={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
        <p className="truncate text-[10px] text-white/45">{item.description}</p>
      </div>

      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.05]">
        <ChevronRight className="size-3.5 text-white/55" />
      </div>
    </div>
  );
}

function SearchVisual() {
  return (
    <div className="relative mx-auto mt-2 w-full max-w-[340px]">
      <div className="absolute -inset-8 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <Search className="size-4 text-white/45" />
          <span className="text-xs text-white/40">Search ASH Glo</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-2xl bg-pink-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <ShoppingBag className="size-4 text-pink-300" />
              <div>
                <p className="text-xs font-semibold text-white">Laptop repair</p>
                <p className="text-[10px] text-white/40">Douala · Services</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-white/30" />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-violet-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <BriefcaseBusiness className="size-4 text-violet-300" />
              <div>
                <p className="text-xs font-semibold text-white">Frontend Developer</p>
                <p className="text-[10px] text-white/40">Yaoundé · Jobs</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-white/30" />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <House className="size-4 text-emerald-300" />
              <div>
                <p className="text-xs font-semibold text-white">Student apartment</p>
                <p className="text-[10px] text-white/40">Buea · Property</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-white/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EverydayVisual() {
  return (
    <div className="mx-auto mt-2 w-full max-w-[340px]">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-6 grid size-11 place-items-center rounded-2xl bg-blue-500/15">
            <CreditCard className="size-5 text-blue-300" />
          </div>

          <p className="text-xs font-semibold text-white">Utilities</p>

          <p className="mt-1 text-[10px] leading-4 text-white/40">Electricity, water, internet and more.</p>

          <div className="mt-5 rounded-full bg-blue-500/10 px-3 py-1.5 text-[9px] font-semibold text-blue-200">
            Pay securely
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-6 grid size-11 place-items-center rounded-2xl bg-pink-500/15">
            <CalendarDays className="size-5 text-pink-300" />
          </div>

          <p className="text-xs font-semibold text-white">Book</p>

          <p className="mt-1 text-[10px] leading-4 text-white/40">Connect with providers and schedule services.</p>

          <div className="mt-5 rounded-full bg-pink-500/10 px-3 py-1.5 text-[9px] font-semibold text-pink-200">
            Book a service
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[26px] border border-white/10 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 p-5">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-fuchsia-500/15">
            <MapPin className="size-5 text-fuchsia-300" />
          </div>

          <div>
            <p className="text-xs font-semibold text-white">Everything connectedhhhhhhhhhh</p>
            <p className="mt-1 text-[10px] leading-4 text-white/40">
              People, services, places and everyday needs in one ecosystem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EarnVisual() {
  return (
    <div className="mx-auto mt-2 w-full max-w-[340px]">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-pink-500/15 via-violet-500/10 to-transparent p-6">
        <div className="absolute -right-12 -top-12 size-36 rounded-full bg-pink-500/15 blur-3xl" />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pink-300">Your opportunity</p>
            <p className="mt-2 font-display text-2xl font-black text-white">
              Turn skills
              <br />
              into <span className="text-pink-400">income.</span>
            </p>
          </div>

          <div className="grid size-12 place-items-center rounded-2xl bg-pink-500/15">
            <CircleDollarSign className="size-5 text-pink-300" />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <Store className="size-4 text-pink-300" />
              <span className="text-xs font-medium text-white">Offer a service</span>
            </div>
            <ArrowRight className="size-4 text-white/25" />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <ShoppingBag className="size-4 text-violet-300" />
              <span className="text-xs font-medium text-white">Sell products</span>
            </div>
            <ArrowRight className="size-4 text-white/25" />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <HandCoins className="size-4 text-emerald-300" />
              <span className="text-xs font-medium text-white">Eligible referral earnings</span>
            </div>
            <ArrowRight className="size-4 text-white/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunityVisual() {
  return (
    <div className="mx-auto mt-2 w-full max-w-[340px]">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
          <div className="grid size-11 place-items-center rounded-2xl bg-orange-500/15">
            <Building2 className="size-5 text-orange-300" />
          </div>

          <p className="mt-5 text-xs font-semibold text-white">Property</p>

          <p className="mt-1 text-[10px] leading-4 text-white/40">Find homes, rentals, land and student housing.</p>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
          <div className="grid size-11 place-items-center rounded-2xl bg-violet-500/15">
            <BriefcaseBusiness className="size-5 text-violet-300" />
          </div>

          <p className="mt-5 text-xs font-semibold text-white">Jobs</p>

          <p className="mt-1 text-[10px] leading-4 text-white/40">
            Discover work, freelance and business opportunities.
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-center gap-4">
          <div className="grid size-11 place-items-center rounded-2xl bg-cyan-500/10">
            <Users className="size-5 text-cyan-300" />
          </div>

          <div className="flex-1">
            <p className="text-xs font-semibold text-white">People & businesses</p>
            <p className="mt-1 text-[10px] leading-4 text-white/40">
              Discover the people behind the opportunity and connect directly.
            </p>
          </div>

          <ChevronRight className="size-4 text-white/25" />
        </div>
      </div>
    </div>
  );
}

const SLIDES: OnboardingSlide[] = [
  {
    eyebrow: "DISCOVER",
    title: (
      <>
        Everything you need.
        <br />
        <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
          Everyone you can reach.
        </span>
      </>
    ),
    description: "Find services, products, jobs, property, people and opportunities in one place.",
    items: [
      {
        title: "Marketplace",
        description: "Buy and sell products",
        icon: ShoppingBag,
        accent: "bg-pink-500/85",
      },
      {
        title: "Find Services",
        description: "Connect with professionals",
        icon: Wrench,
        accent: "bg-blue-500/80",
      },
      {
        title: "Find Jobs",
        description: "Discover work opportunities",
        icon: BriefcaseBusiness,
        accent: "bg-violet-500/80",
      },
      {
        title: "Real Estate",
        description: "Homes, rentals and land",
        icon: House,
        accent: "bg-orange-500/80",
      },
    ],
    visual: <SearchVisual />,
  },

  {
    eyebrow: "EVERYDAY LIFE",
    title: (
      <>
        Get things done.
        <br />
        <span className="text-white/55">Without jumping everywhere.</span>
      </>
    ),
    description: "Use one platform to handle useful everyday connections, services and payments.",
    items: [
      {
        title: "Pay Utility Bills",
        description: "Electricity, water, internet and more",
        icon: CreditCard,
        accent: "bg-blue-500/85",
      },
      {
        title: "Book Services",
        description: "Connect and schedule with providers",
        icon: CalendarDays,
        accent: "bg-pink-500/85",
      },
      {
        title: "Mobile Money",
        description: "Pay and receive where available",
        icon: CircleDollarSign,
        accent: "bg-emerald-500/85",
      },
      {
        title: "Student Housing",
        description: "Find places near campus",
        icon: Building2,
        accent: "bg-cyan-500/85",
      },
    ],
    visual: <EverydayVisual />,
  },

  {
    eyebrow: "EARN & BUILD",
    title: (
      <>
        What you know.
        <br />
        What you have.
        <br />
        <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
          Turn it into opportunity.
        </span>
      </>
    ),
    description:
      "Showcase your skills, offer services, sell products and participate in eligible earning opportunities.",
    items: [
      {
        title: "Get Monetized",
        description: "Turn your activity into opportunity",
        icon: Sparkles,
        accent: "bg-emerald-500/85",
      },
      {
        title: "Offer Services",
        description: "Let people discover what you do",
        icon: Wrench,
        accent: "bg-blue-500/85",
      },
      {
        title: "Sell Products",
        description: "Reach people looking for what you sell",
        icon: ShoppingBag,
        accent: "bg-pink-500/85",
      },
      {
        title: "Refer & Earn",
        description: "Eligible referrals can generate commissions",
        icon: HandCoins,
        accent: "bg-violet-500/85",
      },
    ],
    visual: <EarnVisual />,
  },

  {
    eyebrow: "OPPORTUNITIES",
    title: (
      <>
        Your next
        <br />
        <span className="bg-gradient-to-r from-orange-300 via-pink-400 to-violet-400 bg-clip-text text-transparent">
          opportunity is out there.
        </span>
      </>
    ),
    description: "Explore property, jobs, events, businesses and people — then connect with the right opportunity.",
    items: [
      {
        title: "Real Estate",
        description: "Find, rent, buy or sell",
        icon: Building2,
        accent: "bg-orange-500/85",
      },
      {
        title: "Find Jobs",
        description: "Work, freelance and projects",
        icon: BriefcaseBusiness,
        accent: "bg-violet-500/85",
      },
      {
        title: "Events",
        description: "Discover what is happening",
        icon: CalendarDays,
        accent: "bg-pink-500/85",
      },
      {
        title: "People & Businesses",
        description: "Build useful connections",
        icon: Users,
        accent: "bg-cyan-500/85",
      },
    ],
    visual: <OpportunityVisual />,
  },
];

function completeOnboarding() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Storage can be unavailable in private/restricted contexts.
  }
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  const slide = SLIDES[step];

  useEffect(() => {
    setMounted(true);
  }, []);

  const progressLabel = useMemo(() => `${step + 1} / ${SLIDES.length}`, [step]);

  function skip() {
    completeOnboarding();
    void navigate({
      to: "/register",
    });
  }

  function next() {
    if (step < SLIDES.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    completeOnboarding();

    void navigate({
      to: "/register",
    });
  }

  if (!mounted) {
    return <main className="min-h-[100svh] bg-[#070711]" />;
  }

  return (
    <main className="min-h-[100svh] overflow-hidden bg-[#070711] text-white">
      <div className="relative min-h-[100svh]">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-16 size-72 rounded-full bg-pink-600/10 blur-[90px]" />
          <div className="absolute -right-24 top-[20%] size-80 rounded-full bg-violet-600/10 blur-[100px]" />
          <div className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-fuchsia-600/10 blur-[100px]" />

          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.025] to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[460px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-[calc(env(safe-area-inset-top)+18px)]">
          {/* Top */}
          <header className="flex items-center justify-between">
            <Mark />

            <button
              type="button"
              onClick={skip}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur-sm transition hover:bg-white/[0.08] hover:text-white active:scale-95"
            >
              Skip
            </button>
          </header>

          {/* Progress */}
          <div className="mt-7 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-500"
                style={{
                  width: `${((step + 1) / SLIDES.length) * 100}%`,
                }}
              />
            </div>

            <span className="text-[10px] font-semibold tracking-wide text-white/35">{progressLabel}</span>
          </div>

          {/* Main scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain pb-3 pt-9 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div key={step} className="animate-[ashIn_.45s_ease-out]">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-pink-400">{slide.eyebrow}</p>

              <h1 className="mt-3 font-display text-[36px] font-black leading-[1.03] tracking-[-0.04em] text-white">
                {slide.title}
              </h1>

              <p className="mt-4 max-w-[390px] text-[14px] leading-6 text-white/48">{slide.description}</p>

              <div className="mt-7 space-y-2.5">
                {slide.items.map((item, index) => (
                  <Pill key={item.title} item={item} active={index === 0} />
                ))}
              </div>

              <div className="mt-5">{slide.visual}</div>
            </div>
          </div>

          {/* Bottom action */}
          <div className="mt-4">
            <button
              type="button"
              onClick={next}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-violet-500 px-5 py-4 text-sm font-bold text-white shadow-[0_14px_40px_rgba(236,72,153,0.22)] transition-all duration-300 hover:shadow-[0_18px_55px_rgba(236,72,153,0.32)] active:scale-[0.985]"
            >
              <span>{step === SLIDES.length - 1 ? "Create your account" : "Continue"}</span>

              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to onboarding step ${index + 1}`}
                  onClick={() => setStep(index)}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    index === step ? "h-1.5 w-7 bg-pink-500" : "size-1.5 bg-white/15",
                  )}
                />
              ))}
            </div>

            <p className="mt-3 text-center text-[10px] text-white/25">ASH Glo · Where Opportunities Connect</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ashIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}
