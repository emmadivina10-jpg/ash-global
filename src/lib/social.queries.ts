/**
 * ASH Social — stories (24 h), the photo feed with likes, comments, replies and
 * reposts, friend requests, groups and chat preferences. Everything here reads
 * and writes real member data; nothing is seeded.
 */
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { verifyMediaFiles } from "./media-safety";

export const SOCIAL_BUCKET = "spotlight";
/** Largest single photo accepted by a story or a feed post. */
export const SOCIAL_MAX_BYTES = 12 * 1024 * 1024;
export type ReactionType = "love" | "like" | "haha" | "wow" | "sad" | "angry";
export type ReactionBreakdown = Record<ReactionType, number>;
export const EMPTY_REACTIONS: ReactionBreakdown = { love: 0, like: 0, haha: 0, wow: 0, sad: 0, angry: 0 };

function summarizeReactions(rows: Array<{ reaction_type: string; user_id: string }>, me: string | null) {
  const breakdown = { ...EMPTY_REACTIONS };
  let current: ReactionType | null = null;
  for (const row of rows) {
    if (row.reaction_type in breakdown) breakdown[row.reaction_type as ReactionType] += 1;
    if (row.user_id === me) current = row.reaction_type as ReactionType;
  }
  return { breakdown, current, total: rows.length };
}

export type SocialAuthor = {
  id: string;
  name: string;
  avatar_url: string | null;
  verified_tier?: string | null;
  verified_until?: string | null;
  online?: boolean;
  has_update?: boolean;
};

async function currentUserId(): Promise<string | null> {
  const { data, error } = await withTimeout(supabase.auth.getUser(), 15_000, "Authentication check");
  if (error) throw new Error(`Authentication check failed: ${error.message}`);
  return data.user?.id ?? null;
}

/**
 * Race network/storage operations against a finite timeout so the UI never
 * remains stuck in a pending state forever. This does not abort the underlying
 * request; it guarantees that the mutation/query itself can settle.
 */
async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out. Please check your connection and try again.`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  ms: number,
  label: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`${label} timed out. Please try again.`);
    }
    throw error instanceof Error ? error : new Error(label);
  } finally {
    window.clearTimeout(timer);
  }
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function resumableStorageEndpoint(): string {
  const rawUrl = String(import.meta.env["VITE_SUPABASE_URL"] ?? "").trim();
  if (!rawUrl) {
    throw new Error("Supabase URL is not configured for video uploads.");
  }

  const url = new URL(rawUrl);
  if (url.hostname.endsWith(".supabase.co")) {
    const projectRef = url.hostname.split(".")[0];
    return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  }

  return `${rawUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;
}

/** Upload a large browser video with Supabase TUS resumable uploads. */
export async function uploadResumableStorageFile(
  bucketName: string,
  objectName: string,
  file: File,
  contentType: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (sessionError || !accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const createResponse = await fetchWithTimeout(
    resumableStorageEndpoint(),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(file.size),
        "Upload-Metadata": [
          `bucketName ${toBase64(bucketName)}`,
          `objectName ${toBase64(objectName)}`,
          `contentType ${toBase64(contentType)}`,
          `cacheControl ${toBase64("3600")}`,
        ].join(","),
        "x-upsert": "false",
      },
    },
    30_000,
    "Starting video upload",
  );

  if (!createResponse.ok) {
    const body = await createResponse.text().catch(() => "");
    throw new Error(`Could not start video upload (${createResponse.status}).${body ? ` ${body}` : ""}`);
  }

  const uploadUrl = createResponse.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Supabase did not return a resumable upload URL.");
  }

  const chunkSize = 6 * 1024 * 1024;
  let offset = 0;
  onProgress?.(0);

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const chunk = file.slice(offset, end);
    let sent = false;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 4 && !sent; attempt += 1) {
      try {
        const response = await fetchWithTimeout(
          uploadUrl,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Tus-Resumable": "1.0.0",
              "Upload-Offset": String(offset),
              "Content-Type": "application/offset+octet-stream",
            },
            body: chunk,
          },
          90_000,
          "Video chunk upload",
        );

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`Video chunk upload failed (${response.status}).${body ? ` ${body}` : ""}`);
        }

        const serverOffset = Number(response.headers.get("Upload-Offset") ?? end);
        if (!Number.isFinite(serverOffset) || serverOffset <= offset) {
          throw new Error("Supabase returned an invalid upload offset.");
        }

        offset = Math.min(serverOffset, file.size);
        onProgress?.(Math.round((offset / file.size) * 100));
        sent = true;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Video chunk upload failed.");
        if (attempt < 3) {
          await new Promise((resolve) => window.setTimeout(resolve, 750 * (attempt + 1)));
        }
      }
    }

    if (!sent) {
      throw lastError ?? new Error("Video upload failed.");
    }
  }

  onProgress?.(100);
}

