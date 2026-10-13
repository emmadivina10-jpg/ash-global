import { VerifiedBadge } from "@/components/refer/VerifiedBadge";

/**
 * The shared ASH brand seal shown on groups owned by a verified member.
 */
export function GroupVerifiedBadge({
  className,
  label = "Verified group",
}: {
  className?: string;
  label?: string;
}) {
  return <VerifiedBadge tier="VERIFIED" label={label} size={16} className={className} />;
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
