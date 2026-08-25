import { cn } from "@/lib/utils";
import ashLogo from "@/assets/ash-logo.png.asset.json";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src={ashLogo.url}
        alt="ASH Glo"
        className="size-9 shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(228,48,107,0.35)]"
      />
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

