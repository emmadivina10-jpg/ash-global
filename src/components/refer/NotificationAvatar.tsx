import { Bell } from "lucide-react";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { Avatar } from "@/components/refer/AvatarUpload";
import { cn } from "@/lib/utils";

/** Small round ASH logo pinned to the bottom-right of a round photo. */
export function NotificationAvatarBadge({ className }: { className?: string | undefined }) {
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 z-10 grid size-[42%] min-h-4 min-w-4 place-items-center overflow-hidden rounded-full bg-background ring-2 ring-background shadow-sm",
        className,
      )}
    >
      <img
        src={ashLogo.url}
        alt="ASH"
        className="size-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

/**
 * The sender's round photo with a small round ASH logo on its bottom-right,
 * like notifications in other messaging apps.
 */
export function NotificationAvatar({
  path,
  name,
  className,
}: {
  path?: string | null | undefined;
  name?: string | null | undefined;
  className?: string | undefined;
}) {
  const hasPerson = Boolean(path || name);
  return (
    <span className={cn("relative inline-block size-11 shrink-0", className)}>
      {hasPerson ? (
        <Avatar path={path} name={name} className="size-full" />
      ) : (
        <span className="grid size-full place-items-center rounded-full bg-muted text-muted-foreground">
          <Bell className="size-1/2" aria-hidden />
        </span>
      )}
      <NotificationAvatarBadge />
    </span>
  );
}
