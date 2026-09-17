import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ReactionType,
  Story,
  StoryGroup,
  isStoryVideoSource,
  recordStoryView,
  useCreateStory,
  useDeleteStory,
  useSetStoryReaction,
  useStories,
} from "@/lib/social.queries";

const REACTIONS: Array<{ value: ReactionType; label: string }> = [
  { value: "love", label: "❤️" },
  { value: "like", label: "👍" },
  { value: "haha", label: "😂" },
  { value: "wow", label: "😮" },
  { value: "sad", label: "😢" },
  { value: "angry", label: "😡" },
];

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "A"
  );
}

function MediaPreview({
  src,
  kind,
  className = "",
  controls = false,
  muted = true,
  onEnded,
}: {
  src: string;
  kind: "image" | "video";
  className?: string;
  controls?: boolean;
  muted?: boolean;
  onEnded?: () => void;
}) {
  if (kind === "video") {
    return (
      <video
        src={src}
        className={className}
        controls={controls}
        muted={muted}
        playsInline
        preload="metadata"
        onEnded={onEnded}
      />
    );
  }

  return <img src={src} alt="" className={className} loading="lazy" />;
}

export function StoriesRail() {
  const { data, isLoading, isError, error } = useStories();
  const createStory = useCreateStory();
  const deleteStory = useDeleteStory();
  const setReaction = useSetStoryReaction();

  const groups = data?.groups ?? [];
  const me = data?.me ?? null;

  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const storyVideoRef = useRef<HTMLVideoElement | null>(null);

  const activeGroup: StoryGroup | null = groups[groupIndex] ?? null;
  const activeStory: Story | null = activeGroup?.stories[storyIndex] ?? null;

  const flatCount = useMemo(() => groups.reduce((total, group) => total + group.stories.length, 0), [groups]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!viewerOpen || !activeStory) return;
    void recordStoryView(activeStory.id);
  }, [viewerOpen, activeStory]);

  useEffect(() => {
    if (!viewerOpen || !activeStory || activeStory.media_type !== "video") return;
    const video = storyVideoRef.current;
    if (!video) return;
    video.muted = muted;
    void video.play().catch(() => undefined);
  }, [viewerOpen, activeStory, muted]);

  function openComposer() {
    setComposerOpen(true);
  }

  function closeComposer() {
    if (publishing) return;
    setComposerOpen(false);
    setSelectedFile(null);
    setCaption("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    const isVideo = isStoryVideoSource(file);
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(file.name);

    if (!isVideo && !isImage) {
      toast.error("Please choose a photo or video.");
      return;
    }

    if (isVideo && file.size > 50 * 1024 * 1024) {
      toast.error("Videos must be 50 MB or smaller.");
      return;
    }

    if (isImage && file.size > 12 * 1024 * 1024) {
      toast.error("Photos must be 12 MB or smaller.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setComposerOpen(true);
  }

  async function publish() {
    if (!selectedFile || publishing) return;

    setPublishing(true);
    try {
      await createStory.mutateAsync({
        file: selectedFile,
        caption,
        audience: "ALL",
        allowIds: [],
        blockIds: [],
      });

      toast.success("Story published.");
      closeComposer();
    } catch (publishError) {
      const message = publishError instanceof Error ? publishError.message : "Could not publish your story.";
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  }

  function openStory(nextGroupIndex: number, nextStoryIndex = 0) {
    if (!groups[nextGroupIndex]) return;
    setGroupIndex(nextGroupIndex);
    setStoryIndex(nextStoryIndex);
    setMuted(true);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
    setGroupIndex(0);
    setStoryIndex(0);
  }

  function nextStory() {
    if (!activeGroup) return;

    if (storyIndex < activeGroup.stories.length - 1) {
      setStoryIndex((value) => value + 1);
      return;
    }

    if (groupIndex < groups.length - 1) {
      setGroupIndex((value) => value + 1);
      setStoryIndex(0);
      return;
    }

    closeViewer();
  }

  function previousStory() {
    if (storyIndex > 0) {
      setStoryIndex((value) => value - 1);
      return;
    }

    if (groupIndex > 0) {
      const previousGroupIndex = groupIndex - 1;
      setGroupIndex(previousGroupIndex);
      setStoryIndex(Math.max(0, groups[previousGroupIndex].stories.length - 1));
    }
  }

  async function removeStory() {
    if (!activeStory) return;
    const isMine = me === activeStory.author_id;
    if (!isMine || deleteStory.isPending) return;

    try {
      await deleteStory.mutateAsync(activeStory.id);
      toast.success("Story deleted.");
      closeViewer();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Could not delete story.");
    }
  }

  return (
    <>
      <section className="space-y-3" aria-label="ASH Stories">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-foreground">Stories</h2>
            <p className="text-xs text-muted-foreground">Share a photo or video that disappears after 24 hours.</p>
          </div>
          {flatCount > 0 ? (
            <span className="text-[11px] font-semibold text-muted-foreground">{flatCount} live</span>
          ) : null}
        </div>

        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={openComposer}
            className="relative h-48 w-[124px] shrink-0 overflow-hidden rounded-[22px] border border-border bg-gradient-to-br from-[#D4AF37]/25 via-card to-[#4B0082]/30 text-left shadow-sm transition-transform active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-gradient-to-b from-transparent to-black/35" />
            <span className="absolute left-3 top-3 grid size-10 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg">
              <Plus className="size-5" />
            </span>
            <span className="absolute inset-x-3 bottom-3 z-10 text-white">
              <span className="block text-sm font-black">Create</span>
              <span className="block text-[11px] font-semibold text-white/80">Story</span>
            </span>
          </button>

          {isLoading
            ? [0, 1, 2, 3].map((key) => (
                <div key={key} className="h-48 w-[124px] shrink-0 animate-pulse rounded-[22px] bg-muted" />
              ))
            : null}

          {!isLoading &&
            groups.map((group, index) => {
              const story = group.stories[0];
              if (!story) return null;
              const mine = me === group.author.id;
              return (
                <button
                  type="button"
                  key={`${group.author.id}-${story.id}`}
                  onClick={() => openStory(index, 0)}
                  className="group relative h-48 w-[124px] shrink-0 overflow-hidden rounded-[22px] border border-border bg-black text-left shadow-sm transition-transform active:scale-[0.98]"
                >
                  <MediaPreview
                    src={story.url}
                    kind={story.media_type}
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    muted
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                  <span className="absolute left-2.5 top-2.5 z-10 flex size-9 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-card shadow-md">
                    {group.author.avatar_url ? (
                      <img src={group.author.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-black text-foreground">{initials(group.author.name)}</span>
                    )}
                  </span>
                  {story.media_type === "video" ? (
                    <span className="absolute right-2.5 top-2.5 z-10 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md">
                      <Play className="size-3.5 fill-current" />
                    </span>
                  ) : null}
                  <span className="absolute inset-x-3 bottom-3 z-10 text-white">
                    <span className="block truncate text-[12px] font-extrabold">
                      {mine ? "Your Story" : group.author.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-white/75">
                      {group.stories.length} {group.stories.length === 1 ? "story" : "stories"}
                    </span>
                  </span>
                </button>
              );
            })}

          {!isLoading && isError ? (
            <button
              type="button"
              onClick={() => toast.error(error instanceof Error ? error.message : "Could not load stories.")}
              className="h-48 w-[220px] shrink-0 rounded-[22px] border border-dashed border-destructive/40 bg-destructive/5 px-4 text-left text-sm font-semibold text-muted-foreground"
            >
              Stories could not be loaded. Tap to see the error.
            </button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg,.mp4,.webm,.mov,.m4v,.ogv"
          className="hidden"
          onChange={pickFile}
        />
      </section>

      {composerOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[100000] bg-black/65 p-3 backdrop-blur-md sm:p-6">
              <div className="mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-background shadow-2xl sm:h-auto sm:max-h-[90vh]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-black">Create Story</p>
                    <p className="text-[11px] text-muted-foreground">Photo or video · 24 hours</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeComposer}
                    disabled={publishing}
                    className="grid size-9 place-items-center rounded-full bg-muted text-foreground disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {previewUrl ? (
                    <div className="relative overflow-hidden rounded-[24px] border border-border bg-black">
                      {selectedFile && isStoryVideoSource(selectedFile) ? (
                        <video
                          src={previewUrl}
                          className="max-h-[55vh] w-full object-contain"
                          controls
                          playsInline
                          muted={false}
                          preload="metadata"
                        />
                      ) : (
                        <img src={previewUrl} alt="Story preview" className="max-h-[55vh] w-full object-contain" />
                      )}
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={publishing}
                        className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-2 text-xs font-bold text-white backdrop-blur-md disabled:opacity-50"
                      >
                        Change media
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="grid min-h-72 w-full place-items-center rounded-[24px] border border-dashed border-border bg-muted/30"
                    >
                      <span className="grid place-items-center gap-3 text-center">
                        <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                          <ImagePlus className="size-6" />
                        </span>
                        <span>
                          <span className="block text-sm font-black">Choose photo or video</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Photos up to 12 MB · videos up to 50 MB
                          </span>
                        </span>
                      </span>
                    </button>
                  )}

                  <textarea
                    value={caption}
                    onChange={(event) => setCaption(event.target.value.slice(0, 500))}
                    placeholder="Add a caption…"
                    className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-border bg-muted/25 p-3 text-sm outline-none ring-primary/20 focus:ring-4"
                    disabled={publishing}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border p-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                    disabled={publishing}
                  >
                    <Camera className="mr-2 size-4" />
                    Media
                  </Button>
                  <Button type="button" onClick={publish} disabled={!selectedFile || publishing} className="min-w-28">
                    {publishing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    {publishing ? "Publishing…" : "Publish"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {viewerOpen && activeStory && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[110000] flex h-[100dvh] w-screen items-center justify-center bg-black">
              <div className="absolute inset-0 bg-black" />

              <div className="relative z-10 flex h-full w-full max-w-3xl flex-col overflow-hidden bg-black sm:h-[96vh] sm:rounded-[28px] sm:border sm:border-white/10">
                <div className="absolute left-0 right-0 top-0 z-30 p-3 sm:p-5">
                  <div className="mb-3 flex gap-1">
                    {activeGroup?.stories.map((story) => (
                      <span key={story.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                        <span
                          className={`block h-full rounded-full bg-white transition-all ${
                            story.id === activeStory.id ? "w-full" : "w-0"
                          }`}
                        />
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 text-white">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/70 bg-white/10">
                        {activeGroup?.author.avatar_url ? (
                          <img src={activeGroup.author.avatar_url} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-black">{initials(activeGroup?.author.name ?? "ASH")}</span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold">{activeGroup?.author.name ?? "ASH member"}</p>
                        <p className="text-[10px] text-white/65">24h story</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {activeStory.media_type === "video" ? (
                        <button
                          type="button"
                          onClick={() => setMuted((value) => !value)}
                          className="grid size-9 place-items-center rounded-full bg-white/10 backdrop-blur-md"
                          aria-label={muted ? "Unmute" : "Mute"}
                        >
                          {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                        </button>
                      ) : null}
                      {me === activeStory.author_id ? (
                        <button
                          type="button"
                          onClick={removeStory}
                          disabled={deleteStory.isPending}
                          className="grid size-9 place-items-center rounded-full bg-white/10 backdrop-blur-md disabled:opacity-50"
                          aria-label="Delete story"
                        >
                          {deleteStory.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={closeViewer}
                        className="grid size-9 place-items-center rounded-full bg-white/10 backdrop-blur-md"
                        aria-label="Close story"
                      >
                        <X className="size-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={previousStory}
                  className="absolute left-0 top-0 z-20 h-full w-1/5"
                  aria-label="Previous story"
                >
                  <span className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-md sm:block">
                    <ChevronLeft className="size-5" />
                  </span>
                </button>

                <div className="relative flex min-h-0 flex-1 items-center justify-center">
                  {activeStory.media_type === "video" ? (
                    <video
                      ref={storyVideoRef}
                      key={activeStory.id}
                      src={activeStory.url}
                      className="max-h-full max-w-full object-contain"
                      autoPlay
                      playsInline
                      muted={muted}
                      controls
                      preload="auto"
                      onEnded={nextStory}
                    />
                  ) : (
                    <img
                      key={activeStory.id}
                      src={activeStory.url}
                      alt={activeStory.caption || "ASH story"}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={nextStory}
                  className="absolute right-0 top-0 z-20 h-full w-1/5"
                  aria-label="Next story"
                >
                  <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-md sm:block">
                    <ChevronRight className="size-5" />
                  </span>
                </button>

                <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pb-4 pt-16 sm:px-6 sm:pb-6">
                  {activeStory.caption ? (
                    <p className="mx-auto mb-3 max-w-2xl whitespace-pre-wrap text-sm font-semibold leading-6 text-white">
                      {activeStory.caption}
                    </p>
                  ) : null}

                  <div className="mx-auto flex max-w-2xl items-end justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
                      <Eye className="size-4" />
                      {activeStory.view_count ?? 0}
                    </div>

                    <div className="flex items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur-md">
                      {REACTIONS.map((reaction) => {
                        const active = activeStory.current_reaction === reaction.value;
                        return (
                          <button
                            key={reaction.value}
                            type="button"
                            onClick={async () => {
                              try {
                                await setReaction.mutateAsync({
                                  storyId: activeStory.id,
                                  reaction: active ? null : reaction.value,
                                });
                              } catch (reactionError) {
                                toast.error(
                                  reactionError instanceof Error ? reactionError.message : "Could not update reaction.",
                                );
                              }
                            }}
                            className={`grid size-9 place-items-center rounded-full text-base transition ${
                              active ? "bg-white text-black" : "text-white hover:bg-white/10"
                            }`}
                            aria-label={reaction.value}
                          >
                            {reaction.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
