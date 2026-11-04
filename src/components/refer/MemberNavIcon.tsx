import { useId } from "react";
import { ShoppingBag, Store, type LucideIcon } from "lucide-react";

/** Two-tone strokes without changing the icon's shape or accessibility. */
export function MemberNavIcon({
  icon: Icon,
  active = false,
}: {
  icon: LucideIcon;
  active?: boolean;
}) {
  const id = `member-icon-${useId().replace(/:/g, "")}`;
  if (Icon === ShoppingBag || Icon === Store) return (
    <svg viewBox="0 0 28 28" className="member-nav-icon size-7 shrink-0 text-primary" fill="none" aria-hidden>
      <path d="M5 10h18l1.5 13a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2L5 10Z" fill="currentColor" fillOpacity={active ? 0.2 : 0.08} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m11 20 3-6 3 6m-4.8-2h3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <Icon
      className="member-nav-icon size-[1.45rem] shrink-0"
      stroke={`url(#${id})`}
      strokeWidth={active ? 2.5 : 2}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" className="member-icon-green" />
          <stop offset="48%" className="member-icon-green" />
          <stop offset="52%" className="member-icon-ash" />
          <stop offset="100%" className="member-icon-violet" />
        </linearGradient>
      </defs>
    </Icon>
  );
}
