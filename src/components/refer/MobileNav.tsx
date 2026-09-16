import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const fr = lang === "fr";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(moreGroups[0]?.en ?? null);
  const [gestureIndex, setGestureIndex] = useState<number | null>(null);
  const [gestureActive, setGestureActive] = useState(false);
  const startX = useRef(0);
  const dragged = useRef(false);
  const navList = useRef<HTMLUListElement>(null);

  const label = (item: MobileNavItem) =>
    item.key ? t(item.key) : ((fr ? item.fr : item.en) ?? item.label ?? "");

  const renderTab = (item: MobileNavItem, visualIndex: number) => {
    const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
    const distance = gestureIndex === null ? 10 : Math.abs(gestureIndex - visualIndex);
    return (
      <li key={item.to} className="min-w-0">
        <Link
          to={item.to}
          data-tour={item.tour}
          aria-current={active ? "page" : undefined}
          className={cn(
            "premium-nav-item relative flex h-[4.35rem] min-w-0 flex-col items-center justify-center gap-1 px-0.5 pt-1 text-[10px] font-semibold",
            active ? "text-primary" : "text-muted-foreground active:text-foreground",
            gestureActive && distance === 0 && "premium-nav-item-selected",
            gestureActive && distance === 1 && "premium-nav-item-neighbor",
          )}
        >
          <span className={cn("grid size-8 place-items-center rounded-full", active && "bg-primary/8")}>
            <item.icon className={cn("size-[1.3rem] shrink-0", active && "scale-105")} strokeWidth={2.1} aria-hidden />
          </span>
          <span className="max-w-full truncate">{label(item)}</span>
          {active ? <span className="absolute bottom-1 size-1 rounded-full bg-primary shadow-[0_0_7px_var(--color-primary)]" aria-hidden /> : null}
        </Link>
      </li>
    );
  };

  const hub = items[2];
  const regularItems = items.filter((_, index) => index !== 2);
  const hubActive = Boolean(hub && (pathname === hub.to || pathname.startsWith(`${hub.to}/`)));

  const indexFromPointer = (clientX: number) => {
    const bounds = navList.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return 0;
    return Math.max(0, Math.min(4, Math.floor(((clientX - bounds.left) / bounds.width) * 5)));
  };

  const setBubblePosition = (index: number) => {
    navList.current?.style.setProperty("--nav-index", String(index));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLUListElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    startX.current = event.clientX;
    dragged.current = false;
    const index = indexFromPointer(event.clientX);
    setBubblePosition(index);
    setGestureIndex(index);
    setGestureActive(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLUListElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (Math.abs(event.clientX - startX.current) > 7) dragged.current = true;
    const index = indexFromPointer(event.clientX);
    if (index !== gestureIndex) {
      setGestureIndex(index);
      setBubblePosition(index);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(7);
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLUListElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const selected = indexFromPointer(event.clientX);
    const shouldSelect = dragged.current;
    setGestureActive(false);
    setGestureIndex(null);
    if (!shouldSelect) return;
    event.preventDefault();
    if (selected === 4) {
      setMoreOpen(true);
      return;
    }
    const destination = items[selected]?.to;
    if (destination) void navigate({ to: destination });
  };

  return (
    <nav className="premium-mobile-nav fixed inset-x-0 z-40 lg:hidden" aria-label={fr ? "Navigation principale" : "Primary navigation"}>
      <div className="premium-nav-pill nav-bar-fill relative mx-auto w-[calc(100%-1.25rem)] max-w-[27rem] rounded-[2rem] border border-border/45">
        <ul
          ref={navList}
          className={cn("premium-nav-grid relative grid h-[4.35rem] grid-cols-5 items-end", gestureActive && "is-gesturing")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={() => {
            setGestureActive(false);
            setGestureIndex(null);
          }}
        >
          <span className="premium-nav-bubble" aria-hidden />
          {regularItems.slice(0, 2).map((item, index) => renderTab(item, index))}

          <li className="relative h-[4.35rem] min-w-0">
            {hub ? (
              <Link
                to={hub.to}
                data-tour={hub.tour}
                aria-current={hubActive ? "page" : undefined}
                className={cn(
                  "premium-hub-link absolute inset-x-0 -top-[2.15rem] z-10 flex flex-col items-center gap-0.5 text-[10px] font-bold",
                  hubActive ? "text-foreground" : "text-muted-foreground",
                  gestureActive && gestureIndex === 2 && "is-selected",
                )}
              >
                <span
                  className={cn(
                    "premium-hub-orb grid size-[4.7rem] shrink-0 place-items-center rounded-full border-[5px] border-background/90 bg-card",
                    hubActive && "is-active",
                  )}
                >
                  <AshMark ai={false} className="size-[3.65rem]" />
                </span>
                <span className="max-w-full truncate px-0.5 leading-4">{label(hub)}</span>
              </Link>
            ) : null}
          </li>

          {regularItems.slice(2, 3).map((item) => renderTab(item, 3))}
          <li className="min-w-0">
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "premium-nav-item relative flex h-[4.35rem] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-none px-0.5 pt-1 text-[10px] font-semibold text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground [&_svg]:size-[1.3rem]",
                    gestureActive && gestureIndex === 4 && "premium-nav-item-selected",
                    gestureActive && gestureIndex === 3 && "premium-nav-item-neighbor",
                  )}
                >
                  <span className="grid size-8 place-items-center rounded-full"><Menu strokeWidth={2.1} aria-hidden /></span>
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
