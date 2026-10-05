import { playTabSound } from "@/lib/sound";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Shield } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Avatar } from "./AvatarUpload";

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

  const label = (item: MobileNavItem) =>
    item.key ? t(item.key) : ((fr ? item.fr : item.en) ?? item.label ?? "");

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
                <Avatar path={profile?.avatar_url} name={profile?.full_name} className="size-7 border border-border" />
                <span className="absolute -bottom-0.5 -right-1 z-10 grid size-3.5 place-items-center rounded-full bg-background ring-1 ring-border">
                  <Menu className="size-2.5" strokeWidth={3} aria-hidden />
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