async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};

  const result = await withTimeout(
    supabase.storage.from(SOCIAL_BUCKET).createSignedUrls(unique, 60 * 60 * 12),
    20_000,
    "Story media access",
  );

  if (result.error) {
    throw new Error(`Unable to access story media: ${result.error.message}`);
  }

  const map: Record<string, string> = {};
  for (const item of result.data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

export async function loadAuthors(ids: string[]): Promise<Map<string, SocialAuthor>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, SocialAuthor>();
  if (unique.length === 0) return map;
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const now = new Date().toISOString();
  const [{ data }, { data: presence }, { data: stories }, { data: spotlights }] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, avatar_url, verified_tier, verified_until").in("user_id", unique),
    supabase.from("member_presence").select("user_id").in("user_id", unique).gte("last_active_at", since),
    supabase.from("stories").select("author_id").in("author_id", unique).gt("expires_at", now),
    supabase.from("spotlight_posts").select("author_id").in("author_id", unique).eq("is_published", true).gte("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString()),
  ]);
  const onlineIds = new Set((presence ?? []).map((row) => row.user_id));
  const updateIds = new Set([...(stories ?? []).map((row) => row.author_id), ...(spotlights ?? []).map((row) => row.author_id)]);
  for (const row of (data ?? []) as {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    verified_tier: string | null;
    verified_until: string | null;
  }[]) {
    map.set(row.user_id, {
      id: row.user_id,
      name: row.full_name,
      avatar_url: row.avatar_url,
      verified_tier: row.verified_tier,
      verified_until: row.verified_until,
      online: onlineIds.has(row.user_id),
      has_update: updateIds.has(row.user_id),
    });
  }
  return map;
}

async function uploadImage(userId: string, file: File, prefix: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only photos can be shared here.");
  }

  if (file.size > SOCIAL_MAX_BYTES) {
    throw new Error(`${file.name} is larger than 12 MB.`);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
  const path = `${userId}/${prefix}/${crypto.randomUUID()}.${safeExt}`;

  const result = await withTimeout(
    supabase.storage.from(SOCIAL_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: false,
    }),
    45_000,
    "Image upload",
  );

  if (result.error) {
    throw new Error(`Image upload failed: ${result.error.message}`);
  }

  return path;
}

export type StoryMediaKind = "image" | "video";
const STORY_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function isStoryVideoSource(source: string | File): boolean {
  const value = typeof source === "string" ? source : `${source.type} ${source.name}`;

  return /^video\//i.test(value) || /\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i.test(value);
}

function getStoryVideoContentType(file: File): string {
  if (/^video\//i.test(file.type)) return file.type;

  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "m4v":
      return "video/x-m4v";
    case "ogv":
      return "video/ogg";
    case "mp4":
    default:
      return "video/mp4";
  }
}

async function uploadStoryMedia(userId: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
  const isVideo = isStoryVideoSource(file);

  if (isVideo) {
    if (file.size > STORY_MAX_VIDEO_BYTES) {
      throw new Error(`${file.name} is larger than 50 MB.`);
    }
  } else {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please choose a photo or video.");
    }

    if (file.size > SOCIAL_MAX_BYTES) {
      throw new Error(`${file.name} is larger than 12 MB.`);
    }
  }

  const fallbackExtension = isVideo ? "mp4" : "jpg";
  const originalExtension = file.name.split(".").pop()?.toLowerCase() ?? fallbackExtension;
  const safeExtension = /^[a-z0-9]+$/.test(originalExtension) ? originalExtension : fallbackExtension;
  const path = `${userId}/story/${crypto.randomUUID()}.${safeExtension}`;

  const contentType = isVideo ? getStoryVideoContentType(file) : file.type || "image/jpeg";

  if (isVideo && file.size > 6 * 1024 * 1024) {
    await uploadResumableStorageFile(SOCIAL_BUCKET, path, file, contentType, onProgress);
    return path;
  }

  onProgress?.(0);
  const result = await withTimeout(
    supabase.storage.from(SOCIAL_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    }),
    isVideo ? 90_000 : 45_000,
    isVideo ? "Video upload" : "Image upload",
  );

  if (result.error) {
    throw new Error(`${isVideo ? "Video" : "Image"} upload failed: ${result.error.message}`);
  }

  onProgress?.(100);
  return path;
}

/* ------------------------------------------------------------------ stories */

export type Story = {
  id: string;
  author_id: string;
  caption: string;
  url: string;
  media_type: StoryMediaKind;
  view_count: number;
  created_at: string;
  expires_at: string;
  reaction_count: number;
  reaction_breakdown: ReactionBreakdown;
  current_reaction: ReactionType | null;
};

export type StoryGroup = {
  author: SocialAuthor;
  stories: Story[];
  seen: boolean;
};

export type StoryAudience = "ALL" | "SELECT";

