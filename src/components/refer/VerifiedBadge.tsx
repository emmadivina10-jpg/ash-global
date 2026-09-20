import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Premium ASH Verified seal with a crisp high-contrast centre.
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

  const generatedId = useId().replace(/:/g, "");
  const gradientId = `ash-verified-${generatedId}`;
  const shineId = `ash-verified-shine-${generatedId}`;
  const label = customLabel ??
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
      <defs>
        <linearGradient id={gradientId} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-verified-violet)" />
          <stop offset="0.52" stopColor="var(--color-verified-magenta)" />
          <stop offset="1" stopColor="var(--color-verified-coral)" />
        </linearGradient>
        <linearGradient id={shineId} x1="5" y1="3" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-on-dark)" stopOpacity="0.48" />
          <stop offset="0.42" stopColor="var(--color-on-dark)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--color-verified-gold)" stopOpacity="0.26" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.25" fill={`url(#${gradientId})`} stroke="var(--color-verified-gold)" strokeOpacity="0.58" strokeWidth="1" />
      <circle cx="12" cy="12" r="9.1" fill={`url(#${shineId})`} />
      <path
        fill="none"
        stroke="var(--color-on-dark)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.8"
        d="m7.2 12.2 3.1 3.1 6.6-7"
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
