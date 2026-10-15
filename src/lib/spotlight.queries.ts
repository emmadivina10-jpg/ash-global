/**
 * ASH Spotlight — member-created posts (photos and videos) merged with the
 * latest vendor portfolio highlights into a single vertical feed.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { verifyMediaFiles } from "./media-safety";
import { signPortfolioPaths } from "./marketplace";
import { EMPTY_REACTIONS, type ReactionBreakdown, type ReactionType } from "./social.queries";
import { directory } from "@/lib/public-profiles";
import { trackEvent } from "./activity";
import { rotateSessionContent, freshness, engagement } from "./rotation";
import { useUser } from "./queries";

export const SPOTLIGHT_BUCKET = "spotlight";

/** Largest single upload accepted by the Spotlight bucket. */
export const SPOTLIGHT_MAX_BYTES = 50 * 1024 * 1024;

export type SpotlightMedia = { path: string; type: "image" | "video" };

export type SpotlightEntry = {
  id: string;
  caption: string | null;
  created_at: string;
  url: string;
  media_type: "image" | "video";
  source: "post" | "portfolio";
  author_id: string | null;
  reaction_count: number;
  reaction_breakdown: ReactionBreakdown;
  current_reaction: ReactionType | null;
  provider: {
    id: string;
    business_name: string;
    slug: string | null;
    city: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    verified_tier?: string | null;
    verified_until?: string | null;
    online?: boolean;
  };
};

async function signSpotlightPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(SPOTLIGHT_BUCKET)
    .createSignedUrls(unique, 60 * 60 * 12);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

function parseMedia(value: unknown): SpotlightMedia[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const path = typeof record["path"] === "string" ? record["path"] : "";
    if (!path) return [];
    const type = record["type"] === "video" ? "video" : "image";
    return [{ path, type } as SpotlightMedia];
  });
}

/** The merged Spotlight feed: member posts first, then vendor highlights. */
export function useSpotlightFeed(limit = 18) {
  const { user, loading } = useUser();
  return useQuery({
    queryKey: ["spotlight-feed", limit, user?.id],
    enabled: !loading && Boolean(user),
    staleTime: 30_000,
    queryFn: async (): Promise<SpotlightEntry[]> => {
      const [postsResult, portfolioResult] = await Promise.all([
        supabase
          .from("spotlight_posts")
          .select("id, author_id, provider_id, caption, media, created_at")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("portfolio_items")
          .select(
            "id, provider_id, image_path, caption, created_at, provider:provider_profiles!inner(id, business_name, slug, city, avatar_url, is_live, is_verified)",
          )
          .eq("provider.is_live", true)
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);

      const postRows = (postsResult.data ?? []) as unknown as {
        id: string;
        author_id: string;
        provider_id: string | null;
        caption: string | null;
        media: unknown;
        created_at: string;
      }[];

      // Author identities (provider storefront when they have one, otherwise
      // their personal profile).
      const authorIds = Array.from(new Set(postRows.map((row) => row.author_id)));
      const providerIds = postRows
        .map((row) => row.provider_id)
        .filter((id): id is string => Boolean(id));

      const { data: auth } = await supabase.auth.getUser();
      const since = new Date(Date.now() - 5 * 60_000).toISOString();
      const [profilesResult, providersResult, reactionsResult, presenceResult] = await Promise.all([
        authorIds.length
          ? directory()
              .select("user_id, full_name, avatar_url, verified_tier, verified_until")
              .in("user_id", authorIds)
          : Promise.resolve({ data: [] }),
        providerIds.length
          ? supabase
              .from("provider_profiles")
              .select("id, business_name, slug, city, avatar_url, is_verified")
              .in("id", providerIds)
          : Promise.resolve({ data: [] }),
        postRows.length
          ? supabase
              .from("spotlight_reactions")
              .select("spotlight_id, user_id, reaction_type")
              .in(
                "spotlight_id",
                postRows.map((row) => row.id),
              )
          : Promise.resolve({ data: [] }),
        authorIds.length
          ? supabase
              .from("member_presence")
              .select("user_id")
              .in("user_id", authorIds)
              .gte("last_active_at", since)
          : Promise.resolve({ data: [] }),
      ]);
      const onlineIds = new Set((presenceResult.data ?? []).map((row) => row.user_id));

      const profiles = new Map(
        (
          (profilesResult.data ?? []) as {
            user_id: string;
            full_name: string;
            avatar_url: string | null;
            verified_tier: string | null;
            verified_until: string | null;
          }[]
        ).map((row) => [row.user_id, row]),
      );
      const providers = new Map(
        (
          (providersResult.data ?? []) as {
            id: string;
            business_name: string;
            slug: string | null;
            city: string | null;
            avatar_url: string | null;
            is_verified: boolean;
          }[]
        ).map((row) => [row.id, row]),
      );

      const mediaPaths = postRows.flatMap((row) => parseMedia(row.media).map((m) => m.path));
      const signed = await signSpotlightPaths(mediaPaths);
      const reactionRows = (reactionsResult.data ?? []) as Array<{
        spotlight_id: string;
        user_id: string;
        reaction_type: string;
      }>;

      const postEntries: SpotlightEntry[] = postRows.flatMap((row) => {
        const media = parseMedia(row.media);
        const first = media[0];
        if (!first) return [];
        const url = signed[first.path];
        if (!url) return [];
        const storefront = row.provider_id ? providers.get(row.provider_id) : undefined;
        const profile = profiles.get(row.author_id);
        const reactions = reactionRows.filter((item) => item.spotlight_id === row.id);
        const breakdown = { ...EMPTY_REACTIONS };
        for (const reaction of reactions)
          if (reaction.reaction_type in breakdown)
            breakdown[reaction.reaction_type as ReactionType] += 1;
        return [
          {
            id: `post:${row.id}`,
            caption: row.caption?.trim() ? row.caption : null,
            created_at: row.created_at,
            url,
            media_type: first.type,
            source: "post",
            author_id: row.author_id,
            reaction_count: reactions.length,
            reaction_breakdown: breakdown,
            current_reaction:
              (reactions.find((item) => item.user_id === auth.user?.id)?.reaction_type as
                ReactionType | undefined) ?? null,
            provider: storefront
              ? { ...storefront, online: onlineIds.has(row.author_id) }
              : {
                  id: "",
                  business_name: profile?.full_name ?? "Profile",
                  slug: null,
                  city: null,
                  avatar_url: profile?.avatar_url ?? null,
                  is_verified: false,
                  verified_tier: profile?.verified_tier ?? null,
                  verified_until: profile?.verified_until ?? null,
                  online: onlineIds.has(row.author_id),
                },
          },
        ];
      });

      const portfolioRows = (portfolioResult.data ?? []) as unknown as {
        id: string;
        provider_id: string;
        image_path: string;
        caption: string | null;
        created_at: string;
        provider: SpotlightEntry["provider"];
      }[];
      const portfolioUrls = await signPortfolioPaths(portfolioRows.map((row) => row.image_path));
      const portfolioEntries: SpotlightEntry[] = portfolioRows.flatMap((row) => {
        const url = portfolioUrls[row.image_path];
        if (!url) return [];
        return [
          {
            id: `portfolio:${row.id}`,
            caption: row.caption,
            created_at: row.created_at,
            url,
            media_type: "image",
            source: "portfolio",
            author_id: null,
            reaction_count: 0,
            reaction_breakdown: { ...EMPTY_REACTIONS },
            current_reaction: null,
            provider: row.provider,
          },
        ];
      });

      return rotateSessionContent(
        "spotlight-feed",
        [...postEntries, ...portfolioEntries].map((item) => ({
          item, id: item.id, creator: item.author_id ?? item.provider.id,
          relevance: 0.8 * freshness(item.created_at) + 0.2 * Math.min(1, engagement(item.reaction_count)),
        })),
        auth.user?.id ?? null,
      ).slice(0, limit * 2);
    },
  });
}

export function useSetSpotlightReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      spotlightId,
      reaction,
    }: {
      spotlightId: string;
      reaction: ReactionType | null;
    }) => {
      const { error } = await supabase.rpc("set_spotlight_reaction", {
        _spotlight_id: spotlightId,
        _reaction_type: reaction ?? "",
      });
      if (error) throw error;
    },
    onSuccess: (_result, variables) => {
      trackEvent({
        event_type: variables.reaction ? "spotlight_reaction" : "unlike",
        surface: "spotlight",
        target_type: "spotlight",
        target_id: variables.spotlightId,
      });
      void queryClient.invalidateQueries({ queryKey: ["spotlight-feed"] });
    },
  });
}

