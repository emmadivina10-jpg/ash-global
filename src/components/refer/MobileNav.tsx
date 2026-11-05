import { playRefreshDoneSound, playRefreshSound, playTabSound } from "@/lib/sound";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Avatar } from "./AvatarUpload";
import { MemberNavIcon } from "./MemberNavIcon";
import { UnreadMessageBadge } from "./UnreadMessageBadge";
import { useLiveConnectVendors } from "@/lib/live-connect.queries";
import { useRegion } from "@/lib/region-context";

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

/** ASH Orbit: floating, expandable vertical navigation dock. */
export function MobileNav({
  items,
  profile,
  unreadMessages = 0,
}: {
  items: MobileNavItem[];
  unreadMessages?: number;
  profile: { full_name?: string | null; avatar_url?: string | null } | null | undefined;
}) {
  const { tx, t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const region = useRegion();
  const { data: liveVendors = [] } = useLiveConnectVendors(
    region.seesEverything ? null : region.country,
    1,
  );

  const [expanded, setExpanded] = useState(false);
  const dockRef = useRef<HTMLElement>(null);
  const hasAvailableVendors = liveVendors.some((vendor) => vendor.is_online);

  const conversationOpen = useRouterState({
    select: (s) => s.location.pathname === "/messages" && Boolean(s.location.search.c),
  });

  const tabs = [...items, { to: "/menu", icon: Menu, label: t("nav.more") }];

  const label = (item: MobileNavItem) =>
    item.key ? t(item.key) : tx(item.en ?? item.label ?? "", item.fr);

  const refreshCurrent = () => {
    for (const el of Array.from(
      document.querySelectorAll<HTMLElement>(".app-shell-scroll, .snap-y"),
    )) {
      el.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    playRefreshSound();
    void queryClient.invalidateQueries().then(() => playRefreshDoneSound());
  };

  useEffect(() => {
    if (!expanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded]);

  if (conversationOpen) return null;

  const renderTab = (item: MobileNavItem) => {
    const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
    const isMore = item.to === "/menu";

    return (
      <li key={item.to} className="ash-orbit-entry">
        <Link
          to={item.to}
          preload="render"
          onClick={(event) => {
            if (active) {
              event.preventDefault();
              refreshCurrent();
            } else {
              playTabSound();
            }
            setExpanded(false);
          }}
          data-tour={item.tour}
          aria-current={active ? "page" : undefined}
          aria-label={isMore ? t("nav.more") : label(item)}
          title={!expanded ? (isMore ? t("nav.more") : label(item)) : undefined}
          className={cn("ash-orbit-link", active && "is-active")}
        >
          <span className="ash-orbit-icon">
            {isMore ? (
              <>
                <Avatar
                  path={profile?.avatar_url}
                  name={profile?.full_name}
                  className="member-avatar-ring size-7 p-[2px]"
                />
                <span className="ash-orbit-avatar-menu">
                  <Menu className="size-3" strokeWidth={3} aria-hidden />
                </span>
              </>
            ) : (
              <MemberNavIcon icon={item.icon} active={active} />
            )}

            {item.to === "/messages" && (
              <>
                {hasAvailableVendors && (
                  <span
                    className="live-connect-nav-indicator"
                    role="img"
                    aria-label={tx("Vendors are online", "Des vendeurs sont en ligne")}
                  />
                )}
                <UnreadMessageBadge count={unreadMessages} className="absolute -right-2 -top-1" />
              </>
            )}
          </span>

          <span className="ash-orbit-label">{isMore ? t("nav.more") : label(item)}</span>
          {active && <span className="ash-orbit-active-dot" aria-hidden />}
        </Link>
      </li>
    );
  };

  return (
    <nav
      ref={dockRef}
      className={cn("premium-mobile-nav ash-orbit fixed z-40", expanded && "is-expanded")}
      aria-label={tx("Primary navigation", "Navigation principale")}
      data-expanded={expanded}
    >
      <button
        type="button"
        className="ash-orbit-toggle"
        onClick={() => setExpanded((value) => !value)}
        aria-label={
          expanded
            ? tx("Collapse navigation", "Réduire la navigation")
            : tx("Expand navigation", "Développer la navigation")
        }
        aria-expanded={expanded}
      >
        <span className="ash-orbit-brand-mark">A</span>
        {expanded ? (
          <ChevronRight className="size-4" aria-hidden />
        ) : (
          <ChevronLeft className="size-4" aria-hidden />
        )}
      </button>

      <div className="ash-orbit-divider" />

      <ul className="ash-orbit-list">{tabs.map(renderTab)}</ul>
    </nav>
  );
}