export function useStories() {
  return useQuery({
    queryKey: ["stories"],
    staleTime: 15_000,
    retry: 1,
    queryFn: async (): Promise<{ me: string | null; groups: StoryGroup[] }> => {
      const me = await currentUserId();

      const { data, error } = await withTimeout(
        supabase
          .from("stories")
          .select("id, author_id, caption, media_path, view_count, created_at, expires_at")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: true }),
        20_000,
        "Loading stories",
      );

      if (error) throw error;

      const rows = (data ?? []) as {
        id: string;
        author_id: string;
        caption: string;
        media_path: string;
        view_count: number;
        created_at: string;
        expires_at: string;
      }[];

      if (rows.length === 0) return { me, groups: [] };

      const reactionRowsPromise = withTimeout(
        supabase
          .from("story_reactions")
          .select("story_id, user_id, reaction_type")
          .in(
            "story_id",
            rows.map((r) => r.id),
          ),
        15_000,
        "Loading story reactions",
      );

      const seenPromise = me
        ? withTimeout(
            supabase
              .from("story_views")
              .select("story_id")
              .eq("viewer_id", me)
              .in(
                "story_id",
                rows.map((r) => r.id),
              ),
            15_000,
            "Loading story views",
          )
        : Promise.resolve({ data: [] as { story_id: string }[] });

      const [signed, authors, seenRows, reactionResult] = await Promise.all([
        signPaths(rows.map((r) => r.media_path)),
        loadAuthors(rows.map((r) => r.author_id)),
        seenPromise,
        reactionRowsPromise,
      ]);

      const seen = new Set(((seenRows.data ?? []) as { story_id: string }[]).map((r) => r.story_id));

      const reactions = (reactionResult.data ?? []) as Array<{
        story_id: string;
        user_id: string;
        reaction_type: string;
      }>;

      const grouped = new Map<string, Story[]>();

      for (const row of rows) {
        const url = signed[row.media_path];
        if (!url) {
          console.warn("Story media URL unavailable:", row.media_path);
          continue;
        }

        const reaction = summarizeReactions(
          reactions.filter((item) => item.story_id === row.id),
          me,
        );

        const list = grouped.get(row.author_id) ?? [];
        list.push({
          id: row.id,
          author_id: row.author_id,
          caption: row.caption,
          url,
          media_type: isStoryVideoSource(row.media_path) ? "video" : "image",
          view_count: row.view_count,
          created_at: row.created_at,
          expires_at: row.expires_at,
          reaction_count: reaction.total,
          reaction_breakdown: reaction.breakdown,
          current_reaction: reaction.current,
        });
        grouped.set(row.author_id, list);
      }

      const groups: StoryGroup[] = Array.from(grouped.entries()).map(([authorId, stories]) => ({
        author: authors.get(authorId) ?? {
          id: authorId,
          name: "Profile unavailable",
          avatar_url: null,
        },
        stories,
        seen: stories.every((story) => seen.has(story.id)),
      }));

      groups.sort((a, b) => {
        if (me && a.author.id === me) return -1;
        if (me && b.author.id === me) return 1;
        if (a.seen !== b.seen) return a.seen ? 1 : -1;
        return (b.stories.at(-1)?.created_at ?? "").localeCompare(a.stories.at(-1)?.created_at ?? "");
      });

      return { me, groups };
    },
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      caption,
      audience = "ALL",
      allowIds = [],
      blockIds = [],
      onProgress,
    }: {
      file: File;
      caption: string;
      audience?: StoryAudience;
      allowIds?: string[];
      blockIds?: string[];
      onProgress?: (progress: number) => void;
    }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      if (!(file instanceof File)) throw new Error("Choose a photo or video.");

      const mediaKind = isStoryVideoSource(file) ? "video" : "image";

      let path: string;

      // Keep the existing image moderation, but overlap it with the storage upload
      // so a normal Story does not wait for two sequential network operations.
      // The Story is not published until both have completed successfully.
      if (mediaKind === "image") {
        const [safetyResult, uploadResult] = await Promise.allSettled([
          withTimeout(verifyMediaFiles([file], "STORY"), 30_000, "Photo safety check"),
          uploadStoryMedia(userId, file, onProgress),
        ]);

        if (uploadResult.status === "rejected") {
          throw uploadResult.reason instanceof Error
            ? uploadResult.reason
            : new Error("Could not upload your story media.");
        }

        path = uploadResult.value;

        if (safetyResult.status === "rejected") {
          try {
            await withTimeout(supabase.storage.from(SOCIAL_BUCKET).remove([path]), 15_000, "Story cleanup");
          } catch (cleanupError) {
            console.warn("Story media cleanup failed:", cleanupError);
          }

          throw safetyResult.reason instanceof Error
            ? safetyResult.reason
            : new Error("The selected photo could not be approved.");
        }
      } else {
        path = await uploadStoryMedia(userId, file, onProgress);
      }

      try {
        const insertResult = await withTimeout(
          supabase
            .from("stories")
            .insert({
              author_id: userId,
              media_path: path,
              caption: caption.trim(),
              audience,
              allow_ids: audience === "SELECT" ? allowIds : [],
              block_ids: audience === "ALL" ? blockIds : [],
            })
            .select("id")
            .single(),
          20_000,
          "Story publication",
        );

        if (insertResult.error) {
          throw new Error(`Story publication failed: ${insertResult.error.message}`);
        }

        if (!insertResult.data?.id) {
          throw new Error("The story was not created.");
        }

        return insertResult.data.id;
      } catch (error) {
        try {
          await withTimeout(supabase.storage.from(SOCIAL_BUCKET).remove([path]), 15_000, "Story cleanup");
        } catch (cleanupError) {
          console.warn("Story media cleanup failed:", cleanupError);
        }

        throw error instanceof Error ? error : new Error("Could not publish your story.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });
}

/** Records that the signed-in member watched a story (ignores repeats). */
export async function recordStoryView(storyId: string) {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("story_views").insert({ story_id: storyId, viewer_id: userId });
}

export function useStoryViewers(storyId: string | null) {
  return useQuery({
    queryKey: ["story-viewers", storyId],
    enabled: Boolean(storyId),
    queryFn: async () => {
      const { data } = await supabase
        .from("story_views")
        .select("viewer_id, created_at")
        .eq("story_id", storyId!)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as { viewer_id: string; created_at: string }[];
      const authors = await loadAuthors(rows.map((r) => r.viewer_id));
      return rows.map((r) => ({
        at: r.created_at,
        viewer: authors.get(r.viewer_id) ?? { id: r.viewer_id, name: "ASH member", avatar_url: null },
      }));
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error: readError } = await supabase.from("stories").select("media_path").eq("id", id).maybeSingle();
      if (readError) throw readError;
      if (!data) throw new Error("This story is no longer available.");

      const { error: deleteError } = await supabase.from("stories").delete().eq("id", id);
      if (deleteError) throw deleteError;
      const { error: storageError } = await supabase.storage.from(SOCIAL_BUCKET).remove([data.media_path]);
      if (storageError) console.warn("Story media cleanup failed", storageError.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });
}

/* --------------------------------------------------------------- feed posts */

export type FeedPost = {
  id: string;
  author_id: string;
  caption: string;
  city: string | null;
  images: string[];
  like_count: number;
  comment_count: number;
  repost_count: number;
  filter_comments: boolean;
  liked: boolean;
  current_reaction: ReactionType | null;
  reaction_breakdown: ReactionBreakdown;
  reposted: boolean;
  created_at: string;
  author: SocialAuthor;
};

function parseImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => (typeof entry === "string" ? [entry] : []));
}

