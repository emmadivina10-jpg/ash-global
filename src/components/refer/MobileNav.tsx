import { playTabSound } from "@/lib/sound";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Menu, Shield } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Avatar } from "./AvatarUpload";
import { MemberNavIcon } from "./MemberNavIcon";

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
  profile,
}: {
  items: MobileNavItem[];
  profile: { full_name?: string | null; avatar_url?: string | null } | null | undefined;
}) {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [heldIndex, setHeldIndex] = useState<number | null>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gesture = useRef<{ id: number; x: number; y: number; held: boolean; index: number } | null>(null);
  const suppressClick = useRef(false);
  const clearTimer = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => () => clearTimer(), []);
  const conversationOpen = useRouterState({
    select: (s) => s.location.pathname === "/messages" && Boolean(s.location.search.c),
  });

  const label = (item: MobileNavItem) =>
    item.key ? t(item.key) : ((fr ? item.fr : item.en) ?? item.label ?? "");
  const tabs = [...items, { to: "/menu", icon: Menu, label: t("nav.more") }];
  const indexAt = (x: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(tabs.length - 1, Math.floor((x - rect.left) / (rect.width / tabs.length))));
  };
  const startHold = (event: PointerEvent<HTMLUListElement>) => {
    if (event.button !== 0) return;
    clearTimer();
    suppressClick.current = false;
    const index = indexAt(event.clientX);
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, held: false, index };
    timer.current = setTimeout(() => {
      const current = gesture.current;
      if (!current) return;
      current.held = true;
      suppressClick.current = true;
      gridRef.current?.setPointerCapture(current.id);
      setHeldIndex(current.index);
    }, 380);
  };
  const moveHold = (event: PointerEvent<HTMLUListElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.held) {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 12) { clearTimer(); gesture.current = null; }
      return;
    }
    current.index = indexAt(event.clientX);
    setHeldIndex(current.index);
  };
  const endHold = (event: PointerEvent<HTMLUListElement>, cancelled = false) => {
    clearTimer();
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    setHeldIndex(null);
    if (!current.held) return;
    if (gridRef.current?.hasPointerCapture(event.pointerId)) gridRef.current.releasePointerCapture(event.pointerId);
    const rect = gridRef.current?.getBoundingClientRect();
    if (cancelled || !rect || event.clientY < rect.top - 100 || event.clientY > rect.bottom + 60) return;
    const selected = tabs[indexAt(event.clientX)];
    if (selected && selected.to !== pathname) { playTabSound(); void navigate({ to: selected.to }); }
  };
  const heldTab = heldIndex === null ? null : tabs[heldIndex];

  if (conversationOpen) return null;

  const renderTab = (item: MobileNavItem) => {
    const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
    return (
      <li key={item.to} className="min-w-0">
        <Link
          to={item.to}
          preload="render"
          onClick={() => { if (!active) playTabSound(); }}
          data-tour={item.tour}
          aria-current={active ? "page" : undefined}
          className={cn(
            "premium-nav-item relative flex h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 pt-1 text-[10px] font-semibold",
            active ? "text-primary" : "text-muted-foreground active:text-foreground",
          )}
        >
          <span className="grid size-7 place-items-center">
            <MemberNavIcon icon={item.icon} active={active} />
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
        <ul
          ref={gridRef}
          className="premium-nav-grid relative mx-auto grid h-[3.75rem] max-w-lg grid-cols-5 items-stretch"
          data-held-index={heldIndex ?? undefined}
          onPointerDown={startHold}
          onPointerMove={moveHold}
          onPointerUp={(event) => endHold(event)}
          onPointerCancel={(event) => endHold(event, true)}
          onLostPointerCapture={() => { clearTimer(); gesture.current = null; setHeldIndex(null); }}
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
          onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}
        >
          {heldTab && <li className="member-tab-bubble" aria-hidden="true">
            <span className="member-tab-bubble-icon"><MemberNavIcon icon={heldTab.icon} active /></span>
            <span className="member-tab-bubble-label">{label(heldTab)}</span>
          </li>}
          {items.map((item) => renderTab(item))}
          <li className="min-w-0">
            <Link
              to="/menu"
              preload="render"
              onClick={() => { if (pathname !== "/menu") playTabSound(); }}
              aria-current={pathname === "/menu" ? "page" : undefined}
              className={cn(
                "premium-nav-item relative flex h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 pt-1 text-[10px] font-semibold",
                pathname === "/menu" ? "text-primary" : "text-muted-foreground active:text-foreground",
              )}
            >
              <span className="relative size-7">
                <Avatar path={profile?.avatar_url} name={profile?.full_name} className="member-avatar-ring size-7 p-[2px]" />
                <span className="absolute -bottom-0.5 -right-1 z-10 grid size-3.5 place-items-center rounded-full bg-background ring-1 ring-border">
                  <span className="grid size-2.5 place-items-center [&_svg]:size-2.5"><MemberNavIcon icon={Menu} active={pathname === "/menu"} /></span>
                </span>
              </span>
              <span className="max-w-full truncate">{t("nav.more")}</span>
              {pathname === "/menu" ? <span className="absolute inset-x-2 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden /> : null}
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
