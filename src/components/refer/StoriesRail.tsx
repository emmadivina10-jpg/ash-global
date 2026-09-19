import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/queries";
import { openConversation } from "@/lib/marketplace.queries";
import { verifyMediaFiles } from "@/lib/media-safety";
import {
  isStoryVideoSource,
  recordStoryView,
  useCreateStory,
  useDeleteStory,
  useStories,
  useStoryViewers,
  type Story,
  type StoryGroup,
  uploadResumableStorageFile,
} from "@/lib/social.queries";
import { Button } from "@/components/ui/button";
import { Avatar as ProfileAvatar } from "@/components/refer/AvatarUpload";

const SOCIAL_BUCKET = "spotlight";
const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

const VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  ogv: "video/ogg",
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), ms);
    }),
  ]);
}

function isVideoSource(source: string | File | null | undefined): boolean {
  if (!source) return false;
  return isStoryVideoSource(source);
}

function initials(name: string | null | undefined): string {
  return (
    String(name ?? "Profile")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "A"
  );
}

function extensionOf(file: File): string {
  const raw = file.name.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]+$/.test(raw) ? raw : isVideoSource(file) ? "mp4" : "jpg";
}

function contentTypeOf(file: File): string {
  if (file.type) return file.type;
  return VIDEO_MIME_BY_EXTENSION[extensionOf(file)] ?? "image/jpeg";
}

async function uploadSpotlightMedia(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const video = isVideoSource(file);

  if (video) {
    if (file.size > VIDEO_MAX_BYTES) {
      throw new Error("Spotlight videos must be 50 MB or smaller.");
    }
  } else {
    if (!file.type.startsWith("image/") && !/\.(png|jpe?g|gif|webp|heic|heif)$/i.test(file.name)) {
      throw new Error("Please choose a photo or video.");
    }
    if (file.size > IMAGE_MAX_BYTES) {
      throw new Error("Spotlight photos must be 12 MB or smaller.");
    }
  }

  const path = `${userId}/spotlight/${crypto.randomUUID()}.${extensionOf(file)}`;
  const contentType = contentTypeOf(file);

  if (video && file.size > 6 * 1024 * 1024) {
    await uploadResumableStorageFile(SOCIAL_BUCKET, path, file, contentType, onProgress);
    return path;
  }

  onProgress?.(0);
  const { error } = await withTimeout(
    supabase.storage.from(SOCIAL_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    }),
    video ? 90_000 : 45_000,
    video ? "Spotlight video upload" : "Spotlight image upload",
  );

  if (error) {
    throw new Error(`Spotlight upload failed: ${error.message}`);
  }

  onProgress?.(100);
  return path;
}

type SpotlightPost = {
  id: string;
  url: string;
  caption: string | null;
  created_at?: string | null;
  provider: {
    id: string;
    user_id?: string | null;
    business_name: string;
    city?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean | null;
  };
};

type RailItem = { kind: "story"; group: StoryGroup; story: Story } | { kind: "spotlight"; spotlight: SpotlightPost };

function Avatar({
  src,
  name,
  className = "size-10",
}: {
  src?: string | null | undefined;
  name?: string | null | undefined;
  className?: string | undefined;
}) {
  return <ProfileAvatar path={src} name={name} className={className} />;
}

function spotlightMediaPath(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "path" in first) {
      const path = (first as { path?: unknown }).path;
      return typeof path === "string" ? path : null;
    }
    return null;
  }
  if (value && typeof value === "object" && "path" in value) {
    const path = (value as { path?: unknown }).path;
    return typeof path === "string" ? path : null;
  }
  return null;
}

