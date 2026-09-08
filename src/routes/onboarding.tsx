import { useEffect, useState, type ElementType, type ReactNode } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
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
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      {
        title: "Welcome to ASH Glo",
      },
      {
        name: "description",
        content: "Discover services, jobs, products, property, payments and opportunities with ASH Glo.",
      },
    ],
  }),
  component: OnboardingPage,
});

type OnboardingItem = {
  title: string;
  description: string;
  icon: ElementType;
  accent: string;
};

type Slide = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  items: OnboardingItem[];
  visual: ReactNode;
};

const STORAGE_KEY = "ash_glo_onboarding_completed";

function Mark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 shadow-[0_0_35px_rgba(236,72,153,0.26)]">
        <div className="absolute inset-[1px] rounded-[15px] bg-[#090913]/25" />
        <span className="relative font-display text-[25px] font-black text-white">A</span>
      </div>

      <div>
        <div className="font-display text-[18px] font-black tracking-tight text-white">
          ASH <span className="text-pink-400">Glo</span>
        </div>

        <div className="mt-0.5 text-[10px] font-medium tracking-wide text-white/40">Where Opportunities Connect</div>
      </div>
    </div>
  );
}

function FeaturePill({ item, featured = false }: { item: OnboardingItem; featured?: boolean }) {
  const Icon = item.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[22px] border px-3.5 py-3 transition-all duration-300",
        featured
          ? "border-white/12 bg-white/[0.075] shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
          : "border-white/[0.07] bg-white/[0.035]",
      )}
    >
      <div className={cn("grid size-10 shrink-0 place-items-center rounded-[16px]", item.accent)}>
        <Icon className="size-[17px] text-white" strokeWidth={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>

        <p className="mt-0.5 truncate text-[10px] leading-4 text-white/40">{item.description}</p>
      </div>

      <ChevronRight className="size-4 shrink-0 text-white/25" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 1                                                                  */
/* -------------------------------------------------------------------------- */

function DiscoverVisual() {
  return (
    <div className="relative mx-auto mt-6 w-full max-w-[360px]">
      <div className="absolute -inset-8 rounded-full bg-fuchsia-500/10 blur-[70px]" />

      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4">
        <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Search className="size-4 text-white/45" />

            <span className="flex-1 text-[12px] text-white/35">Search on ASH Glo...</span>

            <div className="size-2 rounded-full bg-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.8)]" />
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 rounded-[20px] bg-pink-500/[0.08] px-4 py-3.5">
            <div className="grid size-10 place-items-center rounded-[14px] bg-pink-500/15">
              <ShoppingBag className="size-[17px] text-pink-300" />
            </div>

            <div className="flex-1">
              <p className="text-[12px] font-semibold text-white">MacBook Pro</p>
              <p className="mt-0.5 text-[10px] text-white/35">Douala · Marketplace</p>
            </div>

            <span className="text-[10px] font-bold text-pink-300">650K</span>
          </div>

          <div className="flex items-center gap-3 rounded-[20px] bg-violet-500/[0.08] px-4 py-3.5">
            <div className="grid size-10 place-items-center rounded-[14px] bg-violet-500/15">
              <BriefcaseBusiness className="size-[17px] text-violet-300" />
            </div>

            <div className="flex-1">
              <p className="text-[12px] font-semibold text-white">Frontend Developer</p>
              <p className="mt-0.5 text-[10px] text-white/35">Yaoundé · Jobs</p>
            </div>

            <span className="text-[10px] font-semibold text-violet-300">New</span>
          </div>

          <div className="flex items-center gap-3 rounded-[20px] bg-emerald-500/[0.08] px-4 py-3.5">
            <div className="grid size-10 place-items-center rounded-[14px] bg-emerald-500/15">
              <House className="size-[17px] text-emerald-300" />
            </div>

            <div className="flex-1">
              <p className="text-[12px] font-semibold text-white">Student Apartment</p>
              <p className="mt-0.5 text-[10px] text-white/35">Buea · Property</p>
            </div>

            <MapPin className="size-4 text-emerald-300/70" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[9px] text-white/25">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Live opportunities around you
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 2                                                                  */
/* -------------------------------------------------------------------------- */

function EverydayVisual() {
  return (
    <div className="mx-auto mt-6 w-full max-w-[360px]">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[27px] border border-white/10 bg-white/[0.035] p-5">
          <div className="grid size-12 place-items-center rounded-[17px] bg-blue-500/10">
            <CreditCard className="size-5 text-blue-300" />
          </div>

          <p className="mt-5 text-[13px] font-semibold text-white">Utility bills</p>

          <p className="mt-1.5 text-[10px] leading-4 text-white/38">Electricity, water, internet and more.</p>

          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1.5 text-[9px] font-semibold text-blue-200">
            <CheckCircle2 className="size-3" />
            Pay securely
          </div>
        </div>

        <div className="rounded-[27px] border border-white/10 bg-white/[0.035] p-5">
          <div className="grid size-12 place-items-center rounded-[17px] bg-pink-500/10">
            <CalendarDays className="size-5 text-pink-300" />
          </div>

          <p className="mt-5 text-[13px] font-semibold text-white">Book services</p>

          <p className="mt-1.5 text-[10px] leading-4 text-white/38">Find a provider and schedule what you need.</p>

          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-pink-500/10 px-3 py-1.5 text-[9px] font-semibold text-pink-200">
            Book now
            <ArrowRight className="size-3" />
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[27px] border border-white/10 bg-gradient-to-r from-violet-500/[0.09] via-fuchsia-500/[0.08] to-pink-500/[0.09] p-5">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-[17px] bg-fuchsia-500/10">
            <CircleDollarSign className="size-5 text-fuchsia-300" />
          </div>

          <div>
            <p className="text-[13px] font-semibold text-white">Connected everyday life</p>

            <p className="mt-1 text-[10px] leading-4 text-white/38">
              Payments, services, housing and useful connections in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 3                                                                  */
/* -------------------------------------------------------------------------- */

function EarnVisual() {
  return (
    <div className="relative mx-auto mt-6 w-full max-w-[360px]">
      <div className="absolute -inset-10 rounded-full bg-pink-500/10 blur-[80px]" />

      <div className="relative overflow-hidden rounded-[30px] border border-pink-400/15 bg-gradient-to-br from-pink-500/[0.12] via-violet-500/[0.08] to-transparent p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-pink-300">Get monetized</p>

            <p className="mt-2 font-display text-[27px] font-black leading-[1.02] text-white">
              Your skills
              <br />
              can become
              <br />
              <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
                income.
              </span>
            </p>
          </div>

          <div className="grid size-12 place-items-center rounded-[17px] bg-pink-500/12">
            <Sparkles className="size-5 text-pink-300" />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-3 rounded-[19px] bg-black/20 px-4 py-3">
            <div className="grid size-9 place-items-center rounded-[13px] bg-blue-500/10">
              <Wrench className="size-4 text-blue-300" />
            </div>

            <span className="flex-1 text-[11px] font-medium text-white">Offer your service</span>

            <ArrowRight className="size-3.5 text-white/25" />
          </div>

          <div className="flex items-center gap-3 rounded-[19px] bg-black/20 px-4 py-3">
            <div className="grid size-9 place-items-center rounded-[13px] bg-pink-500/10">
              <Store className="size-4 text-pink-300" />
            </div>

            <span className="flex-1 text-[11px] font-medium text-white">Sell your products</span>

            <ArrowRight className="size-3.5 text-white/25" />
          </div>

          <div className="flex items-center gap-3 rounded-[19px] bg-black/20 px-4 py-3">
            <div className="grid size-9 place-items-center rounded-[13px] bg-emerald-500/10">
              <HandCoins className="size-4 text-emerald-300" />
            </div>

            <span className="flex-1 text-[11px] font-medium text-white">Earn from eligible referrals</span>

            <ArrowRight className="size-3.5 text-white/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide 4                                                                  */
/* -------------------------------------------------------------------------- */

function OpportunityVisual() {
  return (
    <div className="mx-auto mt-6 w-full max-w-[360px]">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[27px] border border-white/10 bg-white/[0.035] p-5">
          <div className="grid size-12 place-items-center rounded-[17px] bg-orange-500/10">
            <Building2 className="size-5 text-orange-300" />
          </div>

          <p className="mt-5 text-[13px] font-semibold text-white">Real estate</p>

          <p className="mt-1.5 text-[10px] leading-4 text-white/38">Homes, rentals, land and student housing.</p>
        </div>

        <div className="rounded-[27px] border border-white/10 bg-white/[0.035] p-5">
          <div className="grid size-12 place-items-center rounded-[17px] bg-violet-500/10">
            <BriefcaseBusiness className="size-5 text-violet-300" />
          </div>

          <p className="mt-5 text-[13px] font-semibold text-white">Find jobs</p>

          <p className="mt-1.5 text-[10px] leading-4 text-white/38">Work, freelance and new career opportunities.</p>
        </div>
      </div>

      <div className="mt-3 rounded-[27px] border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-[17px] bg-pink-500/10">
            <Users className="size-5 text-pink-300" />
          </div>

          <div className="flex-1">
            <p className="text-[13px] font-semibold text-white">People. Businesses. Events.</p>

            <p className="mt-1.5 text-[10px] leading-4 text-white/38">
              Discover useful connections and the opportunities around them.
            </p>
          </div>

          <ChevronRight className="size-4 text-white/25" />
        </div>
      </div>
    </div>
  );
}

const SLIDES: Slide[] = [
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
    description: "Find services, products, jobs, property and people without moving between different platforms.",
    items: [
      {
        title: "Marketplace",
        description: "Buy and sell products",
        icon: ShoppingBag,
        accent: "bg-pink-500",
      },
      {
        title: "Find Services",
        description: "Connect with professionals",
        icon: Wrench,
        accent: "bg-blue-500",
      },
      {
        title: "Find Jobs",
        description: "Discover work opportunities",
        icon: BriefcaseBusiness,
        accent: "bg-violet-500",
      },
      {
        title: "Real Estate",
        description: "Homes, rentals and land",
        icon: House,
        accent: "bg-orange-500",
      },
    ],
    visual: <DiscoverVisual />,
  },

  {
    eyebrow: "EVERYDAY LIFE",
    title: (
      <>
        Get things done.
        <br />
        <span className="text-white/50">In one connected place.</span>
      </>
    ),
    description: "Take care of everyday needs, discover useful services and connect to the people who can help.",
    items: [
      {
        title: "Pay Utility Bills",
        description: "Electricity, water, internet and more",
        icon: CreditCard,
        accent: "bg-blue-500",
      },
      {
        title: "Book Services",
        description: "Find and schedule trusted providers",
        icon: CalendarDays,
        accent: "bg-pink-500",
      },
      {
        title: "Mobile Money",
        description: "Pay and receive where available",
        icon: CircleDollarSign,
        accent: "bg-emerald-500",
      },
      {
        title: "Student Housing",
        description: "Find places near campus",
        icon: Building2,
        accent: "bg-cyan-500",
      },
    ],
    visual: <EverydayVisual />,
  },

  {
    eyebrow: "EARN",
    title: (
      <>
        What you know.
        <br />
        What you have.
        <br />
        <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
          Make it work for you.
        </span>
      </>
    ),
    description: "Turn your skills, products, services and eligible referral activity into opportunities to earn.",
    items: [
      {
        title: "Get Monetized",
        description: "Turn your activity into opportunity",
        icon: Sparkles,
        accent: "bg-emerald-500",
      },
      {
        title: "Offer Services",
        description: "Showcase what you do",
        icon: Wrench,
        accent: "bg-blue-500",
      },
      {
        title: "Sell Products",
        description: "Reach people looking to buy",
        icon: Store,
        accent: "bg-pink-500",
      },
      {
        title: "Refer & Earn",
        description: "Eligible referrals can generate commissions",
        icon: HandCoins,
        accent: "bg-violet-500",
      },
    ],
    visual: <EarnVisual />,
  },

  {
    eyebrow: "OPPORTUNITIES",
    title: (
      <>
        Your next opportunity
        <br />
        <span className="bg-gradient-to-r from-orange-300 via-pink-400 to-violet-400 bg-clip-text text-transparent">
          could already be here.
        </span>
      </>
    ),
    description: "Explore jobs, property, events, people and businesses — then connect with the right opportunity.",
    items: [
      {
        title: "Real Estate",
        description: "Find, rent, buy or sell",
        icon: Building2,
        accent: "bg-orange-500",
      },
      {
        title: "Find Jobs",
        description: "Work, freelance and projects",
        icon: BriefcaseBusiness,
        accent: "bg-violet-500",
      },
      {
        title: "Events",
        description: "Discover what is happening",
        icon: CalendarDays,
        accent: "bg-pink-500",
      },
      {
        title: "People & Businesses",
        description: "Build useful connections",
        icon: Users,
        accent: "bg-cyan-500",
      },
    ],
    visual: <OpportunityVisual />,
  },
];

function markOnboardingComplete() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Ignore unavailable storage.
  }
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [direction, setDirection] = useState<"next" | "back">("next");

  useEffect(() => {
    setReady(true);
  }, []);

  function complete() {
    markOnboardingComplete();

    void navigate({
      to: "/register",
    });
  }

  function goNext() {
    if (step === SLIDES.length - 1) {
      complete();
      return;
    }

    setDirection("next");
    setStep((current) => current + 1);
  }

  function goBack() {
    if (step === 0) {
      return;
    }

    setDirection("back");
    setStep((current) => current - 1);
  }

  if (!ready) {
    return <main className="min-h-[100svh] bg-[#070711]" />;
  }

  const slide = SLIDES[step];

  return (
    <main className="min-h-[100svh] overflow-hidden bg-[#070711] text-white">
      <div className="relative min-h-[100svh]">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-20 size-80 rounded-full bg-pink-600/10 blur-[110px]" />
          <div className="absolute -right-28 top-[24%] size-96 rounded-full bg-violet-600/10 blur-[120px]" />
          <div className="absolute -bottom-32 left-1/4 size-96 rounded-full bg-fuchsia-600/10 blur-[120px]" />

          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/[0.025] to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[460px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-[calc(env(safe-area-inset-top)+18px)]">
          {/* Header */}
          <header className="flex items-center justify-between">
            <Mark />

            <button
              type="button"
              onClick={complete}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/65 backdrop-blur-sm transition hover:bg-white/[0.075] hover:text-white active:scale-95"
            >
              Skip
            </button>
          </header>

          {/* Progress */}
          <div className="mt-7 flex items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to onboarding slide ${index + 1}`}
                  onClick={() => {
                    setDirection(index >= step ? "next" : "back");
                    setStep(index);
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    index === step ? "w-8 bg-gradient-to-r from-pink-500 to-violet-500" : "w-1.5 bg-white/10",
                  )}
                />
              ))}
            </div>

            <span className="text-[10px] font-semibold text-white/25">
              {step + 1}/{SLIDES.length}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain pb-3 pt-9 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div
              key={step}
              className={cn(
                "will-change-transform",
                direction === "next"
                  ? "animate-[ashOnboardingNext_.42s_ease-out]"
                  : "animate-[ashOnboardingBack_.42s_ease-out]",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-pink-400">{slide.eyebrow}</p>

              <h1 className="mt-3 max-w-[420px] font-display text-[35px] font-black leading-[1.04] tracking-[-0.045em] text-white">
                {slide.title}
              </h1>

              <p className="mt-4 max-w-[420px] text-[14px] leading-6 text-white/45">{slide.description}</p>

              {/* Curved options */}
              <div className="mt-7 space-y-2.5">
                {slide.items.map((item, index) => (
                  <FeaturePill key={item.title} item={item} featured={index === 0} />
                ))}
              </div>

              {/* Visual */}
              {slide.visual}
            </div>
          </div>

          {/* Bottom action */}
          <div className="mt-4">
            <button
              type="button"
              onClick={goNext}
              className="group flex w-full items-center justify-center gap-3 rounded-[20px] bg-gradient-to-r from-pink-500 via-rose-500 to-violet-500 px-5 py-4 text-sm font-bold text-white shadow-[0_16px_45px_rgba(236,72,153,0.2)] transition-all duration-300 hover:shadow-[0_20px_58px_rgba(236,72,153,0.3)] active:scale-[0.985]"
            >
              <span>{step === SLIDES.length - 1 ? "Create your account" : "Continue"}</span>

              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>

            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="mt-2 w-full py-2 text-[11px] font-medium text-white/30 transition hover:text-white/60"
              >
                Back
              </button>
            ) : (
              <div className="h-6" />
            )}

            <p className="mt-1 text-center text-[10px] text-white/20">ASH Glo · Where Opportunities Connect</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ashOnboardingNext {
          from {
            opacity: 0;
            transform: translateX(18px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes ashOnboardingBack {
          from {
            opacity: 0;
            transform: translateX(-18px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}
