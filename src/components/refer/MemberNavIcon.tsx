import { useId } from "react";
import type { LucideIcon } from "lucide-react";

/** Brand-metallic strokes without changing the icon's shape or accessibility. */
export function MemberNavIcon({
  icon: Icon,
  active = false,
}: {
  icon: LucideIcon;
  active?: boolean;
}) {
  const id = `member-icon-${useId().replace(/:/g, "")}`;
  return (
    <Icon
      className="member-nav-icon size-[1.45rem] shrink-0"
      stroke={`url(#${id})`}
      strokeWidth={active ? 2.35 : 1.9}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={active ? "var(--primary)" : "currentColor"} />
          <stop offset="48%" stopColor={active ? "var(--gold)" : "currentColor"} />
          <stop offset="52%" stopColor={active ? "var(--gold)" : "currentColor"} />
          <stop offset="100%" stopColor={active ? "var(--primary-dark)" : "currentColor"} />
        </linearGradient>
      </defs>
    </Icon>
  );
}
