import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The solid blue badge shown on groups owned by a verified ASH member.
 * Same flat blue as the badge people recognise from Facebook.
 */
export function GroupVerifiedBadge({
  className,
  label = "Verified group",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <BadgeCheck
      aria-label={label}
      role="img"
      className={cn("size-4 shrink-0", className)}
      style={{ color: "#1877F2", fill: "#1877F2", stroke: "#ffffff" }}
      strokeWidth={2.2}
    />
  );
}

/** Stable, readable bubble colours so each speaker in a group reads differently. */
const GROUP_COLORS = [
  "#2563eb",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#c2410c",
  "#15803d",
  "#b45309",
  "#4338ca",
  "#0f766e",
  "#9d174d",
];

export function groupColorFor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return GROUP_COLORS[hash % GROUP_COLORS.length] as string;
}
