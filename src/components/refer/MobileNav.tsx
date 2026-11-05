import { playRefreshDoneSound, playRefreshSound, playTabSound } from "@/lib/sound";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, Shield, X } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
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

type OrbitPosition = { left: number; top: number };

const ORBIT_POSITION_KEY = "ash-orbit-position-v1";
const LAUNCHER_SIZE = 58;

function clampPosition(left: number, top: number): OrbitPosition {
  return {
    left: Math.max(8, Math.min(left, window.innerWidth - LAUNCHER_SIZE - 8)),
    top: Math.max(8, Math.min(top, window.innerHeight - LAUNCHER_SIZE - 8)),
  };
}

/** Shared draggable ASH Orbit launcher and centered navigation overlay. */
export function AshOrbitMenu({
  children,
  ariaLabel,
  launcherLabel,
  title = "ASH Orbit",
}: {
  children: ReactNode;
  ariaLabel: string;
  launcherLabel: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<OrbitPosition | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORBIT_POSITION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as OrbitPosition;
        if (Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) {
          setPosition(clampPosition(parsed.left, parsed.top));
        }
      }
    } catch {
      // Ignore invalid or unavailable stored positions.
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) =>
        current ? clampPosition(current.left, current.top) : null,
      );
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;

    if (drag.moved) {
      setPosition(clampPosition(drag.left + dx, drag.top + dy));
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved) {
      suppressClick.current = true;
      const nextPosition = clampPosition(
        drag.left + event.clientX - drag.startX,
        drag.top + event.clientY - drag.startY,
      );
      setPosition(nextPosition);
      try {
        localStorage.setItem(ORBIT_POSITION_KEY, JSON.stringify(nextPosition));
      } catch {
        // The launcher remains usable if storage is unavailable.
      }
    }

    dragRef.current = null;
  };

  return (
    <>
      <button
        type="button"
        className="ash-orbit-launcher"
        style={
          position
            ? { left: position.left, top: position.top, right: "auto", bottom: "auto" }
            : undefined
        }
        aria-label={launcherLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          setOpen(true);
        }}
      >
        <span className="ash-orbit-brand-mark">A</span>
        <span className="sr-only">{launcherLabel}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="ash-orbit-backdrop"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />

          <section
            className="ash-orbit-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            <header className="ash-orbit-dialog-header">
              <div>
                <span className="ash-orbit-dialog-eyebrow">ASH GLO</span>
                <h2>{title}</h2>
                <p>{ariaLabel}</p>
              </div>
              <button
                type="button"
                className="ash-orbit-close"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </button>
            </header>

            <nav
              className="ash-orbit-dialog-nav"
              aria-label={ariaLabel}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              {children}
            </nav>
          </section>
        </>
      )}
    </>
  );
}

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
  const conversationOpen = useRouterState({
    select: (s) =>
      s.location.pathname === "/messages" && Boolean(s.location.search.c),
  });
  const queryClient = useQueryClient();
  const region = useRegion();
  const { data: liveVendors = [] } = useLiveConnectVendors(
    region.seesEverything ? null : region.country,
    1,
  );

  const hasAvailableVendors = liveVendors.some((vendor) => vendor.is_online);
  const tabs = [...items, { to: "/menu", icon: Menu, label: t("nav.more") }];

  const label = (item: MobileNavItem) =>
    item.key ? t(item.key) : tx(item.en ?? item.label ?? "", item.fr);

  const refreshCurrent = () => {
    document.querySelector(".app-shell-scroll, .snap-y")?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    playRefreshSound();
    void queryClient.invalidateQueries().then(() => playRefreshDoneSound());
  };

  if (conversationOpen) return null;

  return (
    <AshOrbitMenu
      ariaLabel={tx("Primary navigation", "Navigation principale")}
      launcherLabel={tx("Open ASH navigation", "Ouvrir la navigation ASH")}
    >
      <ul className="ash-orbit-menu-grid">
        {tabs.map((item) => {
          const active =
            pathname === item.to || pathname.startsWith(`${item.to}/`);
          const isMore = item.to === "/menu";

          return (
            <li key={item.to}>
              <Link
                to={item.to}
                preload="render"
                data-tour={item.tour}
                aria-current={active ? "page" : undefined}
                aria-label={isMore ? t("nav.more") : label(item)}
                className={`ash-orbit-menu-link${active ? " is-active" : ""}`}
                onClick={(event) => {
                  if (active) {
                    event.preventDefault();
                    refreshCurrent();
                  } else {
                    playTabSound();
                  }
                }}
              >
                <span className="ash-orbit-menu-icon">
                  {isMore ? (
                    <span className="ash-orbit-avatar-wrap">
                      <Avatar
                        src={profile?.avatar_url}
                        name={profile?.full_name}
                        className="member-avatar-ring size-9 p-[2px]"
                      />
                      <span className="ash-orbit-avatar-menu">
                        <Menu className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                    </span>
                  ) : (
                    <MemberNavIcon
                      icon={item.icon}
                      active={active}
                      className="size-6"
                    />
                  )}

                  {item.to === "/messages" && (
                    <>
                      {hasAvailableVendors && (
                        <span
                          className="ash-orbit-online-dot"
                          aria-label={tx("Vendors online", "Prestataires en ligne")}
                        />
                      )}
                      <UnreadMessageBadge
                        count={unreadMessages}
                        className="ash-orbit-message-badge"
                      />
                    </>
                  )}
                </span>

                <span className="ash-orbit-menu-label">
                  {isMore ? t("nav.more") : label(item)}
                </span>
                {active && <span className="ash-orbit-active-dot" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
    </AshOrbitMenu>
  );
}