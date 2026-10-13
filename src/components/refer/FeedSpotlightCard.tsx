import { Play, Star } from "lucide-react";
import { Avatar } from "./AvatarUpload";
import { VerifiedBadge } from "./VerifiedBadge";
import { ExpandableSocialText } from "./ExpandableSocialText";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { isStoryVideoSource } from "@/lib/social.queries";
import type { SpotlightPost } from "./StoriesRail";
import { actualRating } from "./feed-spotlights";
import { SafetyMenu } from "./SafetyMenu";

export function FeedSpotlightCard({
  spotlight,
  onOpen,
}: {
  spotlight: SpotlightPost;
  onOpen: () => void;
}) {
  const { tx } = useI18n();
  const rating = actualRating(spotlight.provider.rating_avg, spotlight.provider.rating_count);
  return (
    <article
      className="overflow-hidden border-y border-border bg-card sm:rounded-lg sm:border"
      data-feed-spotlight={spotlight.id}
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar
          path={spotlight.provider.avatar_url}
          name={spotlight.provider.business_name}
          online={spotlight.provider.online}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span className="truncate">{spotlight.provider.business_name}</span>
            <VerifiedBadge
              tier={spotlight.provider.verified_tier}
              until={spotlight.provider.verified_until}
              size={14}
            />
          </p>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>Spotlight</span>
            {rating ? (
              <span
                className="inline-flex items-center gap-1"
                aria-label={`${rating.value.toFixed(1)} / 5 (${rating.reviews})`}
              >
                <Star className="size-3 fill-current text-gold" aria-hidden />
                {rating.value.toFixed(1)} <span>({rating.reviews})</span>
              </span>
            ) : null}
          </div>
        </div>
        <SafetyMenu
          targetType="SPOTLIGHT"
          targetId={spotlight.id}
          targetUserId={spotlight.provider.user_id ?? null}
          targetName={spotlight.provider.business_name}
        />
      </header>
      <Button
        variant="ghost"
        onClick={onOpen}
        aria-label={tx("Open Spotlight", "Ouvrir le Spotlight")}
        className="relative block h-auto w-full overflow-hidden rounded-none p-0 hover:bg-transparent"
      >
        {isStoryVideoSource(spotlight.url) ? (
          <video
            src={spotlight.url}
            muted
            playsInline
            preload="metadata"
            className="aspect-[4/5] max-h-[560px] w-full bg-media-backdrop object-contain"
          />
        ) : (
          <img
            src={spotlight.url}
            alt={spotlight.caption ?? spotlight.provider.business_name}
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] max-h-[560px] w-full bg-muted object-cover"
          />
        )}
        <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-media-backdrop/75 px-3 py-2 text-xs font-semibold text-on-dark">
          <Play className="size-4 fill-current" aria-hidden />
          Spotlight
        </span>
      </Button>
      {spotlight.caption ? (
        <div className="px-4 py-3">
          <ExpandableSocialText text={spotlight.caption} className="text-sm text-foreground" />
        </div>
      ) : null}
    </article>
  );
}
