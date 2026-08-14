import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="brand-gradient grid size-9 place-items-center rounded-xl text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M5 19V7a2 2 0 0 1 2-2h6a4 4 0 0 1 0 8H9m5 0 5 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-bold leading-none text-foreground">Refer</span>
        {!compact ? (
          <span className="block text-[11px] font-medium leading-tight text-muted-foreground">
            Refer. Earn. Grow.
          </span>
        ) : null}
      </span>
    </span>
  );
}
