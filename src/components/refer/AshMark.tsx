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
        d="M7.5 25.5 16 6.5l8.5 19M11.4 19h9.2"
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
