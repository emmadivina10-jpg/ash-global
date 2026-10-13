import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function UnreadMessageBadge({ count, className }: { count: number; className?: string }) {
  const { tx } = useI18n();
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-background",
        className,
      )}
    >
      <span aria-hidden>{count > 99 ? "99+" : count}</span>
      <span className="sr-only">
        {count} {tx("unread messages", "messages non lus")}
      </span>
    </span>
  );
}
