import { cn } from "@/lib/utils";
import ashLogo from "@/assets/ash-logo.png.asset.json";

export function Logo({ className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
<img
        src={ashLogo.url}
        alt="ASH"
        className="size-9 shrink-0 rounded-full bg-primary-deep object-cover p-0.5 ring-1 ring-border/50 drop-shadow-[0_2px_10px_rgba(228,48,107,0.35)]"
      />

      <span className="min-w-0">
        <span className="flex items-center gap-1.5 leading-none">
          <span className="font-display text-lg font-extrabold tracking-tight text-foreground">ASH</span>
        </span>
      </span>

    </span>
  );
}

