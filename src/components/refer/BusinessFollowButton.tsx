import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuthGate } from "@/lib/guest-gate";
import { useFollowedBusinessIds, useToggleBusinessFollow } from "@/lib/business-follow.queries";
import { cn } from "@/lib/utils";

/** Compact Follow / Following control for a business author on Home. */
export function BusinessFollowButton({
  userId,
  targetId,
}: {
  userId: string;
  targetId: string;
}) {
  const { tx } = useI18n();
  const { requireAuth } = useAuthGate();
  const { data: followed = [], isPending } = useFollowedBusinessIds(userId);
  const toggle = useToggleBusinessFollow(userId);
  const following = followed.includes(targetId);

  return (
    <button
      type="button"
      aria-pressed={following}
      disabled={isPending || toggle.isPending}
      onClick={(event) => {
        event.stopPropagation();
        if (
          !requireAuth({
            en: "Sign in to follow businesses.",
            fr: "Connectez-vous pour suivre les entreprises.",
          })
        )
          return;
        toggle.mutate(
          { targetId, follow: !following },
          {
            onError: (error) =>
              toast.error(
                error instanceof Error
                  ? error.message
                  : tx("Could not update follow.", "Impossible de mettre à jour le suivi."),
              ),
          },
        );
      }}
      className={cn(
        "shrink-0 text-xs font-semibold transition-colors disabled:opacity-60",
        following ? "text-muted-foreground hover:text-destructive" : "text-primary hover:underline",
      )}
    >
      {following ? tx("Following", "Abonné") : tx("Follow", "Suivre")}
    </button>
  );
}