/** The recommended feed: friends first, then engagement, then freshness. */
export function useSocialFeed(limit = 40) {
  return useQuery({
    queryKey: ["social-feed", limit],
    staleTime: 15_000,
    queryFn: async (): Promise<FeedPost[]> => {
      const { data, error } = await supabase.rpc("social_feed", { _limit: limit, _offset: 0 });
      if (error) throw error;
      const rows = (data ?? []) as {
        id: string;
        author_id: string;
        caption: string;
        media: unknown;
        city: string | null;
        like_count: number;
        comment_count: number;
        repost_count: number;
        filter_comments: boolean;
        created_at: string;
        liked: boolean;
        reposted: boolean;
      }[];
      if (rows.length === 0) return [];
      const paths = rows.flatMap((r) => parseImages(r.media));
      const me = await currentUserId();
      const [signed, authors, reactionResult] = await Promise.all([
        signPaths(paths),
        loadAuthors(rows.map((r) => r.author_id)),
        supabase
          .from("post_likes")
          .select("post_id, user_id, reaction_type")
          .in(
            "post_id",
            rows.map((r) => r.id),
          ),
      ]);
      return rows.map((r) => {
        const reaction = summarizeReactions(
          ((reactionResult.data ?? []) as Array<{ post_id: string; user_id: string; reaction_type: string }>).filter(
            (item) => item.post_id === r.id,
          ),
          me,
        );
        return {
          id: r.id,
          author_id: r.author_id,
          caption: r.caption,
          city: r.city,
          images: parseImages(r.media)
            .map((p) => signed[p])
            .filter((u): u is string => Boolean(u)),
          like_count: reaction.total,
          comment_count: r.comment_count,
          repost_count: r.repost_count,
          filter_comments: r.filter_comments,
          liked: r.liked,
          current_reaction: reaction.current,
          reaction_breakdown: reaction.breakdown,
          reposted: r.reposted,
          created_at: r.created_at,
          author: authors.get(r.author_id) ?? { id: r.author_id, name: "ASH member", avatar_url: null },
        };
      });
    },
  });
}

