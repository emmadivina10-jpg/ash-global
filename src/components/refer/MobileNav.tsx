import { useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Shield } from "lucide-react";
import { AshMark } from "./AshMark";
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
 * The bottom bar. The centre button is ASH Hub, and the tabs carry a
 * WhatsApp-style bubble: press and slide your thumb along the bar and the
 * highlight follows it, opening whichever tab you release on.
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

  const centre = items.find((item) => item.to === "/services");
  const tabs = items.filter((item) => item.to !== "/services");
  const left = tabs.slice(0, Math.ceil(tabs.length / 2));
  const right = tabs.slice(Math.ceil(tabs.length / 2));
  const ordered = [...left, ...right];

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
          {hovered ? (
            <span
              className="absolute inset-x-2 inset-y-1 -z-10 animate-[pulse_1.2s_ease-in-out_infinite] rounded-2xl bg-primary/15"
              aria-hidden
            />
          ) : null}
          {active ? (
            <span className="brand-gradient absolute top-0 h-1 w-10 rounded-full transition-all duration-300" aria-hidden />
          ) : null}
          <item.icon className={cn("size-5 transition-transform duration-200", hovered && "scale-125")} aria-hidden />
          {label(item)}
        </Link>
      </li>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      {centre ? (
        <Link
          to={centre.to}
          aria-label={label(centre)}
          data-tour="market"
          className="brand-gradient absolute left-1/2 top-0 z-10 flex size-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-brand)] ring-4 ring-background transition-transform duration-300 active:scale-95"
        >
          <AshMark className="size-7" ai={false} />
          <span className="text-[9px] font-extrabold tracking-wide">HUB</span>
        </Link>
      ) : null}

      <div className="ash-glass nav-cutout nav-bar-fill border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
        <ul
          ref={listRef}
          className="mx-auto grid max-w-lg grid-cols-5 touch-pan-y"
          onPointerDown={(event) => setDragIndex(indexFromPoint(event.clientX, event.clientY))}
          onPointerMove={(event) => {
            if (dragIndex === null) return;
            const next = indexFromPoint(event.clientX, event.clientY);
            if (next !== null && next !== dragIndex) setDragIndex(next);
          }}
          onPointerUp={(event) => {
            const index = indexFromPoint(event.clientX, event.clientY);
            const item = index === null ? null : ordered[index];
            setDragIndex(null);
            if (item && item.to !== pathname) void navigate({ to: item.to } as never);
          }}
          onPointerCancel={() => setDragIndex(null)}
          onPointerLeave={() => setDragIndex(null)}
        >
          {left.map((item, index) => renderTab(item, index))}
          <li aria-hidden>{centre ? <span className="block min-h-14" /> : null}</li>
          {right.map((item, index) => renderTab(item, left.length + index))}
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
