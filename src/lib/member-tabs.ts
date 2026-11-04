/**
 * The member tab bar and its siblings (desktop sidebar, visitor tabs).
 *
 * The five-tab structure and order never change. Under the `new_nav` switch
 * only three slots are re-pointed, in place:
 *   Feed → Discover · Services/Market → Shop (same page) · center → Home
 * Messages and Menu are untouched.
 */
import {
  ChefHat,
  Home,
  Compass,
  Flame,
  MessageCircle,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { TKey } from "@/lib/i18n";
import type { ServicesMode } from "@/lib/services-mode";

export type TabItem = {
  to: string;
  key?: TKey;
  en?: string;
  fr?: string;
  label?: string;
  icon: LucideIcon;
  referralOnly?: boolean;
  tour?: string;
  /** Extra paths (exact, or prefixes ending in "/") that keep this tab highlighted. */
  match?: string[];
};

/** Member phone tabs before Menu (MobileNav always appends Menu last). */
export const MEMBER_TABS: TabItem[] = [
  { to: "/feed", en: "Feed", fr: "Fil", icon: Flame, tour: "feed" },
  { to: "/services", en: "Services", fr: "Services", icon: Sparkles, tour: "market" },
  { to: "/spotlight", en: "Home", fr: "Accueil", icon: Home },
  { to: "/messages", key: "nav.messages" as TKey, icon: MessageCircle, tour: "messages" },
];

/** Visitor phone tabs before Sign in. */
export const GUEST_TABS: TabItem[] = [
  { to: "/feed", en: "Feed", fr: "Fil", icon: Flame },
  { to: "/services", en: "Services", fr: "Services", icon: Sparkles },
  { to: "/spotlight", en: "Home", fr: "Accueil", icon: Home },
  { to: "/search", en: "Search", fr: "Rechercher", icon: Search },
];

export const DISCOVER_TAB = {
  to: "/discover",
  en: "Discover",
  fr: "Découvrir",
  icon: Compass,
  // The full-screen viewer and post pages open from Discover.
  match: ["/post/", "/hashtag/"],
} as const satisfies TabItem;

export const SHOP_TAB = {
  to: "/services",
  en: "Shop",
  fr: "Boutique",
  icon: ShoppingBag,
} as const satisfies TabItem;

export const KITCHEN_TAB = {
  to: "/kitchen",
  en: "ASH Kitchen",
  fr: "ASH Kitchen",
  icon: ChefHat,
} as const satisfies TabItem;

export type TabOptions = { newNav: boolean; servicesMode: ServicesMode };

function relabel(item: TabItem, next: Pick<TabItem, "to" | "en" | "fr" | "icon" | "match">): TabItem {
  const out: TabItem = { to: next.to, icon: next.icon };
  if (next.en) out.en = next.en;
  if (next.fr) out.fr = next.fr;
  if (next.match) out.match = [...next.match];
  if (item.tour) out.tour = item.tour;
  if (item.referralOnly) out.referralOnly = item.referralOnly;
  return out;
}

/** Re-points one destination for the current switch state; anything else is returned as is. */
export function resolveTab(item: TabItem, { newNav, servicesMode }: TabOptions): TabItem {
  if (item.to === "/spotlight") return relabel(item, { to: "/spotlight", en: "Home", fr: "Accueil", icon: Home });
  if (newNav) {
    if (item.to === "/feed") return relabel(item, DISCOVER_TAB);
    if (item.to === "/services") return relabel(item, SHOP_TAB);
    return item;
  }
  // Legacy behaviour: the Services slot reads "Market" while Market mode is on.
  if (item.to === "/services" && servicesMode === "market")
    return relabel(item, { to: "/services", en: "Market", fr: "Market", icon: Store });
  return item;
}

/** Under `new_nav` the Kitchen slot is removed; Spotlight stays in the middle. */
export function isTabRemoved(item: Pick<TabItem, "to">, { newNav }: Pick<TabOptions, "newNav">): boolean {
  return newNav && item.to === "/kitchen";
}

export function resolveTabs(items: TabItem[], options: TabOptions): TabItem[] {
  return items.filter((item) => !isTabRemoved(item, options)).map((item) => resolveTab(item, options));
}

/** Whether `pathname` belongs to this tab. */
export function isTabActive(item: Pick<TabItem, "to" | "match">, pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === item.to || path.startsWith(`${item.to}/`)) return true;
  return (item.match ?? []).some((m) =>
    m.endsWith("/") ? path.startsWith(m) : path === m || path.startsWith(`${m}/`),
  );
}

export function tabText(item: TabItem, lang: string, translate: (key: TKey) => string): string {
  if (item.key) return translate(item.key);
  return (lang === "fr" ? item.fr : item.en) ?? item.label ?? "";
}
