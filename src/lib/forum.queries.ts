/**
 * ASH Incubator Forum — a public, Twitter-style feed of posts inside tracks
 * (spaces), with replies and likes. All data lives in the ASH backend.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SPOTLIGHT_BUCKET, SPOTLIGHT_MAX_BYTES } from "./spotlight.queries";

export const FORUM_SPACES = [
  { key: "INTRODUCTIONS", en: "Introductions", fr: "Présentations" },
  { key: "BUILD_IN_PUBLIC", en: "Build in Public", fr: "Construire en public" },
  { key: "STUDENT_INNOVATORS", en: "Student Innovators", fr: "Étudiants innovateurs" },
  { key: "FUTURE_FOUNDERS", en: "Future Founders", fr: "Futurs fondateurs" },
  { key: "STARTUP_BUILDERS", en: "Startup Builders", fr: "Créateurs de startups" },
  { key: "TECH_BUILDERS", en: "Tech Builders", fr: "Builders tech" },
  { key: "OPPORTUNITIES", en: "Opportunities", fr: "Opportunités" },
  { key: "HELP_DESK", en: "Help Desk", fr: "Aide" },
] as const;

export type ForumSpace = (typeof FORUM_SPACES)[number]["key"];

export type ForumAuthor = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type ForumPost = {
  id: string;
  space: string;
  body: string;
  image_url: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  author: ForumAuthor;
  liked: boolean;
};

export type ForumComment = {
  id: string;
  body: string;
  created_at: string;
  author: ForumAuthor;
};

async function loadAuthors(ids: string[]): Promise<Record<string, ForumAuthor>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url")
    .in("user_id", unique);
  const map: Record<string, ForumAuthor> = {};
  for (const row of data ?? []) {
    map[row.user_id] = {
      id: row.user_id,
      name: row.full_name || "ASH member",
      avatar_url: row.avatar_url ?? null,
    };
  }
  return map;
}

async function signImages(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data } = await supabase.storage
    .from(SPOTLIGHT_BUCKET)
    .createSignedUrls(unique, 60 * 60 * 12);
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

/** Newest-first forum posts, optionally filtered to one space. */
export function useForumFeed(space: ForumSpace | "ALL" = "ALL", limit = 40) {
  return useQuery({
    queryKey: ["forum-feed", space, limit],
    staleTime: 15_000,
    queryFn: async (): Promise<ForumPost[]> => {
      let query = supabase
        .from("forum_posts")
        .select("id, author_id, space, body, image_path, like_count, comment_count, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (space !== "ALL") query = query.eq("space", space);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];

      const { data: auth } = await supabase.auth.getUser();
      const [authors, images, likes] = await Promise.all([
        loadAuthors(rows.map((r) => r.author_id)),
        signImages(rows.map((r) => r.image_path ?? "").filter(Boolean)),
        auth.user
          ? supabase
              .from("forum_likes")
              .select("post_id")
              .eq("user_id", auth.user.id)
              .in(
                "post_id",
                rows.map((r) => r.id),
              )
          : Promise.resolve({ data: [] as { post_id: string }[] }),
      ]);
      const likedSet = new Set(((likes as { data?: { post_id: string }[] }).data ?? []).map((l) => l.post_id));

      return rows.map((row) => ({
        id: row.id,
        space: row.space,
        body: row.body,
        image_url: row.image_path ? (images[row.image_path] ?? null) : null,
        like_count: row.like_count ?? 0,
        comment_count: row.comment_count ?? 0,
        created_at: row.created_at,
        author: authors[row.author_id] ?? { id: row.author_id, name: "ASH member", avatar_url: null },
        liked: likedSet.has(row.id),
      }));
    },
  });
}

/** Replies on a post, oldest first. */
export function useForumComments(postId: string | null) {
  return useQuery({
    queryKey: ["forum-comments", postId],
    enabled: Boolean(postId),
    queryFn: async (): Promise<ForumComment[]> => {
      if (!postId) return [];
      const { data, error } = await supabase
        .from("forum_comments")
        .select("id, author_id, body, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      const authors = await loadAuthors(rows.map((r) => r.author_id));
      return rows.map((row) => ({
        id: row.id,
        body: row.body,
        created_at: row.created_at,
        author: authors[row.author_id] ?? { id: row.author_id, name: "ASH member", avatar_url: null },
      }));
    },
  });
}

export function useCreateForumPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body: string; space: ForumSpace; image?: File | null }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("SIGNED_OUT");

      let imagePath: string | null = null;
      if (input.image) {
        if (input.image.size > SPOTLIGHT_MAX_BYTES) throw new Error("FILE_TOO_LARGE");
        const ext = input.image.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/forum-${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(SPOTLIGHT_BUCKET)
          .upload(path, input.image, { upsert: false, contentType: input.image.type });
        if (uploadError) throw uploadError;
        imagePath = path;
      }

      const { error } = await supabase.from("forum_posts").insert({
        author_id: userId,
        space: input.space,
        body: input.body.trim(),
        image_path: imagePath,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-feed"] }),
  });
}

export function useToggleForumLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; liked: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("SIGNED_OUT");
      if (input.liked) {
        const { error } = await supabase
          .from("forum_likes")
          .delete()
          .eq("post_id", input.postId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("forum_likes")
          .insert({ post_id: input.postId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-feed"] }),
  });
}

export function useCreateForumComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; body: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("SIGNED_OUT");
      const { error } = await supabase.from("forum_comments").insert({
        post_id: input.postId,
        author_id: userId,
        body: input.body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["forum-comments", variables.postId] });
      void queryClient.invalidateQueries({ queryKey: ["forum-feed"] });
    },
  });
}
