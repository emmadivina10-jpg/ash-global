import { cn } from "@/lib/utils";
import ashLogo from "@/assets/ash-logo.png.asset.json";

/**
 * The official ASH brand mark (red rounded square with white ASH wordmark).
 * Used for the orb, the nav hub and every AI surface so AI always reads as
 * ASH, never as a generic robot.
 */
export function AshMark({ className, ai = true }: { className?: string; ai?: boolean }) {
  return (
    <span className={cn("relative inline-block size-6 shrink-0", className)} aria-hidden>
      <img
        src={ashLogo.url}
        alt=""
        className="size-full rounded-[24%] object-cover shadow-sm"
        draggable={false}
      />
      {ai ? (
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[hsl(var(--gold,45_93%_58%))] ring-2 ring-background" />
      ) : null}
    </span>
  );
}
