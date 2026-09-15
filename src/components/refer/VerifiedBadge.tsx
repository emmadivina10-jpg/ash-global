import { cn } from "@/lib/utils";

/**
 * The ASH Verified check. Same familiar blue mark people already trust,
 * shown next to the name of any member or vendor with an active badge.
 */
export function VerifiedBadge({
  tier,
  until,
  className,
  size = 14,
}: {
  tier?: string | null;
  until?: string | null;
  className?: string;
  size?: number;
}) {
  if (!tier) return null;
  if (until && new Date(until).getTime() < Date.now()) return null;

  const label =
    tier === "BUSINESS_PLUS" ? "ASH Verified Business Plus" : tier === "BUSINESS" ? "ASH Verified Business" : "ASH Verified";

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={cn("inline-block shrink-0 align-[-0.125em]", className)}
    >
      <title>{label}</title>
      <path
        fill="#1877F2"
        d="M12 1.5l2.47 1.9 3.1-.22.86 2.99 2.67 1.6-1.25 2.85 1.25 2.85-2.67 1.6-.86 2.99-3.1-.22L12 22.5l-2.47-1.9-3.1.22-.86-2.99-2.67-1.6 1.25-2.85L2.9 10.53l2.67-1.6.86-2.99 3.1.22L12 1.5z"
      />
      <path
        fill="#fff"
        d="M10.75 15.4l-3-3 1.24-1.25 1.76 1.76 4.26-4.26 1.24 1.25-5.5 5.5z"
      />
    </svg>
  );
}

export type VerifiedFields = { verified_tier?: string | null; verified_until?: string | null };

/** Convenience: name text followed by the badge when the person is verified. */
export function NameWithBadge({
  name,
  person,
  className,
  size = 14,
}: {
  name: string;
  person?: VerifiedFields | null;
  className?: string;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className="truncate">{name}</span>
      <VerifiedBadge tier={person?.verified_tier ?? null} until={person?.verified_until ?? null} size={size} />
    </span>
  );
}
