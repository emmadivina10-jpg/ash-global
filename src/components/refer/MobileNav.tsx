import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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

/** Facebook-style phone navigation with five equal, always-visible destinations. */
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
            "premium-nav-item relative flex h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 pt-1 text-[10px] font-semibold",
            active ? "text-primary" : "text-muted-foreground active:text-foreground",
          )}
        >
          <span className="grid size-7 place-items-center">
            <item.icon className={cn("size-[1.45rem] shrink-0", active && "fill-primary/10")} strokeWidth={active ? 2.5 : 2} aria-hidden />
          </span>
          <span className="max-w-full truncate">{label(item)}</span>
          {active ? <span className="absolute inset-x-2 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden /> : null}
        </Link>
      </li>
    );
  };

  return (
    <nav
      className="premium-mobile-nav fixed inset-x-0 z-40 lg:hidden"
      aria-label={fr ? "Navigation principale" : "Primary navigation"}
    >
      <div className="premium-nav-pill nav-bar-fill relative w-full border-t border-border">
        <ul className="premium-nav-grid relative mx-auto grid h-[3.75rem] max-w-lg grid-cols-5 items-stretch">
          {items.map((item) => renderTab(item))}
          <li className="min-w-0">
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "premium-nav-item relative flex h-[3.75rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-none px-0.5 pt-1 text-[10px] font-semibold text-muted-foreground shadow-none hover:bg-muted/50 hover:text-foreground [&_svg]:size-[1.45rem]",
                  )}
                >
                  <span className="grid size-7 place-items-center"><Menu strokeWidth={2.1} aria-hidden /></span>
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
