import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Layers,
  ShieldCheck,
  Smartphone,
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
  { level: 1, amount: COMMISSIONS[1], label: "Direct referrals", copy: "Everyone who joins with your link and activates." },
  { level: 2, amount: COMMISSIONS[2], label: "Second level", copy: "The people your referrals bring in." },
  { level: 3, amount: COMMISSIONS[3], label: "Third level", copy: "Your network keeps paying, three levels deep." },
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
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="brand-gradient absolute inset-0 opacity-95" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:pb-20">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="text-primary-foreground">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  Built for Cameroon · Paid in XAF
                </span>
                <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
                  Refer friends.
                  <br />
                  Earn real money.
                </h1>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
                  Activate your account once, share your link, and earn commissions across three levels of
                  your network — withdrawn straight to mobile money.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" variant="secondary" className="h-12">
                    <Link to="/register">
                      Sign up for free
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Link to="/login">I have an account</Link>
                  </Button>
                </div>
                <dl className="mt-9 grid max-w-md grid-cols-3 gap-4">
                  {LEVELS.map((item) => (
                    <div key={item.level}>
                      <dt className="text-xs font-medium text-primary-foreground/70">Level {item.level}</dt>
                      <dd className="tabular font-display text-lg font-bold sm:text-xl">
                        {item.amount.toLocaleString("fr-FR")}
                        <span className="ml-1 text-xs font-semibold">XAF</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="relative mx-auto w-full max-w-sm">
                <div className="rounded-3xl border border-border bg-card p-5 shadow-2xl">
                  <p className="text-xs font-medium text-muted-foreground">Available balance</p>
                  <p className="tabular mt-1 font-display text-3xl font-extrabold text-foreground">
                    {formatXAF(48750)}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {LEVELS.map((item) => (
                      <div key={item.level} className="rounded-xl bg-muted p-2.5">
                        <p className="text-[11px] text-muted-foreground">L{item.level}</p>
                        <p className="tabular text-sm font-bold text-foreground">
                          {item.level === 1 ? 18 : item.level === 2 ? 42 : 96}
                        </p>
                      </div>
                    ))}
                  </div>
                  <ul className="mt-4 space-y-3">
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
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">How the rewards work</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            A one-time activation of {formatXAF(ACTIVATION_FEE)} unlocks your earning position. After that, every
            activated member in your first three levels pays you a fixed commission.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {LEVELS.map((item) => (
              <div key={item.level} className="rounded-2xl border border-border bg-card p-5">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 font-display font-bold text-primary">
                  {item.level}
                </span>
                <p className="tabular mt-4 font-display text-2xl font-extrabold text-foreground">
                  {formatXAF(item.amount)}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Get started in 4 steps</h2>
            <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-border bg-card p-5">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">
                    Step {index + 1}
                  </span>
                  <p className="mt-2 font-semibold text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Everything you need to grow a network
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-border bg-card p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="size-5" aria-hidden />
                </span>
                <p className="mt-4 font-semibold text-foreground">{feature.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{feature.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="brand-gradient rounded-3xl px-6 py-12 text-center text-primary-foreground sm:px-10">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Your network is worth money</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-primary-foreground/85 sm:text-base">
              Join Refer today, activate your account and start earning from every person you bring on board.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-6 h-12">
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
