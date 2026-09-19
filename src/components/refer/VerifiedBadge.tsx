import { cn } from "@/lib/utils";

/**
 * Solid ASH Verified check with a crisp high-contrast centre.
 */
export function VerifiedBadge({
  tier,
  until,
  className,
  size = 14,
}: {
  tier?: string | null | undefined;
  until?: string | null | undefined;
  className?: string | undefined;
  size?: number | undefined;
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
      <path className="fill-primary" d="M12 1.25 14.5 3l3.05-.35.9 2.95 2.65 1.55-1.2 2.82 1.2 2.83-2.65 1.55-.9 2.95-3.05-.35L12 22.75 9.5 21l-3.05.35-.9-2.95-2.65-1.55 1.2-2.83L2.9 7.15 5.55 5.6l.9-2.95L9.5 3 12 1.25Z" />
      <circle cx="12" cy="12" r="6.15" className="fill-primary" />
      <path
        className="fill-primary-foreground"
        d="m10.35 15.75-3.2-3.2 1.55-1.55 1.65 1.65 4.95-4.95 1.55 1.55-6.5 6.5Z"
      />
    </svg>
  );
}

export type VerifiedFields = { verified_tier?: string | null | undefined; verified_until?: string | null };

/** Convenience: name text followed by the badge when the person is verified. */
export function NameWithBadge({
  name,
  person,
  className,
  size = 14,
}: {
  name: string;
  person?: VerifiedFields | null;
  className?: string | undefined;
  size?: number | undefined;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className="truncate">{name}</span>
      <VerifiedBadge tier={person?.verified_tier ?? null} until={person?.verified_until ?? null} size={size} />
    </span>
  );
}