/** One post, so a like/comment notification can open exactly what it is about. */
export function usePost(postId: string | null | undefined) {
  return useQuery({
    queryKey: ["social-post", postId],
    enabled: Boolean(postId),
    queryFn: async (): Promise<FeedPost | null> => {
      const me = await currentUserId();
      const { data, error } = await supabase
        .from("social_posts")
        .select(
          "id, author_id, caption, media, city, like_count, comment_count, repost_count, filter_comments, created_at",
        )
        .eq("id", postId!)
        .maybeSingle();
      if (error) throw error;
      const row = data as {
        id: string;
        author_id: string;
        caption: string;
        media: unknown;
        city: string | null;
        like_count: number;
        comment_count: number;
        repost_count: number;
        filter_comments: boolean;
        created_at: string;
      } | null;
      if (!row) return null;

      const [signed, authors, reactions, reposted] = await Promise.all([
        signPaths(parseImages(row.media)),
        loadAuthors([row.author_id]),
        supabase.from("post_likes").select("user_id, reaction_type").eq("post_id", row.id),
        me
          ? supabase.from("post_reposts").select("post_id").eq("post_id", row.id).eq("user_id", me).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const reaction = summarizeReactions(
        (reactions.data ?? []) as Array<{ user_id: string; reaction_type: string }>,
        me,
      );
      return {
        id: row.id,
        author_id: row.author_id,
        caption: row.caption,
        city: row.city,
        images: parseImages(row.media)
          .map((p) => signed[p])
          .filter((u): u is string => Boolean(u)),
        like_count: reaction.total,
        comment_count: row.comment_count,
        repost_count: row.repost_count,
        filter_comments: row.filter_comments,
        liked: reaction.current !== null,
        current_reaction: reaction.current,
        reaction_breakdown: reaction.breakdown,
        reposted: Boolean(reposted.data),
        created_at: row.created_at,
        author: authors.get(row.author_id) ?? { id: row.author_id, name: "ASH member", avatar_url: null },
      };
    },
  });
}

/** Posts written by one member — used on profiles. */
export function useMemberPosts(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["member-posts", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("social_posts")
        .select("id, caption, media, created_at, like_count, comment_count")
        .eq("author_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      const rows = (data ?? []) as { id: string; caption: string; media: unknown; created_at: string }[];
      const signed = await signPaths(rows.flatMap((r) => parseImages(r.media)));
      return rows.map((r) => ({
        id: r.id,
        caption: r.caption,
        created_at: r.created_at,
        images: parseImages(r.media)
          .map((p) => signed[p])
          .filter((u): u is string => Boolean(u)),
      }));
    },
  });
}

export function useCreateSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caption,
      files,
      city,
      filterComments,
    }: {
      caption: string;
      files: File[];
      city?: string | null;
      filterComments?: boolean;
    }) => {
      const userId = await currentUserId();

      if (!userId) {
        throw new Error("You need to be signed in.");
      }

      const cleanCaption = caption.trim();
      const selectedFiles = files.slice(0, 4);

      if (selectedFiles.length === 0 && !cleanCaption) {
        throw new Error("Write something or add a photo.");
      }

      if (selectedFiles.length > 0) {
        await withTimeout(verifyMediaFiles(selectedFiles, "SOCIAL_POST"), 30_000, "Photo safety check");
      }

      const media: string[] = [];

      try {
        // Upload photos one at a time so failures are attributable and partial
        // uploads can be cleaned up reliably.
        for (const file of selectedFiles) {
          const path = await uploadImage(userId, file, "post");
          media.push(path);
        }

        const insertResult = await withTimeout(
          supabase
            .from("social_posts")
            .insert({
              author_id: userId,
              caption: cleanCaption,
              media: media,
              city: city ?? null,
              filter_comments: filterComments ?? false,
            })
            .select("id")
            .single(),
          30_000,
          "Post creation",
        );

        if (insertResult.error) {
          throw new Error(`Post creation failed: ${insertResult.error.message}`);
        }

        if (!insertResult.data?.id) {
          throw new Error("The post was not created.");
        }

        return insertResult.data.id;
      } catch (error) {
        // Never leave orphaned images behind when the database insert fails.
        if (media.length > 0) {
          const cleanup = await supabase.storage.from(SOCIAL_BUCKET).remove(media);

          if (cleanup.error) {
            console.warn("Post media cleanup failed:", cleanup.error.message);
          }
        }

        throw error instanceof Error ? error : new Error("Could not publish your post.");
      }
    },

    onSuccess: () => {
      // Refresh in the background. Do not await these invalidations because
      // the Feed uses mutateAsync() and should resolve immediately after the
      // post itself has been created successfully.
      void queryClient.invalidateQueries({ queryKey: ["social-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["member-posts"] });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      const { error } = await supabase.rpc("set_post_reaction", {
        _post_id: postId,
        _reaction_type: liked ? null : "like",
      } as never);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
  });
}

export function useSetPostReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, reaction }: { postId: string; reaction: ReactionType | null }) => {
      const { error } = await supabase.rpc("set_post_reaction", { _post_id: postId, _reaction_type: reaction ?? "" });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["social-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["social-post", variables.postId] });
    },
  });
}

export function useToggleRepost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, reposted }: { postId: string; reposted: boolean }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      if (reposted) {
        const { error } = await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_reposts").insert({ post_id: postId, user_id: userId });
        // A verified author can lock their work; the database guard says so plainly.
        if (error) {
          throw new Error(
            /permit|allow_reuse|verified/i.test(error.message)
              ? "This member keeps their posts protected, so it cannot be shared."
              : error.message,
          );
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["social-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["member-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["post"] });
    },
  });
}

export function useSetCommentFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, on }: { postId: string; on: boolean }) => {
      const { error } = await supabase.from("social_posts").update({ filter_comments: on }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("social_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
  });
}

/* ---------------------------------------------------------------- comments */

export type PostComment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author: SocialAuthor;
  like_count: number;
  liked: boolean;
  current_reaction: ReactionType | null;
  reaction_breakdown: ReactionBreakdown;
  replies: PostComment[];
};

