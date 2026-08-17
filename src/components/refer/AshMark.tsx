import { cn } from "@/lib/utils";

/**
 * The ASH mark with an "intelligence" treatment: the same brand glyph as the
 * logo, orbited by three thinking nodes. Used for the orb and every AI surface
 * so AI always reads as ASH, never as a generic robot.
 */
export function AshMark({ className, ai = true }: { className?: string; ai?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-6", className)} fill="none" aria-hidden>
      <path
        d="M9 24V10a2.5 2.5 0 0 1 2.5-2.5h6a4.5 4.5 0 0 1 0 9h-4.5m5.5 0 5.5 7.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {ai ? (
        <>
          <circle cx="26" cy="7" r="2.2" fill="currentColor" opacity="0.95" />
          <circle cx="30" cy="13" r="1.2" fill="currentColor" opacity="0.65" />
          <circle cx="21" cy="4" r="1" fill="currentColor" opacity="0.5" />
        </>
      ) : null}
    </svg>
  );
}
