import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Layers,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/refer/Logo";
import { Button } from "@/components/ui/button";
import { ACTIVATION_FEE, COMMISSIONS, MIN_WITHDRAWAL, formatXAF } from "@/lib/format";

const TITLE = "Refer — Earn referral rewards in XAF from your phone";
const DESCRIPTION =
  "Activate once for 5,000 XAF and earn 3 levels of referral commissions in Cameroon. Track your network and withdraw to MTN Mobile Money or Orange Money.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const LEVELS = [
  {
    level: 1,
    amount: COMMISSIONS[1],
    label: "Direct referrals",
    copy: "Everyone who joins with your link and activates.",
    members: 18,
  },
  {
    level: 2,
    amount: COMMISSIONS[2],
    label: "Second level",
    copy: "The people your referrals bring in.",
    members: 42,
  },
  {
    level: 3,
    amount: COMMISSIONS[3],
    label: "Third level",
    copy: "Your network keeps paying, three levels deep.",
    members: 96,
  },
];

const FEATURES = [
  { icon: Smartphone, title: "Mobile money native", copy: "Pay and get paid with MTN Mobile Money or Orange Money." },
  { icon: Layers, title: "Three earning levels", copy: "Commissions from your referrals, and theirs, and theirs." },
  { icon: Wallet, title: "Live wallet", copy: "Available balance, pending payouts and a full transaction ledger." },
  { icon: ShieldCheck, title: "Verified payments", copy: "Every activation is confirmed by the payment provider before rewards drop." },
  { icon: Users, title: "Network insights", copy: "See exactly who joined, who activated and what each level earns." },
  { icon: Banknote, title: "Fast withdrawals", copy: `Cash out from ${formatXAF(MIN_WITHDRAWAL)} straight to your mobile wallet.` },
];

const STEPS = [
  { title: "Create your account", copy: "Sign up in under a minute with your name, email and phone number." },
  { title: `Activate for ${formatXAF(ACTIVATION_FEE)}`, copy: "A single verified mobile money payment unlocks earning." },
  { title: "Share your link", copy: "Every member gets a unique referral code and shareable link." },
  { title: "Earn and withdraw", copy: "Commissions land in your wallet the moment a referral activates." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="shadow-[var(--shadow-card)]">
              <Link to="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero bento */}
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12 lg:pb-16">
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Primary hero tile */}
            <div className="tile-dark grain relative col-span-full flex flex-col justify-between p-7 sm:p-10 lg:col-span-7 lg:min-h-[26rem]">
              <div className="relative">
                <span className="hairline-gold inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold text-primary-foreground/90">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  Built for Cameroon · Paid in XAF
                </span>
                <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.02] sm:text-5xl lg:text-[3.5rem]">
                  Refer friends.
                  <br />
                  Earn <span className="gold-text">real money</span>.
                </h1>
                <p className="mt-5 max-w-md text-base leading-relaxed text-primary-foreground/80">
                  Activate your account once, share your link, and earn commissions across three levels of your
                  network — withdrawn straight to mobile money.
                </p>
              </div>
              <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="gold-gradient h-12 border-0 text-gold-foreground shadow-[var(--shadow-gold)] hover:opacity-90"
                >
                  <Link to="/register">
                    Sign up for free
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Link to="/login">I have an account</Link>
                </Button>
              </div>
            </div>

            {/* Wallet preview tile */}
            <div className="tile col-span-full flex flex-col p-6 sm:p-7 lg:col-span-5">
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow text-muted-foreground">Available balance</p>
                <span className="grid size-8 place-items-center rounded-full bg-gold-soft text-gold-foreground">
                  <Sparkles className="size-4" aria-hidden />
                </span>
              </div>
              <p className="tabular mt-2 font-display text-4xl font-extrabold text-foreground">
                {formatXAF(48750)}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {LEVELS.map((item) => (
                  <div key={item.level} className="rounded-2xl border border-border bg-muted/60 p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">L{item.level}</p>
                    <p className="tabular font-display text-base font-bold text-foreground">{item.members}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-5 space-y-3 border-t border-border pt-4">
                {[
                  { label: "Referral commission · L1", amount: 1500 },
                  { label: "Referral commission · L2", amount: 750 },
                  { label: "Withdrawal · MTN MoMo", amount: -10000 },
                ].map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-muted-foreground">{row.label}</span>
                    <span
                      className={`tabular font-semibold ${row.amount > 0 ? "text-primary" : "text-foreground"}`}
                    >
                      {row.amount > 0 ? "+" : ""}
                      {formatXAF(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Commission tiles */}
            {LEVELS.map((item) => (
              <div key={item.level} className="tile col-span-full p-6 sm:col-span-1 lg:col-span-4">
                <div className="flex items-center justify-between">
                  <span className="hairline-gold grid size-10 place-items-center rounded-2xl bg-gold-soft font-display text-sm font-bold text-gold-foreground">
                    L{item.level}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <p className="tabular mt-5 font-display text-3xl font-extrabold text-foreground">
                  {formatXAF(item.amount)}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="max-w-2xl">
            <p className="eyebrow text-primary">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              Get started in four steps
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              A one-time activation of {formatXAF(ACTIVATION_FEE)} unlocks your earning position. After that, every
              activated member in your first three levels pays you a fixed commission.
            </p>
          </div>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="tile p-6">
                <span className="tabular font-display text-2xl font-extrabold text-gold">
                  0{index + 1}
                </span>
                <p className="mt-4 font-semibold text-foreground">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features bento */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="max-w-2xl">
            <p className="eyebrow text-primary">The platform</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              Everything you need to grow a network
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className={`tile p-6 ${index < 2 ? "lg:col-span-3" : "lg:col-span-2"}`}
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <feature.icon className="size-5" aria-hidden />
                </span>
                <p className="mt-5 font-semibold text-foreground">{feature.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="tile-dark grain px-6 py-14 text-center sm:px-10">
            <p className="eyebrow relative text-gold">Start earning</p>
            <h2 className="relative mt-3 font-display text-3xl font-extrabold sm:text-4xl">
              Your network is worth money
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80 sm:text-base">
              Join Refer today, activate your account and start earning from every person you bring on board.
            </p>
            <Button
              asChild
              size="lg"
              className="gold-gradient relative mt-7 h-12 border-0 text-gold-foreground shadow-[var(--shadow-gold)] hover:opacity-90"
            >
              <Link to="/register">
                Create your account
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-3 px-4 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
          <Logo compact />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Refer. All amounts in XAF.
          </p>
        </div>
      </footer>
    </div>
  );
}
