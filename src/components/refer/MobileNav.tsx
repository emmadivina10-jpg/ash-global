import { useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

/**
 * WhatsApp-style bottom bar: a rounded floating pill with equal tabs. Press and
 * slide your thumb along it and the highlight follows, opening whichever tab
 * you release on.
 */
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
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(moreGroups[0]?.en ?? null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const label = (item: MobileNavItem) =>
    item.key ? t(item.key) : ((fr ? item.fr : item.en) ?? item.label ?? "");

  function indexFromPoint(clientX: number, clientY: number) {
    const element = document.elementFromPoint(clientX, clientY);
    const tab = element?.closest<HTMLElement>("[data-nav-index]");
    if (!tab) return null;
    const value = Number(tab.dataset["navIndex"]);
    return Number.isFinite(value) ? value : null;
  }

  const renderTab = (item: MobileNavItem, index: number) => {
    const active = pathname === item.to;
    const hovered = dragIndex === index;
    return (
      <li key={item.to} data-nav-index={index}>
        <Link
          to={item.to}
          data-tour={item.tour}
          className={cn(
            "relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-all duration-300",
            active || hovered ? "-translate-y-0.5 text-primary" : "text-muted-foreground",
          )}
        >
          {active || hovered ? (
            <span
              className={cn(
                "absolute inset-x-1.5 inset-y-1 -z-10 rounded-2xl bg-primary/12",
                hovered && "animate-[pulse_1.2s_ease-in-out_infinite] bg-primary/20",
              )}
              aria-hidden
            />
          ) : null}
          <item.icon className={cn("size-5 transition-transform duration-200", hovered && "scale-125")} aria-hidden />
          {label(item)}
        </Link>
      </li>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
      <div className="ash-glass mx-auto max-w-lg overflow-hidden rounded-[1.75rem] border border-border/70 shadow-[var(--shadow-card)]">
        <ul
          ref={listRef}
          className="grid touch-pan-y"
          style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}
          onPointerDown={(event) => setDragIndex(indexFromPoint(event.clientX, event.clientY))}
          onPointerMove={(event) => {
            if (dragIndex === null) return;
            const next = indexFromPoint(event.clientX, event.clientY);
            if (next !== null && next !== dragIndex) setDragIndex(next);
          }}
          onPointerUp={(event) => {
            const index = indexFromPoint(event.clientX, event.clientY);
            const item = index === null ? null : items[index];
            setDragIndex(null);
            if (item && item.to !== pathname) void navigate({ to: item.to } as never);
          }}
          onPointerCancel={() => setDragIndex(null)}
          onPointerLeave={() => setDragIndex(null)}
        >
          {items.map((item, index) => renderTab(item, index))}
          <li>
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="relative flex min-h-14 w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground transition-colors"
                >
                  <Menu className="size-5" aria-hidden />
                  {t("nav.more")}
                </button>
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
