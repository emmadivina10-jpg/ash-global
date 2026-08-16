import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="brand-gradient grid size-9 place-items-center rounded-xl text-primary-foreground shadow-[var(--shadow-brand)]">
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
        <span className="flex items-center gap-1.5 leading-none">
          <span className="font-display text-lg font-extrabold tracking-tight text-foreground">ASH Glo</span>
          <span className="brand-gradient rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary-foreground">
            REFER
          </span>
        </span>
        {!compact ? (
          <span className="mt-1 block text-[11px] font-medium leading-tight text-muted-foreground">
            Refer. Earn. Grow.
          </span>
        ) : null}
      </span>
    </span>
  );
}
