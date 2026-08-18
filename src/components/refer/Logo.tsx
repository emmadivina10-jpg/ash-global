import { cn } from "@/lib/utils";
import ashLogo from "@/assets/ash-logo.png.asset.json";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="brand-gradient grid size-9 place-items-center overflow-hidden rounded-xl text-on-dark shadow-[var(--shadow-brand)]">
        <img src={ashLogo.url} alt="ASH Glo" className="size-7 object-contain" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 leading-none">
          <span className="font-display text-lg font-extrabold tracking-tight text-foreground">ASH Glo</span>
        </span>
        {!compact ? (
          <span className="mt-1 block text-[11px] font-medium leading-tight text-muted-foreground">
            Refer. Earn. Discover. Grow.
          </span>
        ) : null}
      </span>
    </span>
  );
}
