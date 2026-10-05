import { useId } from "react";
import type { LucideIcon } from "lucide-react";

/** Two-tone strokes without changing the icon's shape or accessibility. */
export function MemberNavIcon({ icon: Icon, active = false }: { icon: LucideIcon; active?: boolean }) {
  const id = `member-icon-${useId().replace(/:/g, "")}`;
  return (
    <Icon className="member-nav-icon size-[1.45rem] shrink-0" stroke={`url(#${id})`} strokeWidth={active ? 2.5 : 2} aria-hidden>
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