export function useComments(postId: string | null) {
  return useQuery({
    queryKey: ["post-comments", postId],
    enabled: Boolean(postId),
    queryFn: async (): Promise<PostComment[]> => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, post_id, parent_id, author_id, body, created_at, like_count")
        .eq("post_id", postId!)
        .eq("is_hidden", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as {
        id: string;
        post_id: string;
        parent_id: string | null;
        author_id: string;
        body: string;
        created_at: string;
        like_count: number | null;
      }[];
      const me = await currentUserId();
      const [authors, likedResult] = await Promise.all([
        loadAuthors(rows.map((r) => r.author_id)),
        me && rows.length
          ? supabase
              .from("comment_likes")
              .select("comment_id, user_id, reaction_type")
              .in(
                "comment_id",
                rows.map((r) => r.id),
              )
          : Promise.resolve({ data: [] }),
      ]);
      const byId = new Map<string, PostComment>();
      const roots: PostComment[] = [];
      for (const row of rows) {
        const reaction = summarizeReactions(
          ((likedResult.data ?? []) as Array<{ comment_id: string; user_id: string; reaction_type: string }>).filter(
            (item) => item.comment_id === row.id,
          ),
          me,
        );
        byId.set(row.id, {
          id: row.id,
          post_id: row.post_id,
          parent_id: row.parent_id,
          body: row.body,
          created_at: row.created_at,
          author: authors.get(row.author_id) ?? { id: row.author_id, name: "Profile unavailable", avatar_url: null },
          like_count: reaction.total,
          liked: reaction.current !== null,
          current_reaction: reaction.current,
          reaction_breakdown: reaction.breakdown,
          replies: [],
        });
      }
      for (const row of rows) {
        const node = byId.get(row.id)!;
        if (row.parent_id && byId.has(row.parent_id)) byId.get(row.parent_id)!.replies.push(node);
        else roots.push(node);
      }
      return roots;
    },
  });
}

/** Like / unlike a comment or reply. */
export function useToggleCommentLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; liked: boolean; postId: string }) => {
      const userId = await currentUserId();

      if (!userId) {
        throw new Error("You need to be signed in.");
      }

      const { error } = await supabase.rpc("set_comment_reaction", {
        _comment_id: commentId,
        _reaction_type: liked ? "" : "like",
      });

      if (error) {
        throw new Error(`Unable to update comment like: ${error.message}`);
      }
    },

    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["post-comments", variables.postId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social-post", variables.postId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social-feed"],
      });
    },
  });
}

export function useSetCommentReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      reaction,
    }: {
      commentId: string;
      postId: string;
      reaction: ReactionType | null;
    }) => {
      const userId = await currentUserId();

      if (!userId) {
        throw new Error("You need to be signed in.");
      }

      const { error } = await supabase.rpc("set_comment_reaction", {
        _comment_id: commentId,
        _reaction_type: reaction,
      } as never);

      if (error) {
        throw new Error(`Unable to set comment reaction: ${error.message}`);
      }
    },

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["post-comments", variables.postId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social-post", variables.postId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["social-feed"],
      });
    },
  });
}

export function useSetStoryReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ storyId, reaction }: { storyId: string; reaction: ReactionType | null }) => {
      const { error } = await supabase.rpc("set_story_reaction", {
        _story_id: storyId,
        _reaction_type: reaction,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });
}

