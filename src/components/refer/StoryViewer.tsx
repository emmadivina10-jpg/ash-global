import { useEffect, useRef, useState } from "react";
import { Eye, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./AvatarUpload";
import {
  recordStoryView,
  useDeleteStory,
  useStoryViewers,
  useSetStoryReaction,
  type StoryGroup,
} from "@/lib/social.queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ReactionButton } from "./ReactionButton";

const SEGMENT_MS = 5000;

/**
 * Full-screen story player: segment bars at the top, tap right/left to move,
 * hold to pause, and — for your own story — a TikTok-style viewer list.
 */
export function StoryViewer({
  groups,
  startIndex,
  currentUserId,
  onClose,
}: {
  groups: StoryGroup[];
  startIndex: number;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewersOpen, setViewersOpen] = useState(false);
  const deleteStory = useDeleteStory();
  const reactStory = useSetStoryReaction();
  const startedAt = useRef(Date.now());
  const pressAt = useRef<{ time: number; x: number } | null>(null);
  const elapsed = useRef(0);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const mine = Boolean(story && currentUserId && story.author_id === currentUserId);
  const { data: viewers } = useStoryViewers(viewersOpen && story ? story.id : null);

  // Record the view once per story.
  useEffect(() => {
    if (!story || mine) return;
    void recordStoryView(story.id);
  }, [story, mine]);

  function next() {
    const current = groups[groupIndex];
    if (!current) return onClose();
    if (storyIndex + 1 < current.stories.length) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex + 1 < groups.length) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }

  function previous() {
    if (storyIndex > 0) setStoryIndex(storyIndex - 1);
    else if (groupIndex > 0) {
      const prev = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(Math.max(0, (prev?.stories.length ?? 1) - 1));
    }
  }

  // Restart the segment whenever the story changes.
  useEffect(() => {
    elapsed.current = 0;
    setProgress(0);
  }, [groupIndex, storyIndex]);

  // Auto-advance timer. Holding pauses it and keeps the elapsed time, so the
  // bar carries on from where it stopped when the finger is lifted.
  useEffect(() => {
    if (paused || viewersOpen) return;
    startedAt.current = Date.now();
    const tick = window.setInterval(() => {
      const total = elapsed.current + (Date.now() - startedAt.current);
      setProgress(Math.min(1, total / SEGMENT_MS));
      if (total >= SEGMENT_MS) {
        elapsed.current = 0;
        next();
      }
    }, 60);
    return () => {
      window.clearInterval(tick);
      elapsed.current += Date.now() - startedAt.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, paused, viewersOpen]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset["mediaViewerOpen"] = "true";
    return () => {
      document.body.style.overflow = previous;
      delete document.documentElement.dataset["mediaViewerOpen"];
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex]);

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col bg-black">
      <div className="flex gap-1 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        {group.stories.map((s, index) => (
          <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <span
              className="block h-full bg-white transition-[width] duration-75"
              style={{ width: index < storyIndex ? "100%" : index === storyIndex ? `${progress * 100}%` : "0%" }}
            />
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar path={group.author.avatar_url} name={group.author.name} online={group.author.online} hasUpdate={!mine} className="size-9" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{group.author.name}</p>
        {mine ? (
          <button
            type="button"
            disabled={deleteStory.isPending}
            onClick={() => {
              if (!window.confirm(fr ? "Supprimer cette story ?" : "Delete this story?")) return;
              deleteStory.mutate(story.id, {
                onSuccess: () => {
                  toast.success(fr ? "Story supprimée" : "Story deleted");
                  onClose();
                },
                onError: (error) =>
                  toast.error(error instanceof Error ? error.message : fr ? "Suppression impossible." : "Could not delete story."),
              });
            }}
            aria-label={fr ? "Supprimer" : "Delete"}
            className="grid size-9 place-items-center rounded-full bg-white/10 text-white"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label={fr ? "Fermer" : "Close"}
          className="grid size-9 place-items-center rounded-full bg-white/10 text-white"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1 touch-none select-none"
        onPointerDown={(event) => {
          pressAt.current = { time: Date.now(), x: event.clientX };
          setPaused(true);
        }}
        onPointerUp={(event) => {
          const press = pressAt.current;
          pressAt.current = null;
          setPaused(false);
          if (!press) return;
          // A quick tap moves between segments; a long press only pauses.
          if (Date.now() - press.time > 260) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX - bounds.left < bounds.width / 3) previous();
          else next();
        }}
        onPointerCancel={() => {
          pressAt.current = null;
          setPaused(false);
        }}
      >
        <img src={story.url} alt={story.caption || "Story"} className="size-full object-contain" decoding="async" />
        {story.caption ? (
          <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-6 pt-10 text-center text-sm text-white">
            {story.caption}
          </p>
        ) : null}
      </div>

      <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
        {!mine ? <ReactionButton value={story.current_reaction} total={story.reaction_count} breakdown={story.reaction_breakdown} disabled={reactStory.isPending} onChange={(reaction) => reactStory.mutate({ storyId: story.id, reaction })} /> : null}
        {mine ? (
          <button
            type="button"
            onClick={() => setViewersOpen((value) => !value)}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white"
          >
            <Eye className="size-4" aria-hidden />
            {story.view_count} {fr ? "vues" : "views"}
          </button>
        ) : null}
        </div>
      </div>

      {viewersOpen ? (
        <div className="absolute inset-x-0 bottom-0 z-10 max-h-[60%] overflow-y-auto rounded-t-3xl bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-base font-extrabold text-foreground">
              {fr ? "Vu par" : "Viewed by"} ({viewers?.length ?? 0})
            </p>
            <button type="button" onClick={() => setViewersOpen(false)} aria-label={fr ? "Fermer" : "Close"}>
              <X className="size-5 text-muted-foreground" aria-hidden />
            </button>
          </div>
          {(viewers ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {fr ? "Personne ne l'a encore vue." : "Nobody has watched it yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {(viewers ?? []).map((entry) => (
                <li key={entry.viewer.id} className="flex items-center gap-3">
                  <Avatar path={entry.viewer.avatar_url} name={entry.viewer.name} online={entry.viewer.online} hasUpdate={entry.viewer.has_update} className="size-9" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {entry.viewer.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.at).toLocaleTimeString(fr ? "fr-FR" : "en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Round story bubble used in the rail. */
export function StoryBubble({
  name,
  avatar,
  image,
  seen,
  onClick,
}: {
  name: string;
  avatar: string | null;
  image: string | undefined;
  seen: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-20 shrink-0 flex-col items-center gap-1.5">
      <span
        className={cn(
          "grid size-[68px] place-items-center rounded-full p-[3px]",
          seen ? "bg-border" : "brand-gradient",
        )}
      >
        <span className="grid size-full place-items-center overflow-hidden rounded-full border-2 border-background bg-muted">
          {image ? (
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            <Avatar path={avatar} name={name} className="size-full rounded-full" />
          )}
        </span>
      </span>
      <span className="w-full truncate text-center text-[11px] font-semibold text-muted-foreground">{name}</span>
    </button>
  );
}