async function loadSpotlights(): Promise<SpotlightPost[]> {
  const { data: rows, error } = await supabase
    .from("spotlight_posts")
    .select("id, author_id, media, caption, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const records = (rows ?? []) as Array<{
    id: string;
    author_id: string;
    media: unknown;
    caption: string | null;
    created_at: string | null;
  }>;

  if (records.length === 0) return [];

  const authorIds = Array.from(new Set(records.map((row) => row.author_id).filter(Boolean)));
  const mediaPaths = records
    .map((row) => spotlightMediaPath(row.media))
    .filter((path): path is string => Boolean(path));

  const [providersResult, signedResult] = await Promise.all([
    supabase
      .from("provider_profiles")
      .select("id, user_id, business_name, city, avatar_url, is_verified")
      .in("user_id", authorIds),
    mediaPaths.length > 0
      ? supabase.storage.from(SOCIAL_BUCKET).createSignedUrls(mediaPaths, 60 * 60 * 12)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (providersResult.error) throw providersResult.error;
  if (signedResult.error) throw signedResult.error;

  const providers = new Map(
    (
      (providersResult.data ?? []) as Array<{
        id: string;
        user_id: string;
        business_name: string;
        city: string | null;
        avatar_url: string | null;
        is_verified: boolean | null;
      }>
    ).map((provider) => [provider.user_id, provider]),
  );

  const signed = new Map(
    ((signedResult.data ?? []) as Array<{ path: string | null; signedUrl: string | null }>).map((item) => [
      item.path ?? "",
      item.signedUrl ?? "",
    ]),
  );

  return records.flatMap((row) => {
    const provider = providers.get(row.author_id);
    const path = spotlightMediaPath(row.media);
    const url = path ? (signed.get(path) ?? "") : "";
    if (!provider || !path || !url) return [];

    return [
      {
        id: row.id,
        url,
        caption: row.caption,
        created_at: row.created_at,
        provider: {
          id: provider.id,
          user_id: provider.user_id,
          business_name: provider.business_name,
          city: provider.city,
          avatar_url: provider.avatar_url,
          is_verified: provider.is_verified,
        },
      },
    ];
  });
}

export function StoriesRail() {
  const { user } = useUser();
  const me = user?.id ?? null;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: storyData, isLoading: storiesLoading } = useStories();
  const createStory = useCreateStory();
  const deleteStory = useDeleteStory();

  const { data: spotlights = [], isError: spotlightsError } = useQuery<SpotlightPost[]>({
    queryKey: ["ash-spotlights"],
    staleTime: 15_000,
    queryFn: loadSpotlights,
  });

  useEffect(() => {
    if (spotlightsError) console.warn("ASH Spotlights could not be loaded.");
  }, [spotlightsError]);

  const stories = storyData?.groups ?? [];

  const { data: profile } = useQuery({
    queryKey: ["stories-rail-profile", me],
    enabled: Boolean(me),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", me!)
        .maybeSingle();
      if (error) throw error;
      return data as { full_name: string | null; avatar_url: string | null } | null;
    },
  });

  const myGroup = stories.find((group) => group.author.id === me) ?? null;
  const otherStoryGroups = stories.filter((group) => group.author.id !== me);

  const railItems = useMemo<RailItem[]>(() => {
    const items: RailItem[] = [];

    const myLatestStory = myGroup?.stories.at(-1);
    if (myLatestStory) {
      items.push({ kind: "story", group: myGroup!, story: myLatestStory });
    }

    for (const group of otherStoryGroups) {
      // The rail always represents each person's most recent active Story.
      const story = group.stories.at(-1);
      if (story) items.push({ kind: "story", group, story });
    }

    const sortedSpotlights = [...spotlights].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );
    for (const spotlight of sortedSpotlights) {
      items.push({ kind: "spotlight", spotlight });
    }

    return items;
  }, [myGroup, otherStoryGroups, spotlights]);

  const [chooserOpen, setChooserOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"story" | "spotlight" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyGroupIndex, setStoryGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyMuted, setStoryMuted] = useState(true);
  const [storyProgress, setStoryProgress] = useState(0);
  const [viewersStoryId, setViewersStoryId] = useState<string | null>(null);
  const storyVideoRef = useRef<HTMLVideoElement | null>(null);
  const storyTimerRef = useRef<number | null>(null);
  const storyStartedAtRef = useRef<number | null>(null);
  const storyElapsedMsRef = useRef(0);

  const [spotlightViewerOpen, setSpotlightViewerOpen] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const spotlightContainerRef = useRef<HTMLDivElement | null>(null);
  const [spotlightMuted, setSpotlightMuted] = useState(true);
  const [deletingSpotlightId, setDeletingSpotlightId] = useState<string | null>(null);

  const activeStoryGroup = stories[storyGroupIndex] ?? null;
  const activeStory = activeStoryGroup?.stories[storyIndex] ?? null;
  const activeSpotlight = spotlights[spotlightIndex] ?? null;
  const { data: storyViewers = [], isLoading: storyViewersLoading } = useStoryViewers(viewersStoryId);
  const viewersStory = activeStory?.id === viewersStoryId ? activeStory : null;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!storyViewerOpen || !activeStory) return;
    void recordStoryView(activeStory.id);
  }, [storyViewerOpen, activeStory]);

  useEffect(() => {
    if (!spotlightViewerOpen) return;
    const node = spotlightContainerRef.current;
    if (!node) return;
    const target = node.children[spotlightIndex] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [spotlightViewerOpen, spotlightIndex]);

  useEffect(() => {
    if (!storyViewerOpen && !spotlightViewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStoryViewerOpen(false);
        setSpotlightViewerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [storyViewerOpen, spotlightViewerOpen]);

  function resetComposer() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setCaption("");
    setComposerMode(null);
    setPublishing(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function chooseMode(mode: "story" | "spotlight") {
    setChooserOpen(false);
    setComposerMode(mode);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function openCreate() {
    setChooserOpen(true);
  }

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    const video = isVideoSource(file);
    const image = file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(file.name);

    if (!video && !image) {
      toast.error("Please choose a photo or video.");
      return;
    }
    if (video && file.size > VIDEO_MAX_BYTES) {
      toast.error("Videos must be 50 MB or smaller.");
      return;
    }
    if (image && file.size > IMAGE_MAX_BYTES) {
      toast.error("Photos must be 12 MB or smaller.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function publishStory() {
    if (!selectedFile || publishing) return;

    setPublishing(true);
    try {
      setUploadProgress(0);
      await createStory.mutateAsync({
        file: selectedFile,
        caption,
        audience: "ALL",
        allowIds: [],
        blockIds: [],
        onProgress: setUploadProgress,
      });

      // Never hold the composer open waiting for a second fetch. The story row
      // already exists at this point; refresh the rail in the background.
      void queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Story published.");
      resetComposer();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish your story.");
      setPublishing(false);
    }
  }

  async function publishSpotlight() {
    if (!selectedFile || publishing) return;
    if (!me) {
      toast.error("You need to be signed in.");
      return;
    }

    setPublishing(true);
    let mediaPath: string | null = null;
    let spotlightCreated = false;

    try {
      const { data: provider, error: providerError } = await supabase
        .from("provider_profiles")
        .select("id, user_id, business_name, city, avatar_url, is_verified")
        .eq("user_id", me)
        .maybeSingle();

      if (providerError) throw providerError;
      if (!provider?.id) {
        throw new Error("Create your ASH vendor profile before publishing a Spotlight.");
      }

      const video = isVideoSource(selectedFile);
      if (!video) {
        await withTimeout(verifyMediaFiles([selectedFile], "SPOTLIGHT"), 30_000, "Spotlight safety check");
      }

      setUploadProgress(0);
      mediaPath = await uploadSpotlightMedia(me, selectedFile, setUploadProgress);

      const rpcResult = await withTimeout(
        Promise.resolve(
          (
            supabase as unknown as {
              rpc: (
                name: string,
                args: Record<string, unknown>,
              ) => PromiseLike<{ data: string | null; error: { message: string } | null }>;
            }
          ).rpc("create_spotlight_post", {
            _media_path: mediaPath,
            _caption: caption.trim(),
          }),
        ),
        20_000,
        "Spotlight publication",
      );

      if (rpcResult.error) throw new Error(rpcResult.error.message);
      if (!rpcResult.data) throw new Error("Spotlight was not created.");

      spotlightCreated = true;

      const { data: signed } = await supabase.storage.from(SOCIAL_BUCKET).createSignedUrl(mediaPath, 60 * 60 * 12);

      if (signed?.signedUrl) {
        const optimistic: SpotlightPost = {
          id: rpcResult.data,
          url: signed.signedUrl,
          caption: caption.trim() || null,
          created_at: new Date().toISOString(),
          provider: {
            id: provider.id,
            user_id: provider.user_id,
            business_name: provider.business_name,
            city: provider.city,
            avatar_url: provider.avatar_url,
            is_verified: provider.is_verified,
          },
        };

        queryClient.setQueryData<SpotlightPost[]>(["ash-spotlights"], (current) =>
          [optimistic, ...(current ?? []).filter((item) => item.id !== optimistic.id)].slice(0, 50),
        );
      }

      void queryClient.invalidateQueries({ queryKey: ["ash-spotlights"] });
      toast.success("Spotlight published.");
      resetComposer();
    } catch (error) {
      if (mediaPath && !spotlightCreated) {
        void supabase.storage.from(SOCIAL_BUCKET).remove([mediaPath]);
      }
      toast.error(error instanceof Error ? error.message : "Could not publish your Spotlight.");
      setPublishing(false);
    }
  }

  function openStory(groupIndex: number, index = 0) {
    setStoryGroupIndex(groupIndex);
    setStoryIndex(index);
    setStoryMuted(true);
    setStoryViewerOpen(true);
  }

  const nextStory = useCallback(() => {
    if (!activeStoryGroup) return;
    if (storyIndex < activeStoryGroup.stories.length - 1) {
      setStoryIndex((value) => value + 1);
      return;
    }
    if (storyGroupIndex < stories.length - 1) {
      setStoryGroupIndex((value) => value + 1);
      setStoryIndex(0);
      return;
    }
    setStoryViewerOpen(false);
  }, [activeStoryGroup, storyGroupIndex, storyIndex, stories.length]);

  useEffect(() => {
    // A new Story (or a fresh viewer session) starts from the beginning.
    if (!activeStory || !storyViewerOpen) {
      storyElapsedMsRef.current = 0;
      storyStartedAtRef.current = null;
      if (storyTimerRef.current !== null) {
        window.clearInterval(storyTimerRef.current);
        storyTimerRef.current = null;
      }
      setStoryProgress(0);
      return;
    }

    storyElapsedMsRef.current = 0;
    storyStartedAtRef.current = null;
    setStoryProgress(0);
  }, [storyViewerOpen, activeStory?.id]);

  useEffect(() => {
    if (storyTimerRef.current !== null) {
      window.clearInterval(storyTimerRef.current);
      storyTimerRef.current = null;
    }

    if (!storyViewerOpen || !activeStory || viewersStoryId || activeStory.media_type === "video") {
      return;
    }

    // Image Stories use a fixed 5 second duration. The elapsed time is kept in
    // a ref so opening "Story views" pauses the Story without resetting it.
    const durationMs = 5_000;
    storyStartedAtRef.current = performance.now() - storyElapsedMsRef.current;
    let lastProgress = storyElapsedMsRef.current > 0 ? (storyElapsedMsRef.current / durationMs) * 100 : -1;

    const tick = () => {
      if (storyStartedAtRef.current === null) return;
      const elapsed = Math.min(durationMs, performance.now() - storyStartedAtRef.current);
      storyElapsedMsRef.current = elapsed;
      const next = Math.min(100, (elapsed / durationMs) * 100);

      if (next - lastProgress >= 1 || next >= 100) {
        lastProgress = next;
        setStoryProgress(next);
      }

      if (next >= 100) {
        if (storyTimerRef.current !== null) {
          window.clearInterval(storyTimerRef.current);
          storyTimerRef.current = null;
        }
        storyStartedAtRef.current = null;
        nextStory();
      }
    };

    tick();
    storyTimerRef.current = window.setInterval(tick, 50);

    return () => {
      if (storyStartedAtRef.current !== null) {
        storyElapsedMsRef.current = Math.min(durationMs, Math.max(0, performance.now() - storyStartedAtRef.current));
      }
      storyStartedAtRef.current = null;
      if (storyTimerRef.current !== null) {
        window.clearInterval(storyTimerRef.current);
        storyTimerRef.current = null;
      }
    };
  }, [storyViewerOpen, activeStory, activeStory?.media_type, viewersStoryId, nextStory]);

  useEffect(() => {
    const video = storyVideoRef.current;
    if (!storyViewerOpen || !activeStory || activeStory.media_type !== "video" || !video) return;

    if (viewersStoryId) {
      video.pause();
      return;
    }

    void video.play().catch(() => undefined);
  }, [storyViewerOpen, activeStory?.id, activeStory?.media_type, viewersStoryId]);

  async function deleteCurrentStory() {
    if (!activeStory || me !== activeStory.author_id || deleteStory.isPending) return;
    const confirmed = window.confirm("Delete this Story? This cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteStory.mutateAsync(activeStory.id);
      toast.success("Story deleted.");
      setStoryViewerOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["stories"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this Story.");
    }
  }

  function openStoryViewers(story: Story) {
    if (me !== story.author_id) return;
    if (storyVideoRef.current) storyVideoRef.current.pause();
    setViewersStoryId(story.id);
  }

  function closeStoryViewers() {
    setViewersStoryId(null);
  }

  function previousStory() {
    if (storyIndex > 0) {
      setStoryIndex((value) => value - 1);
      return;
    }
    if (storyGroupIndex > 0) {
      const previous = storyGroupIndex - 1;
      setStoryGroupIndex(previous);
      setStoryIndex(Math.max(0, (stories[previous]?.stories.length ?? 1) - 1));
    }
  }

  function openSpotlight(index: number) {
    if (!spotlights[index]) return;
    setSpotlightIndex(index);
    setSpotlightMuted(true);
    setSpotlightViewerOpen(true);
  }

  async function contactVendor(spotlight: SpotlightPost) {
    try {
      const conversationId = await openConversation(spotlight.provider.id);
      if (!conversationId) return;
      setSpotlightViewerOpen(false);
      await navigate({ to: "/messages", search: { c: conversationId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open this vendor chat.");
    }
  }

  async function deleteSpotlight(spotlight: SpotlightPost) {
    if (!me || spotlight.provider.user_id !== me || deletingSpotlightId) return;

    const confirmed = window.confirm("Delete this Spotlight? This cannot be undone.");
    if (!confirmed) return;

    setDeletingSpotlightId(spotlight.id);

    try {
      const rpcResult = await withTimeout(
        Promise.resolve(
          (
            supabase as unknown as {
              rpc: (
                name: string,
                args: Record<string, unknown>,
              ) => PromiseLike<{ data: string | null; error: { message: string } | null }>;
            }
          ).rpc("delete_spotlight_post", {
            _spotlight_id: spotlight.id,
          }),
        ),
        20_000,
        "Spotlight deletion",
      );

      if (rpcResult.error) {
        throw new Error(rpcResult.error.message);
      }

      const mediaPath = rpcResult.data;
      if (mediaPath) {
        const { error: storageError } = await supabase.storage.from(SOCIAL_BUCKET).remove([mediaPath]);
        if (storageError) {
          console.warn("Spotlight media cleanup failed:", storageError.message);
        }
      }

      queryClient.setQueryData<SpotlightPost[]>(["ash-spotlights"], (current) =>
        (current ?? []).filter((item) => item.id !== spotlight.id),
      );
      void queryClient.invalidateQueries({ queryKey: ["ash-spotlights"] });
      setSpotlightViewerOpen(false);
      toast.success("Spotlight deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this Spotlight.");
    } finally {
      setDeletingSpotlightId(null);
    }
  }

  const composerTitle = composerMode === "spotlight" ? "Create Spotlight" : "Create Story";
  const composerSubtitle =
    composerMode === "spotlight"
      ? "Show what your business offers. Your Spotlight can appear in the discovery reel."
      : "Share a photo or video that disappears after 24 hours.";

  return (
    <>
      <section className="-mx-1" aria-label="ASH Stories and Spotlight">
        <div className="flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* The original Facebook-style Create card: user profile behind the lower half + plus at the seam. */}
          <button
            type="button"
            onClick={openCreate}
            className="relative h-52 w-[120px] shrink-0 overflow-visible rounded-[22px] border border-border bg-card text-left shadow-sm transition-transform active:scale-[0.98]"
            aria-label="Create Story or Spotlight"
          >
            <div className="absolute inset-x-0 top-0 z-0 h-[70%] overflow-hidden rounded-t-[22px] bg-gradient-to-br from-[#D4AF37] via-[#e9d8ff] to-[#4B0082]">
              {profile?.avatar_url ? (
                <Avatar
                  src={profile.avatar_url}
                  name={profile.full_name}
                  className="!size-full !rounded-none !border-0 !bg-transparent"
                />
              ) : (
                <div className="grid size-full place-items-center bg-gradient-to-br from-[#D4AF37] via-[#a77f1b] to-[#4B0082]">
                  <span className="text-4xl font-black text-white">{initials(profile?.full_name)}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/5" />
            </div>
            <span className="absolute inset-x-0 bottom-0 z-10 h-[36%] rounded-b-[22px] bg-card" />
            <span className="absolute left-1/2 top-[57%] z-20 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[4px] border-card bg-gradient-to-br from-[#ff2d55] to-[#4B0082] text-white shadow-xl">
              <Plus className="size-7" strokeWidth={2.5} />
            </span>
            <span className="absolute inset-x-3 bottom-4 z-10 text-center">
              <span className="block text-[15px] font-black text-foreground">Create</span>
              <span className="mt-0.5 block text-[10px] font-semibold text-muted-foreground">Story or Spotlight</span>
            </span>
          </button>

          {storiesLoading
            ? [0, 1, 2].map((item) => (
                <div key={item} className="h-52 w-[120px] shrink-0 animate-pulse rounded-[24px] bg-muted" />
              ))
            : null}

          {!storiesLoading &&
            railItems.map((item, index) => {
              if (item.kind === "story") {
                const mine = item.group.author.id === me;
                const storyIsVideo = item.story.media_type === "video";
                return (
                  <button
                    key={`story-${item.story.id}`}
                    type="button"
                    onClick={() => {
                      const groupIndex = stories.findIndex((group) => group.author.id === item.group.author.id);
                      const group = stories[groupIndex];
                      const latestIndex = Math.max(0, (group?.stories.length ?? 1) - 1);
                      openStory(groupIndex, latestIndex);
                    }}
                    className="group relative h-52 w-[120px] shrink-0 overflow-hidden rounded-[24px] border border-border bg-black text-left shadow-sm transition-transform active:scale-[0.98]"
                  >
                    {storyIsVideo ? (
                      <video
                        src={item.story.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src={item.story.url}
                        alt=""
                        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <span
                      className={`absolute left-2.5 top-2.5 z-10 grid size-[42px] place-items-center rounded-full p-[2px] shadow-lg ${
                        item.group.seen
                          ? "bg-white/20"
                          : "bg-[conic-gradient(from_220deg,#ff2d55,#4B0082,#D4AF37,#ff2d55)]"
                      }`}
                      aria-label={item.group.seen ? "Story viewed" : "New Story"}
                    >
                      <span className="grid size-full place-items-center rounded-full bg-black">
                        <Avatar
                          src={item.group.author.avatar_url}
                          name={item.group.author.name}
                          className="size-9 !border-0"
                        />
                      </span>
                    </span>
                    <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-black/40 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-md">
                      24h
                    </span>
                    <span className="absolute inset-x-3 bottom-3 z-10 text-white">
                      {storyIsVideo ? <Play className="mb-1 size-3.5 fill-current" /> : null}
                      <span className="block truncate text-[12px] font-extrabold">
                        {mine ? "Your Story" : item.group.author.name}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-white/70">
                        {mine ? "Your 24h story" : "Story"}
                      </span>
                    </span>
                  </button>
                );
              }

              const spotlight = item.spotlight;
              const spotlightVideo = isVideoSource(spotlight.url);
              return (
                <button
                  key={`spotlight-${spotlight.id}`}
                  type="button"
                  onClick={() => openSpotlight(spotlights.findIndex((post) => post.id === spotlight.id))}
                  className="group relative h-52 w-[120px] shrink-0 overflow-hidden rounded-[24px] border border-[#D4AF37]/30 bg-black text-left shadow-sm transition-transform active:scale-[0.98]"
                >
                  {spotlightVideo ? (
                    <video
                      src={spotlight.url}
                      muted
                      loop
                      autoPlay
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={spotlight.url}
                      alt={spotlight.caption ?? spotlight.provider.business_name}
                      className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
                  <span className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 bg-black/35 px-2 py-1 text-[8px] font-black tracking-[0.12em] text-[#D4AF37] backdrop-blur-md">
                    <Sparkles className="size-3" />
                    SPOTLIGHT
                  </span>
                  <span className="absolute left-2.5 top-12 z-10">
                    <Avatar
                      src={spotlight.provider.avatar_url}
                      name={spotlight.provider.business_name}
                      className="size-9"
                    />
                  </span>
                  {spotlightVideo ? (
                    <span className="absolute right-2.5 top-12 z-10 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md">
                      <Play className="size-3.5 fill-current" />
                    </span>
                  ) : null}
                  <span className="absolute inset-x-3 bottom-3 z-10 text-white">
                    <span className="block truncate text-[12px] font-extrabold">
                      {spotlight.provider.business_name}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] font-semibold text-white/70">
                      Discover · Contact · Order
                    </span>
                  </span>
                </button>
              );
            })}
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg,.mp4,.webm,.mov,.m4v,.ogv"
        className="hidden"
        onChange={pickFile}
      />

      {chooserOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[120000] flex items-end justify-center bg-black/65 p-3 backdrop-blur-md sm:items-center">
              <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-background shadow-2xl">
                <div className="border-b border-border px-5 pb-4 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">Create on ASH</p>
                      <p className="mt-1 text-xs text-muted-foreground">Choose what you want to share.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChooserOpen(false)}
                      className="grid size-9 place-items-center rounded-full bg-muted"
                      aria-label="Close"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => chooseMode("story")}
                    className="rounded-[24px] border border-border bg-card p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
                  >
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Camera className="size-5" />
                    </span>
                    <span className="mt-4 block text-sm font-black">Story</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      Photo or video that disappears after 24 hours.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseMode("spotlight")}
                    className="rounded-[24px] border border-[#D4AF37]/25 bg-gradient-to-br from-[#D4AF37]/10 via-card to-[#4B0082]/10 p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
                  >
                    <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#4B0082] text-white">
                      <Sparkles className="size-5" />
                    </span>
                    <span className="mt-4 block text-sm font-black">Spotlight</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      Showcase a business, offer or service in the ASH reel.
                    </span>
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {composerMode && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[130000] flex items-end justify-center bg-black/70 p-3 backdrop-blur-md sm:items-center sm:p-6">
              <div className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-background shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black">{composerTitle}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{composerSubtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetComposer}
                    disabled={publishing}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-muted disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {previewUrl ? (
                    <div className="overflow-hidden rounded-[24px] border border-border bg-black">
                      {selectedFile && isVideoSource(selectedFile) ? (
                        <video
                          src={previewUrl}
                          controls
                          playsInline
                          muted
                          className="max-h-[52vh] w-full object-contain"
                        />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="max-h-[52vh] w-full object-contain" />
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="grid min-h-72 w-full place-items-center rounded-[24px] border border-dashed border-border bg-muted/20 text-center"
                    >
                      <span className="grid place-items-center gap-3 p-6">
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
                    placeholder={
                      composerMode === "spotlight" ? "Describe what customers should discover…" : "Add a caption…"
                    }
                    className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-border bg-muted/20 p-3 text-sm outline-none ring-primary/20 focus:ring-4"
                    disabled={publishing}
                  />

                  {composerMode === "spotlight" ? (
                    <div className="mt-3 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-3 py-3 text-xs leading-5 text-muted-foreground">
                      <span className="font-black text-[#D4AF37]">SPOTLIGHT</span> appears in the same Stories row, but
                      viewers can continue scrolling through Spotlights like reels and contact the vendor directly.
                    </div>
                  ) : null}
                </div>

                {publishing ? (
                  <div className="border-t border-border px-4 pt-3">
                    <div className="rounded-2xl border border-border bg-muted/50 px-3 py-2.5">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span>{uploadProgress < 100 ? "Uploading media…" : "Publishing…"}</span>
                        <span>{Math.max(0, Math.min(100, uploadProgress))}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#ff2d55] via-[#D4AF37] to-[#4B0082] transition-[width] duration-300"
                          style={{ width: `${Math.max(4, Math.min(100, uploadProgress))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3 border-t border-border p-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={publishing}
                  >
                    <ImagePlus className="mr-2 size-4" />
                    Change media
                  </Button>
                  <Button
                    type="button"
                    onClick={composerMode === "spotlight" ? publishSpotlight : publishStory}
                    disabled={!selectedFile || publishing}
                    className="min-w-32"
                  >
                    {publishing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    {publishing ? (uploadProgress < 100 ? `${uploadProgress}%` : "Publishing…") : "Publish"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {storyViewerOpen && activeStory && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[140000] bg-black"
              role="dialog"
              aria-modal="true"
              aria-label="ASH Story viewer"
            >
              <div className="relative flex h-[100dvh] w-full items-center justify-center bg-black">
                <div className="absolute inset-x-0 top-0 z-30 p-3 sm:p-5">
                  <div className="mb-3 flex gap-1">
                    {activeStoryGroup?.stories.map((story) => (
                      <span key={story.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                        <span
                          className="block h-full rounded-full bg-white transition-[width] duration-75 ease-linear"
                          style={{
                            width:
                              story.id === activeStory.id
                                ? `${storyProgress}%`
                                : activeStoryGroup &&
                                    activeStoryGroup.stories.findIndex((item) => item.id === story.id) < storyIndex
                                  ? "100%"
                                  : "0%",
                          }}
                        />
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3 text-white">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar
                        src={activeStoryGroup?.author.avatar_url}
                        name={activeStoryGroup?.author.name}
                        className="size-10"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold">
                          {activeStoryGroup?.author.name ?? "Profile"}
                        </p>
                        <p className="text-[10px] text-white/60">24h story</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {activeStory.media_type === "video" ? (
                        <button
                          type="button"
                          onClick={() => setStoryMuted((value) => !value)}
                          className="grid size-9 place-items-center rounded-full bg-white/10 backdrop-blur-md"
                          aria-label={storyMuted ? "Unmute story" : "Mute story"}
                        >
                          {storyMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                        </button>
                      ) : null}
                      {me === activeStory.author_id ? (
                        <button
                          type="button"
                          onClick={() => void deleteCurrentStory()}
                          disabled={deleteStory.isPending}
                          className="grid size-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md disabled:opacity-50"
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
                        onClick={() => setStoryViewerOpen(false)}
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
                  className="absolute inset-y-0 left-0 z-20 w-1/4"
                  aria-label="Previous story"
                >
                  <ChevronLeft className="ml-3 hidden size-7 text-white/70 sm:block" />
                </button>

                <div className="flex h-full w-full items-center justify-center">
                  {activeStory.media_type === "video" ? (
                    <video
                      ref={storyVideoRef}
                      key={activeStory.id}
                      src={activeStory.url}
                      autoPlay
                      playsInline
                      muted={storyMuted}
                      controls
                      preload="auto"
                      onLoadedMetadata={() => setStoryProgress(0)}
                      onTimeUpdate={(event) => {
                        const duration = event.currentTarget.duration;
                        if (Number.isFinite(duration) && duration > 0) {
                          setStoryProgress((event.currentTarget.currentTime / duration) * 100);
                        }
                      }}
                      onEnded={nextStory}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <img
                      src={activeStory.url}
                      alt={activeStory.caption || "ASH story"}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={nextStory}
                  className="absolute inset-y-0 right-0 z-20 w-1/4"
                  aria-label="Next story"
                >
                  <ChevronRight className="ml-auto mr-3 hidden size-7 text-white/70 sm:block" />
                </button>

                <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black via-black/55 to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-24 text-white">
                  {activeStory.caption ? (
                    <p className="mx-auto max-w-2xl whitespace-pre-wrap text-sm leading-6">{activeStory.caption}</p>
                  ) : null}
                  <div className="mx-auto mt-3 flex max-w-2xl items-center">
                    {me === activeStory.author_id ? (
                      <button
                        type="button"
                        onClick={() => openStoryViewers(activeStory)}
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
                        aria-label={`See who viewed this story. ${activeStory.view_count ?? 0} ${(activeStory.view_count ?? 0) === 1 ? "view" : "views"}.`}
                      >
                        <Eye className="size-4" />
                        <span>{activeStory.view_count ?? 0}</span>
                        <span>{activeStory.view_count === 1 ? "view" : "views"}</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-white/75">
                        <Eye className="size-4" />
                        <span>{activeStory.view_count ?? 0}</span>
                        <span>{activeStory.view_count === 1 ? "view" : "views"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {viewersStoryId && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[160000] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-label="Story viewers"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) closeStoryViewers();
              }}
            >
              <div className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-zinc-950 text-white shadow-2xl sm:rounded-3xl">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-base font-black">Story views</p>
                    <p className="truncate text-xs text-white/55">
                      {viewersStory?.view_count ?? storyViewers.length}{" "}
                      {(viewersStory?.view_count ?? storyViewers.length) === 1 ? "view" : "views"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeStoryViewers}
                    className="grid size-9 place-items-center rounded-full bg-white/10 text-white"
                    aria-label="Close story viewers"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="max-h-[65vh] overflow-y-auto p-3">
                  {storyViewersLoading ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-white/65">
                      <Loader2 className="size-4 animate-spin" />
                      Loading viewers…
                    </div>
                  ) : storyViewers.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Eye className="mx-auto mb-3 size-8 text-white/30" />
                      <p className="text-sm font-semibold text-white/75">No viewer names yet.</p>
                      <p className="mt-1 text-xs text-white/45">People who watch this story will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {storyViewers.map((item) => (
                        <div
                          key={`${item.viewer.id}-${item.at}`}
                          className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/5"
                        >
                          <Avatar src={item.viewer.avatar_url} name={item.viewer.name} className="size-11" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{item.viewer.name ?? "Profile"}</p>
                            <p className="text-[11px] text-white/45">
                              {new Date(item.at).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <Eye className="size-4 text-white/35" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {spotlightViewerOpen && typeof document !== "undefined" && spotlights.length > 0
        ? createPortal(
            <div
              className="fixed inset-0 z-[150000] h-[100dvh] w-screen overflow-hidden bg-black"
              role="dialog"
              aria-modal="true"
              aria-label="ASH Spotlight reels"
            >
              <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
                <button
                  type="button"
                  onClick={() => setSpotlightViewerOpen(false)}
                  className="grid size-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-xl"
                  aria-label="Close Spotlight"
                >
                  <X className="size-5" />
                </button>
                <div className="rounded-full border border-[#D4AF37]/30 bg-black/40 px-3 py-1.5 text-[9px] font-black tracking-[0.2em] text-[#D4AF37] backdrop-blur-xl">
                  ASH SPOTLIGHT
                </div>
                <span className="size-10" />
              </div>

              <div
                ref={spotlightContainerRef}
                className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {spotlights.map((spotlight, index) => {
                  const video = isVideoSource(spotlight.url);
                  const isOwner = Boolean(me && spotlight.provider.user_id === me);
                  return (
                    <article
                      key={spotlight.id}
                      className="relative h-[100dvh] min-h-[100svh] w-full snap-start overflow-hidden bg-black"
                    >
                      {video ? (
                        <video
                          src={spotlight.url}
                          autoPlay
                          loop
                          playsInline
                          muted={spotlightMuted}
                          preload="auto"
                          className="absolute inset-0 size-full object-cover"
                          onPlay={() => setSpotlightIndex(index)}
                        />
                      ) : (
                        <img
                          src={spotlight.url}
                          alt={spotlight.caption ?? spotlight.provider.business_name}
                          className="absolute inset-0 size-full object-cover"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/5" />

                      <div className="absolute inset-x-0 bottom-0 z-40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-32 sm:px-6 sm:pb-8">
                        <div className="mx-auto max-w-3xl">
                          <div className="flex items-end justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Avatar
                                src={spotlight.provider.avatar_url}
                                name={spotlight.provider.business_name}
                                className="size-11"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-sm font-extrabold text-white">
                                    {spotlight.provider.business_name}
                                  </p>
                                  {spotlight.provider.is_verified ? (
                                    <span className="text-[10px] font-black text-[#D4AF37]">✓</span>
                                  ) : null}
                                </div>
                                {spotlight.provider.city ? (
                                  <p className="truncate text-[10px] text-white/60">{spotlight.provider.city}</p>
                                ) : null}
                              </div>
                            </div>

                            {video ? (
                              <button
                                type="button"
                                onClick={() => setSpotlightMuted((value) => !value)}
                                className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white backdrop-blur-xl"
                                aria-label={spotlightMuted ? "Unmute Spotlight" : "Mute Spotlight"}
                              >
                                {spotlightMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                              </button>
                            ) : null}
                          </div>

                          {spotlight.caption ? (
                            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-white/95">
                              {spotlight.caption}
                            </p>
                          ) : null}

                          {!isOwner ? (
                            <button
                              type="button"
                              onClick={() => void contactVendor(spotlight)}
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#a77f1b] to-[#4B0082] px-4 py-3.5 text-sm font-extrabold text-white shadow-2xl transition-transform active:scale-[0.98]"
                            >
                              <MessageCircle className="size-4" />
                              Contact Vendor
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void deleteSpotlight(spotlight)}
                              disabled={deletingSpotlightId === spotlight.id}
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm font-extrabold text-white backdrop-blur-xl transition-transform active:scale-[0.98] disabled:opacity-60"
                            >
                              {deletingSpotlightId === spotlight.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                              {deletingSpotlightId === spotlight.id ? "Deleting…" : "Delete Spotlight"}
                            </button>
                          )}

                          <p className="mt-2 text-center text-[9px] font-semibold text-white/45">
                            Discover · contact · order
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
