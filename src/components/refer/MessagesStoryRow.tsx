import { Plus } from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { useI18n } from "@/lib/i18n";
import { useProfile, useUser } from "@/lib/queries";
import { useStories } from "@/lib/social.queries";
import { cn } from "@/lib/utils";

/**
 * Story row for the Messages header: rounded avatar bubbles in the TikTok/Instagram style.
 * "Your story" comes first with a plus badge; viewing and uploading reuse StoriesRail.
 */
export function MessagesStoryRow({
  onView,
  onCreate,
}: {
  onView: (authorId: string) => void;
  onCreate: () => void;
}) {
  const { tx } = useI18n();
  const { user } = useUser();
  const me = user?.id ?? null;
  const { data: profile } = useProfile();
  const { data } = useStories();
  const groups = data?.groups ?? [];
  const mine = groups.find((group) => group.author.id === me) ?? null;
  const others = groups.filter((group) => group.author.id !== me);

  return (
    <ul
      aria-label={tx("Stories", "Stories")}
      className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <li className="shrink-0">
        <div className="relative flex w-[68px] flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => (mine && me ? onView(me) : onCreate())}
            aria-label={mine ? tx("View your story", "Voir votre story") : tx("Add to your story", "Ajouter à votre story")}
            className={cn(
              "story-bubble grid size-[68px] place-items-center rounded-full p-[3px] transition-transform duration-200 active:scale-95",
              mine ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600" : "bg-border",
            )}
          >
            <span className="grid size-full place-items-center overflow-hidden rounded-full bg-background p-[2px]">
              <Avatar
                path={profile?.avatar_url}
                name={profile?.full_name}
                hasUpdate={false}
                className="size-full aspect-square rounded-full border-0 shadow-none"
              />
            </span>
          </button>
          <button
            type="button"
            onClick={onCreate}
            aria-label={tx("Add to your story", "Ajouter à votre story")}
            className="absolute right-0 top-[44px] grid size-6 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-transform duration-200 active:scale-90"
          >
            <Plus className="size-3.5" strokeWidth={3} aria-hidden />
          </button>
          <span className="w-full truncate text-center text-[11px] font-semibold text-foreground">
            {tx("Your story", "Votre story")}
          </span>
        </div>
      </li>
      {others.map((group) => (
        <li key={group.author.id} className="shrink-0">
          <button
            type="button"
            onClick={() => onView(group.author.id)}
            aria-label={`${tx("View status from", "Voir le statut de")} ${group.author.name}`}
            className="flex w-[68px] flex-col items-center gap-1.5 transition-transform duration-200 active:scale-95"
          >
            <span
              className={cn(
                "story-bubble grid size-[68px] place-items-center rounded-full p-[3px]",
                group.seen ? "bg-border" : "bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600",
              )}
            >
              <span className="grid size-full place-items-center overflow-hidden rounded-full bg-background p-[2px]">
                <Avatar
                  path={group.author.avatar_url}
                  name={group.author.name}
                  hasUpdate={false}
                  className="size-full aspect-square rounded-full border-0 shadow-none"
                />
              </span>
            </span>
            <span className="w-full truncate text-center text-[11px] font-medium text-muted-foreground">
              {group.author.name}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
