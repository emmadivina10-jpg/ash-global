/**
 * ASH Social — stories (24 h), the photo feed with likes, comments, replies and
 * reposts, friend requests, groups and chat preferences. Everything here reads
 * and writes real member data; nothing is seeded.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { verifyMediaFiles } from "./media-safety";

export const SOCIAL_BUCKET = "spotlight";
/** Largest single photo accepted by a story or a feed post. */
export const SOCIAL_MAX_BYTES = 12 * 1024 * 1024;

export type SocialAuthor = {
  id: string;
  name: string;
  avatar_url: string | null;
  verified_tier?: string | null;
  verified_until?: string | null;
};

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data } = await supabase.storage.from(SOCIAL_BUCKET).createSignedUrls(unique, 60 * 60 * 12);
  const map: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  return map;
}

export async function loadAuthors(ids: string[]): Promise<Map<string, SocialAuthor>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, SocialAuthor>();
  if (unique.length === 0) return map;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, verified_tier, verified_until")
    .in("user_id", unique);
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
    });
  }
  return map;
}

async function uploadImage(userId: string, file: File, prefix: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only photos can be shared right now.");
  if (file.size > SOCIAL_MAX_BYTES) throw new Error(`${file.name} is larger than 12 MB.`);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${prefix}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(SOCIAL_BUCKET)
    .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

/* ------------------------------------------------------------------ stories */

export type Story = {
  id: string;
  author_id: string;
  caption: string;
  url: string;
  view_count: number;
  created_at: string;
  expires_at: string;
};

export type StoryGroup = { author: SocialAuthor; stories: Story[]; seen: boolean };

/** Who may watch a story: everyone on ASH, or only hand-picked members. */
export type StoryAudience = "ALL" | "SELECT";

/** Every live story, grouped by the member who posted it. */
export function useStories() {
  return useQuery({
    queryKey: ["stories"],
    staleTime: 20_000,
    queryFn: async (): Promise<{ me: string | null; groups: StoryGroup[] }> => {
      const me = await currentUserId();
      const { data, error } = await supabase
        .from("stories")
        .select("id, author_id, caption, media_path, view_count, created_at, expires_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
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

      const [signed, authors, seenRows] = await Promise.all([
        signPaths(rows.map((r) => r.media_path)),
        loadAuthors(rows.map((r) => r.author_id)),
        me
          ? supabase
              .from("story_views")
              .select("story_id")
              .eq("viewer_id", me)
              .in(
                "story_id",
                rows.map((r) => r.id),
              )
          : Promise.resolve({ data: [] }),
      ]);
      const seen = new Set(((seenRows.data ?? []) as { story_id: string }[]).map((r) => r.story_id));

      const grouped = new Map<string, Story[]>();
      for (const row of rows) {
        const url = signed[row.media_path];
        if (!url) continue;
        const list = grouped.get(row.author_id) ?? [];
        list.push({
          id: row.id,
          author_id: row.author_id,
          caption: row.caption,
          url,
          view_count: row.view_count,
          created_at: row.created_at,
          expires_at: row.expires_at,
        });
        grouped.set(row.author_id, list);
      }

      const groups: StoryGroup[] = Array.from(grouped.entries()).map(([authorId, stories]) => ({
        author: authors.get(authorId) ?? { id: authorId, name: "ASH member", avatar_url: null },
        stories,
        seen: stories.every((s) => seen.has(s.id)),
      }));

      // Mine first, then unseen, then newest.
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
    }: {
      file: File;
      caption: string;
      /** ALL = anyone on ASH can watch, SELECT = only the chosen members. */
      audience?: StoryAudience;
      allowIds?: string[];
      blockIds?: string[];
    }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      await verifyMediaFiles([file], "STORY");
      const path = await uploadImage(userId, file, "story");
      const { error } = await supabase.from("stories").insert({
        author_id: userId,
        media_path: path,
        caption: caption.trim(),
        audience,
        allow_ids: audience === "SELECT" ? allowIds : [],
        block_ids: audience === "ALL" ? blockIds : [],
      });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["stories"] }),
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
      const { data, error: readError } = await supabase
        .from("stories")
        .select("media_path")
        .eq("id", id)
        .maybeSingle();
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
      const [signed, authors] = await Promise.all([signPaths(paths), loadAuthors(rows.map((r) => r.author_id))]);
      return rows.map((r) => ({
        id: r.id,
        author_id: r.author_id,
        caption: r.caption,
        city: r.city,
        images: parseImages(r.media)
          .map((p) => signed[p])
          .filter((u): u is string => Boolean(u)),
        like_count: r.like_count,
        comment_count: r.comment_count,
        repost_count: r.repost_count,
        filter_comments: r.filter_comments,
        liked: r.liked,
        reposted: r.reposted,
        created_at: r.created_at,
        author: authors.get(r.author_id) ?? { id: r.author_id, name: "ASH member", avatar_url: null },
      }));
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
        .select("id, author_id, caption, media, city, like_count, comment_count, repost_count, filter_comments, created_at")
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

      const [signed, authors, liked, reposted] = await Promise.all([
        signPaths(parseImages(row.media)),
        loadAuthors([row.author_id]),
        me
          ? supabase.from("post_likes").select("post_id").eq("post_id", row.id).eq("user_id", me).maybeSingle()
          : Promise.resolve({ data: null }),
        me
          ? supabase.from("post_reposts").select("post_id").eq("post_id", row.id).eq("user_id", me).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        id: row.id,
        author_id: row.author_id,
        caption: row.caption,
        city: row.city,
        images: parseImages(row.media)
          .map((p) => signed[p])
          .filter((u): u is string => Boolean(u)),
        like_count: row.like_count,
        comment_count: row.comment_count,
        repost_count: row.repost_count,
        filter_comments: row.filter_comments,
        liked: Boolean(liked.data),
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
      if (!userId) throw new Error("You need to be signed in.");
      if (files.length === 0 && !caption.trim()) throw new Error("Write something or add a photo.");
      await verifyMediaFiles(files.slice(0, 4), "SOCIAL_POST");
      const media: string[] = [];
      for (const file of files.slice(0, 4)) media.push(await uploadImage(userId, file, "post"));
      const { error } = await supabase.from("social_posts").insert({
        author_id: userId,
        caption: caption.trim(),
        media: media as unknown as never,
        city: city ?? null,
        filter_comments: filterComments ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      if (liked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
  });
}

export function useToggleRepost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, reposted }: { postId: string; reposted: boolean }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      if (reposted) {
        const { error } = await supabase
          .from("post_reposts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
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
              .select("comment_id")
              .eq("user_id", me)
              .in("comment_id", rows.map((r) => r.id))
          : Promise.resolve({ data: [] }),
      ]);
      const likedIds = new Set(
        ((likedResult.data ?? []) as { comment_id: string }[]).map((row) => row.comment_id),
      );
      const byId = new Map<string, PostComment>();
      const roots: PostComment[] = [];
      for (const row of rows) {
        byId.set(row.id, {
          id: row.id,
          post_id: row.post_id,
          parent_id: row.parent_id,
          body: row.body,
          created_at: row.created_at,
          author: authors.get(row.author_id) ?? { id: row.author_id, name: "ASH member", avatar_url: null },
          like_count: row.like_count ?? 0,
          liked: likedIds.has(row.id),
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

/** Like / unlike a comment or a reply. */
export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; liked: boolean; postId: string }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      if (liked) {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_result, variables) =>
      void queryClient.invalidateQueries({ queryKey: ["post-comments", variables.postId] }),
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
    queryFn: async (): Promise<{ me: string | null; friends: Friendship[]; incoming: Friendship[]; outgoing: Friendship[] }> => {
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
          other: authors.get(otherId) ?? { id: otherId, name: "ASH member", avatar_url: null },
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
      return ((data ?? []) as { user_id: string; full_name: string; avatar_url: string | null }[])
        .filter((row) => row.user_id !== me)
        .map((row) => ({ id: row.user_id, name: row.full_name, avatar_url: row.avatar_url }));
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
          .map((r) => authors.get(r.user_id) ?? { id: r.user_id, name: "ASH member", avatar_url: null });
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
  { id: "emerald", en: "Emerald mist", fr: "Brume émeraude", css: "linear-gradient(160deg,oklch(0.32 0.06 165),oklch(0.18 0.03 165))" },
  { id: "gold", en: "Gold dusk", fr: "Crépuscule doré", css: "linear-gradient(160deg,oklch(0.38 0.07 85),oklch(0.2 0.03 60))" },
  { id: "ink", en: "Midnight ink", fr: "Encre de minuit", css: "linear-gradient(160deg,oklch(0.24 0.02 265),oklch(0.14 0.01 265))" },
  { id: "sand", en: "Warm sand", fr: "Sable chaud", css: "linear-gradient(160deg,oklch(0.9 0.03 80),oklch(0.82 0.04 60))" },
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
      const { data: links } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status");
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
      return ((data ?? []) as {
        user_id: string;
        full_name: string | null;
        avatar_url: string | null;
        verified_tier: string | null;
        verified_until: string | null;
      }[])
        .filter((row) => !linked.has(row.user_id) && Boolean(row.full_name))
        .slice(0, limit)
        .map((row) => ({
          id: row.user_id,
          name: row.full_name ?? "ASH member",
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