/** Uploads media and publishes a Spotlight post for the signed-in member. */
export function useCreateSpotlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caption,
      files,
      providerId,
    }: {
      caption: string;
      files: File[];
      providerId?: string | null;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("You need to be signed in to post.");
      if (files.length === 0) throw new Error("Add at least one photo or video.");
      await verifyMediaFiles(files, "SPOTLIGHT");

      const media: SpotlightMedia[] = [];
      const postId = crypto.randomUUID();
      try {
        for (const file of files) {
          if (file.size > SPOTLIGHT_MAX_BYTES) {
            throw new Error(`${file.name} is larger than 50 MB.`);
          }
          const isVideo = file.type.startsWith("video/");
          const isImage = file.type.startsWith("image/");
          if (!isVideo && !isImage) throw new Error("Only photos and videos can be posted.");
          const extension = file.name.split(".").pop()?.toLowerCase() ?? (isVideo ? "mp4" : "jpg");
          const path = `${userId}/spotlight/${postId}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from(SPOTLIGHT_BUCKET)
            .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          media.push({ path, type: isVideo ? "video" : "image" });
        }

        const { error } = await supabase.from("spotlight_posts").insert({
          id: postId,
          author_id: userId,
          provider_id: providerId ?? null,
          caption: caption.trim(),
          media: media as unknown as never,
        });
        if (error) throw error;
      } catch (error) {
        if (media.length > 0)
          await supabase.storage.from(SPOTLIGHT_BUCKET).remove(media.map((item) => item.path));
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["spotlight-feed"] });
    },
  });
}

/** Deletes a member-created Spotlight and cleans up its uploaded media. */
export function useDeleteSpotlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: SpotlightEntry) => {
      if (entry.source !== "post")
        throw new Error("Only your own Spotlight posts can be deleted here.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || entry.author_id !== auth.user.id) {
        throw new Error("Only the person who posted this Spotlight can delete it.");
      }
      const postId = entry.id.startsWith("post:") ? entry.id.slice(5) : entry.id;
      const { data, error: readError } = await supabase
        .from("spotlight_posts")
        .select("media")
        .eq("id", postId)
        .maybeSingle();
      if (readError) throw readError;
      if (!data) throw new Error("This Spotlight is no longer available.");

      const paths = parseMedia(data.media).map((item) => item.path);
      const { data: deleted, error: deleteError } = await supabase
        .from("spotlight_posts")
        .delete()
        .eq("id", postId)
        .select("id")
        .maybeSingle();
      if (deleteError) throw deleteError;
      if (!deleted) throw new Error("This Spotlight could not be deleted.");

      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from(SPOTLIGHT_BUCKET).remove(paths);
        if (storageError) console.warn("Spotlight media cleanup failed", storageError.message);
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["spotlight-feed"] }),
  });
}
