import { cn } from "@/lib/utils";

/**
 * Familiar blue verification seal with a crisp white check.
 */
export function VerifiedBadge({
  tier,
  until,
  className,
  size = 14,
  label: customLabel,
}: {
  tier?: string | null | undefined;
  until?: string | null | undefined;
  className?: string | undefined;
  size?: number | undefined;
  label?: string | undefined;
}) {
  if (!tier) return null;
  if (until && new Date(until).getTime() < Date.now()) return null;

  const label =
    customLabel ??
    (tier === "BUSINESS_PLUS"
      ? "ASH Verified Business Plus"
      : tier === "BUSINESS"
        ? "ASH Verified Business"
        : "ASH Verified");

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
        fill="var(--color-social-verified)"
        d="M12 1.6 14.14 3l2.54-.18 1.18 2.26 2.36.95.18 2.54L21.8 10.7 20.82 13l.98 2.3-1.4 2.13-.18 2.54-2.36.95-1.18 2.26-2.54-.18L12 24.4 9.86 23l-2.54.18-1.18-2.26-2.36-.95-.18-2.54L2.2 15.3l.98-2.3-.98-2.3 1.4-2.13.18-2.54 2.36-.95 1.18-2.26L9.86 3 12 1.6Z"
        transform="translate(0 -1)"
      />
      <path
        fill="none"
        stroke="var(--color-on-dark)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
        d="m7.1 11.9 3.15 3.15 6.7-7.1"
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
