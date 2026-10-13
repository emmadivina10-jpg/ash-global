import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Logo } from "@/components/refer/Logo";
import { LanguageSwitcher, ThemeToggle } from "@/components/refer/Preferences";

const LINKS = [
  { to: "/support", label: "Support" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms" },
  { to: "/community-guidelines", label: "Community" },
] as const;

export function PublicInfoShell({
  eyebrow,
  title,
  description,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="safe-top min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="ASH home">
            <Logo />
          </Link>
          <nav
            className="hidden items-center gap-1 rounded-2xl border border-border bg-card p-1 md:flex"
            aria-label="Information pages"
          >
            {LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-primary/10 text-primary" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full px-4 py-8 sm:px-6 sm:py-12 ${wide ? "max-w-6xl" : "max-w-3xl"}`}
      >
        <Link
          to="/"
          className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to ASH
        </Link>
        <div className="mb-9 border-b border-border pb-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        {children}
      </main>

      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-xs text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} ASH Global Technologies. ASH Glo is the product and
            platform.
          </p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Footer information pages">
            {LINKS.map((item) => (
              <Link key={item.to} to={item.to} className="font-semibold hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <Link
              to="/account-deletion"
              className="inline-flex items-center gap-1 font-semibold hover:text-foreground"
            >
              Delete account <ExternalLink className="size-3" aria-hidden />
            </Link>
            <Link to="/contact" className="font-semibold hover:text-foreground">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
