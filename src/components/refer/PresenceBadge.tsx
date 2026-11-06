import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Real-presence badge: pulsing green when online, solid red when offline. */
export function PresenceBadge({ online, className }: { online: boolean; className?: string }) {
  const { tx } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
        online
          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/12 text-red-600 dark:text-red-400",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("presence-dot", online ? "presence-dot-online" : "presence-dot-offline")}
      />
      {online ? tx("Online", "En ligne") : tx("Offline", "Hors ligne")}
    </span>
  );
}

export function isShowableVendor(vendor: { business_name?: string | null }): boolean {
  return Boolean(vendor.business_name?.trim());
}