export function useEngagementRealtime(postId?: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`engagement:${postId ?? "feed"}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes", ...(postId ? { filter: `post_id=eq.${postId}` } : {}) },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["social-feed"] });
          if (postId) void queryClient.invalidateQueries({ queryKey: ["social-post", postId] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_likes" }, () => {
        if (postId) void queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);
}

export function useTagPeopleSearch(term: string) {
  return useQuery({
    queryKey: ["tag-people", term],
    enabled: term.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_tag_people", { _query: term.trim(), _limit: 10 });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useHashtagSuggestions(term: string) {
  return useQuery({
    queryKey: ["hashtag-suggestions", term],
    enabled: term.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hashtags")
        .select("id, name, usage_count")
        .ilike("name", `${term.trim().toLowerCase()}%`)
        .gt("usage_count", 0)
        .order("usage_count", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useHashtagFeed(tag: string, page = 0, sort: "recent" | "top" = "recent") {
  return useQuery({
    queryKey: ["hashtag-feed", tag, page, sort],
    enabled: Boolean(tag),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("hashtag_feed", {
        _normalized_name: tag.toLowerCase().replace(/^#/, ""),
        _limit: 20,
        _offset: page * 20,
        _sort: sort,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      body,
      parentId,
      screen,
    }: {
      postId: string;
      body: string;
      parentId?: string | null;
      screen?: boolean;
    }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      const text = body.trim();
      if (!text) throw new Error("Write something first.");
      if (screen) {
        const { screenComment } = await import("./social.functions");
        const verdict = await screenComment({ data: { text } });
        if (verdict?.blocked) throw new Error("This comment was blocked by the post's comment filter.");
      }
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, author_id: userId, parent_id: parentId ?? null, body: text });
      if (error) throw error;
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["post-comments", variables.postId] });
      void queryClient.invalidateQueries({ queryKey: ["social-feed"] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; postId: string }) => {
      const { error } = await supabase.from("post_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      void queryClient.invalidateQueries({ queryKey: ["post-comments", v.postId] });
      void queryClient.invalidateQueries({ queryKey: ["social-feed"] });
    },
  });
}

/* ----------------------------------------------------------------- friends */

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  created_at: string;
  other: SocialAuthor;
  incoming: boolean;
};

export function useFriendships() {
  return useQuery({
    queryKey: ["friendships"],
    queryFn: async (): Promise<{
      me: string | null;
      friends: Friendship[];
      incoming: Friendship[];
      outgoing: Friendship[];
    }> => {
      const me = await currentUserId();
      if (!me) return { me: null, friends: [], incoming: [], outgoing: [] };
      const { data } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status, created_at")
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as {
        id: string;
        requester_id: string;
        addressee_id: string;
        status: Friendship["status"];
        created_at: string;
      }[];
      const authors = await loadAuthors(rows.flatMap((r) => [r.requester_id, r.addressee_id]));
      const mapped: Friendship[] = rows.map((r) => {
        const otherId = r.requester_id === me ? r.addressee_id : r.requester_id;
        return {
          ...r,
          incoming: r.addressee_id === me,
          other: authors.get(otherId) ?? { id: otherId, name: "Profile unavailable", avatar_url: null },
        };
      });
      return {
        me,
        friends: mapped.filter((r) => r.status === "ACCEPTED"),
        incoming: mapped.filter((r) => r.status === "PENDING" && r.incoming),
        outgoing: mapped.filter((r) => r.status === "PENDING" && !r.incoming),
      };
    },
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const me = await currentUserId();
      if (!me) throw new Error("You need to be signed in.");
      if (me === userId) throw new Error("That is you.");
      const { error } = await supabase.from("friendships").insert({ requester_id: me, addressee_id: userId });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["friendships"] }),
  });
}

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: accept ? "ACCEPTED" : "DECLINED" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["friendships"] }),
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("friendships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["friendships"] }),
  });
}

/** Finds real ASH members by name, for friend requests and group invites. */
export function useMemberSearch(term: string) {
  return useQuery({
    queryKey: ["member-search", term],
    enabled: term.trim().length >= 2,
    queryFn: async (): Promise<SocialAuthor[]> => {
      const me = await currentUserId();
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .ilike("full_name", `%${term.trim()}%`)
        .limit(20);
      const authors = await loadAuthors(((data ?? []) as { user_id: string }[]).map((row) => row.user_id));
      return ((data ?? []) as { user_id: string; full_name: string; avatar_url: string | null }[])
        .filter((row) => row.user_id !== me)
        .map((row) => authors.get(row.user_id) ?? ({ id: row.user_id, name: row.full_name || "Profile unavailable", avatar_url: row.avatar_url }));
    },
  });
}

/* ------------------------------------------------------------------ groups */

export type ChatGroup = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  members: SocialAuthor[];
  member_count: number;
  conversation_id: string | null;
  /** True when the group owner holds an active ASH Verified badge. */
  owner_verified: boolean;
};

export function useGroups() {
  return useQuery({
    queryKey: ["chat-groups"],
    queryFn: async (): Promise<ChatGroup[]> => {
      const { data } = await supabase
        .from("chat_groups")
        .select("id, name, owner_id, created_at")
        .order("created_at", { ascending: false });
      const groups = (data ?? []) as { id: string; name: string; owner_id: string; created_at: string }[];
      if (groups.length === 0) return [];
      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id, user_id")
        .in(
          "group_id",
          groups.map((g) => g.id),
        );
      const rows = (memberRows ?? []) as { group_id: string; user_id: string }[];
      const authors = await loadAuthors([...rows.map((r) => r.user_id), ...groups.map((g) => g.owner_id)]);
      const { data: conversationRows } = await supabase
        .from("conversations")
        .select("id, group_id")
        .in(
          "group_id",
          groups.map((g) => g.id),
        );
      const conversations = new Map(
        ((conversationRows ?? []) as { id: string; group_id: string | null }[])
          .filter((row) => row.group_id)
          .map((row) => [row.group_id as string, row.id]),
      );
      return groups.map((g) => {
        const members = rows
          .filter((r) => r.group_id === g.id)
          .map((r) => authors.get(r.user_id) ?? { id: r.user_id, name: "Profile unavailable", avatar_url: null });
        const owner = authors.get(g.owner_id);
        const until = owner?.verified_until ? new Date(owner.verified_until).getTime() : null;
        return {
          ...g,
          members,
          member_count: members.length,
          conversation_id: conversations.get(g.id) ?? null,
          owner_verified: Boolean(owner?.verified_tier) && (until === null || until > Date.now()),
        };
      });
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, memberIds }: { name: string; memberIds: string[] }) => {
      const me = await currentUserId();
      if (!me) throw new Error("You need to be signed in.");
      const clean = name.trim();
      if (!clean) throw new Error("Give the group a name.");
      const { data, error } = await supabase
        .from("chat_groups")
        .insert({ owner_id: me, name: clean })
        .select("id")
        .single();
      if (error) {
        if (/GROUP_NAME_PROTECTED_BY_VERIFIED_ACCOUNT/.test(error.message)) {
          throw new Error("That group name belongs to a verified member. Choose another name.");
        }
        throw error;
      }
      const groupId = (data as { id: string }).id;
      const members = Array.from(new Set([me, ...memberIds]));
      const { error: memberError } = await supabase
        .from("group_members")
        .insert(members.map((user_id) => ({ group_id: groupId, user_id, added_by: me })));
      if (memberError) throw memberError;
      const { error: convError } = await supabase
        .from("conversations")
        .insert({ group_id: groupId, client_id: me, owner_id: me });
      if (convError) throw convError;
      return groupId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Only the owner may delete a group; the chat and its messages go with it. */
export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const me = await currentUserId();
      if (!me) throw new Error("You need to be signed in.");
      const { error } = await supabase.from("chat_groups").delete().eq("id", groupId).eq("owner_id", me);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useAddGroupMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, memberIds }: { groupId: string; memberIds: string[] }) => {
      const me = await currentUserId();
      if (!me) throw new Error("You need to be signed in.");
      if (memberIds.length === 0) return;
      const { error } = await supabase
        .from("group_members")
        .insert(memberIds.map((user_id) => ({ group_id: groupId, user_id, added_by: me })));
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["chat-groups"] }),
  });
}

/** The conversation row backing a group chat. */
export function useGroupConversation(groupId: string | null) {
  return useQuery({
    queryKey: ["group-conversation", groupId],
    enabled: Boolean(groupId),
    queryFn: async () => {
      const { data } = await supabase.from("conversations").select("id").eq("group_id", groupId!).maybeSingle();
      return (data as { id: string } | null)?.id ?? null;
    },
  });
}

/* ---------------------------------------------------------- chat wallpaper */

export const CHAT_WALLPAPERS = [
  { id: "default", en: "ASH default", fr: "ASH par défaut", css: "" },
  {
    id: "emerald",
    en: "Emerald mist",
    fr: "Brume émeraude",
    css: "linear-gradient(160deg,oklch(0.32 0.06 165),oklch(0.18 0.03 165))",
  },
  {
    id: "gold",
    en: "Gold dusk",
    fr: "Crépuscule doré",
    css: "linear-gradient(160deg,oklch(0.38 0.07 85),oklch(0.2 0.03 60))",
  },
  {
    id: "ink",
    en: "Midnight ink",
    fr: "Encre de minuit",
    css: "linear-gradient(160deg,oklch(0.24 0.02 265),oklch(0.14 0.01 265))",
  },
  {
    id: "sand",
    en: "Warm sand",
    fr: "Sable chaud",
    css: "linear-gradient(160deg,oklch(0.9 0.03 80),oklch(0.82 0.04 60))",
  },
] as const;

export type ChatSettings = { wallpaper: string; wallpaper_path: string | null; wallpaperUrl: string | null };

export function useChatSettings() {
  return useQuery({
    queryKey: ["chat-settings"],
    queryFn: async (): Promise<ChatSettings> => {
      const me = await currentUserId();
      if (!me) return { wallpaper: "default", wallpaper_path: null, wallpaperUrl: null };
      const { data } = await supabase
        .from("chat_settings")
        .select("wallpaper, wallpaper_path")
        .eq("user_id", me)
        .maybeSingle();
      const row = (data as { wallpaper: string; wallpaper_path: string | null } | null) ?? {
        wallpaper: "default",
        wallpaper_path: null,
      };
      let wallpaperUrl: string | null = null;
      if (row.wallpaper_path) {
        const signed = await signPaths([row.wallpaper_path]);
        wallpaperUrl = signed[row.wallpaper_path] ?? null;
      }
      return { ...row, wallpaperUrl };
    },
  });
}

export function useSetWallpaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ wallpaper, file }: { wallpaper: string; file?: File | null }) => {
      const me = await currentUserId();
      if (!me) throw new Error("You need to be signed in.");
      let path: string | null = null;
      if (file) path = await uploadImage(me, file, "wallpaper");
      const { error } = await supabase
        .from("chat_settings")
        .upsert({ user_id: me, wallpaper, wallpaper_path: path }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["chat-settings"] }),
  });
}

/* ---------------------------------------------------- friend suggestions */

/**
 * People you might know: real members you are not already linked to. No bots,
 * no seeded rows — just the newest members outside your friend graph.
 */
export function useFriendSuggestions(limit = 12) {
  return useQuery({
    queryKey: ["friend-suggestions", limit],
    queryFn: async (): Promise<SocialAuthor[]> => {
      const me = await currentUserId();
      if (!me) return [];
      const { data: links } = await supabase.from("friendships").select("requester_id, addressee_id, status");
      const linked = new Set<string>([me]);
      for (const row of (links ?? []) as { requester_id: string; addressee_id: string }[]) {
        linked.add(row.requester_id);
        linked.add(row.addressee_id);
      }
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, verified_tier, verified_until")
        .order("created_at", { ascending: false })
        .limit(limit + linked.size + 10);
      return (
        (data ?? []) as {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          verified_tier: string | null;
          verified_until: string | null;
        }[]
      )
        .filter((row) => !linked.has(row.user_id) && Boolean(row.full_name))
        .slice(0, limit)
        .map((row) => ({
          id: row.user_id,
          name: row.full_name ?? "Profile unavailable",
          avatar_url: row.avatar_url,
          verified_tier: row.verified_tier,
          verified_until: row.verified_until,
        }));
    },
  });
}

/** One member's public card: name, photo, badge. */
export function useMemberProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["member-profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<SocialAuthor | null> => {
      const authors = await loadAuthors([userId!]);
      return authors.get(userId!) ?? null;
    },
  });
}
