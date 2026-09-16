import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AshMark } from "./AshMark";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type MobileNavItem = {
  to: string;
  key?: TKey;
  en?: string;
  fr?: string;
  label?: string;
  icon: typeof Shield;
  referralOnly?: boolean;
  tour?: string;
};

export type MoreGroup = { en: string; fr: string; items: MobileNavItem[] };

/** Phone navigation with a raised ASH Hub tab and four stable destinations. */
export function MobileNav({
  items,
  moreGroups,
  isAdmin,
}: {
  items: MobileNavItem[];
  moreGroups: MoreGroup[];
  isAdmin: boolean;
}) {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(moreGroups[0]?.en ?? null);

  const label = (item: MobileNavItem) =>
    item.key ? t(item.key) : ((fr ? item.fr : item.en) ?? item.label ?? "");

  const renderTab = (item: MobileNavItem) => {
    const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
    return (
      <li key={item.to} className="min-w-0">
        <Link
          to={item.to}
          data-tour={item.tour}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex h-[4.65rem] min-w-0 flex-col items-center justify-center gap-1 px-0.5 pt-1 text-[10px] font-semibold transition-colors",
            active ? "text-primary" : "text-muted-foreground active:text-foreground",
          )}
        >
          <item.icon className={cn("size-5 shrink-0 transition-transform", active && "scale-105")} aria-hidden />
          <span className="max-w-full truncate">{label(item)}</span>
          {active ? <span className="absolute bottom-1.5 size-1 rounded-full bg-primary" aria-hidden /> : null}
        </Link>
      </li>
    );
  };

  const hub = items[2];
  const regularItems = items.filter((_, index) => index !== 2);
  const hubActive = Boolean(hub && (pathname === hub.to || pathname.startsWith(`${hub.to}/`)));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[calc(0.35rem+env(safe-area-inset-bottom))] lg:hidden">
      <div className="ash-glass nav-bar-fill relative mx-auto max-w-lg rounded-[2rem] border border-border/70 shadow-[var(--shadow-card)]">
        <ul className="grid h-[4.65rem] grid-cols-5 items-end">
          {regularItems.slice(0, 2).map(renderTab)}

          <li className="relative h-[4.65rem] min-w-0">
            {hub ? (
              <Link
                to={hub.to}
                data-tour={hub.tour}
                aria-current={hubActive ? "page" : undefined}
                className={cn(
                  "absolute inset-x-0 -top-5 flex flex-col items-center gap-1 text-[10px] font-bold transition-colors",
                  hubActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-[4.15rem] shrink-0 place-items-center rounded-full border-[5px] border-background bg-card shadow-[0_8px_24px_color-mix(in_oklab,var(--color-primary)_28%,transparent)] transition-transform active:scale-95",
                    hubActive && "ring-2 ring-primary/35",
                  )}
                >
                  <AshMark ai={false} className="size-12" />
                </span>
                <span className="max-w-full truncate px-0.5">{label(hub)}</span>
              </Link>
            ) : null}
          </li>

          {regularItems.slice(2, 3).map(renderTab)}
          <li className="min-w-0">
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative flex h-[4.65rem] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-none px-0.5 pt-1 text-[10px] font-semibold text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground [&_svg]:size-5"
                >
                  <Menu className="size-5" aria-hidden />
                  <span className="max-w-full truncate">{t("nav.more")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>{t("nav.more")}</SheetTitle>
                </SheetHeader>
                <div className="space-y-2 px-4 pb-8">
                  {moreGroups.map((group) => {
                    const open = openGroup === group.en;
                    return (
                      <section key={group.en} className="overflow-hidden rounded-3xl border border-border bg-card">
                        <button
                          type="button"
                          onClick={() => setOpenGroup(open ? null : group.en)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-foreground"
                        >
                          {fr ? group.fr : group.en}
                          <span className="text-xs text-muted-foreground">{open ? "–" : "+"}</span>
                        </button>
                        {open ? (
                          <div className="grid grid-cols-3 gap-2 px-3 pb-4">
                            {group.items.map((item) => (
                              <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setMoreOpen(false)}
                                className="flex flex-col items-center gap-2 rounded-2xl p-2 text-center text-[11px] font-semibold text-foreground"
                              >
                                <span
                                  className={cn(
                                    "grid size-12 place-items-center rounded-full bg-muted text-muted-foreground",
                                    pathname === item.to && "bg-primary/15 text-primary",
                                  )}
                                >
                                  <item.icon className="size-5" aria-hidden />
                                </span>
                                {label(item)}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}

                  {isAdmin ? (
                    <a
                      href="/console"
                      className="flex items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground"
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Shield className="size-5" aria-hidden />
                      </span>
                      {t("nav.admin")}
                    </a>
                  ) : null}
                </div>
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </div>
    </nav>
  );
}
