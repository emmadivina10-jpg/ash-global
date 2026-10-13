import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePost, useSocialFeed, type FeedPost } from "@/lib/social.queries";
import { directory, type DirectoryProfile } from "@/lib/public-profiles";
import { trackEvent } from "./activity";

const db = supabase as unknown as { from: (table: string) => any };
const VERIFICATION_BUCKET = "market-verification";

export type FxApplicationStatus =
  "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "ADDITIONAL_INFORMATION_REQUIRED" | "REJECTED";

export type FxInstructorApplication = {
  id: string;
  user_id: string;
  display_name: string;
  country: "CM" | "NG";
  status: FxApplicationStatus;
  admin_note: string | null;
  kyc_status: string;
  submitted_at: string;
};

export type FxInstructorProfile = {
  id: string;
  user_id: string;
  about: string;
  experience_summary: string;
  specialties: string[];
  follower_count: number;
  is_active: boolean;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  verified_tier: string | null;
  verified_until: string | null;
  online: boolean;
};

export type MarketPostMeta = {
  id: string;
  author_id?: string;
  social_post_id: string;
  instructor_id: string;
  content_type: string;
  market_category: string;
  instrument: string | null;
  title: string;
  educational_label: string;
  published_at: string;
};

export type MarketUpdate = MarketPostMeta & { post: FeedPost };

export type OwnSpotlightReference = {
  id: string;
  caption: string | null;
  created_at: string;
};

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function useMyFxInstructorApplication() {
  return useQuery({
    queryKey: ["fx-instructor-application", "mine"],
    queryFn: async (): Promise<FxInstructorApplication | null> => {
      const userId = await currentUserId();
      if (!userId) return null;
      const { data, error } = await db
        .from("fx_instructor_applications")
        .select("id,user_id,display_name,country,status,admin_note,kyc_status,submitted_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as FxInstructorApplication | null;
    },
  });
}

async function uploadPrivateDocument(userId: string, file: File, label: string) {
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Each verification file must be smaller than 15 MB.");
  const ext =
    file.name
      .split(".")
      .pop()
      ?.replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8) || "jpg";
  const path = `${userId}/${label}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(VERIFICATION_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  return path;
}

export function useSubmitFxInstructorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      legalFullName: string;
      displayName: string;
      country: "CM" | "NG";
      dateOfBirth: string;
      profileSummary: string;
      tradingExperience: string;
      yearsExperience: number;
      expertise: string[];
      tradingBackground: string;
      governmentIdType: "NATIONAL_ID" | "PASSPORT" | "DRIVERS_LICENSE";
      governmentId: File;
      selfie: File;
      declarationsAccepted: boolean;
    }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      if (!input.declarationsAccepted)
        throw new Error("Please accept the declaration before submitting.");
      const uploaded: string[] = [];
      try {
        const governmentIdPath = await uploadPrivateDocument(
          userId,
          input.governmentId,
          "government-id",
        );
        uploaded.push(governmentIdPath);
        const selfiePath = await uploadPrivateDocument(userId, input.selfie, "selfie");
        uploaded.push(selfiePath);
        const { error } = await db.from("fx_instructor_applications").insert({
          user_id: userId,
          legal_full_name: input.legalFullName.trim(),
          display_name: input.displayName.trim(),
          country: input.country,
          date_of_birth: input.dateOfBirth,
          profile_summary: input.profileSummary.trim(),
          trading_experience: input.tradingExperience.trim(),
          years_experience: input.yearsExperience,
          expertise: input.expertise,
          trading_background: input.tradingBackground.trim(),
          government_id_type: input.governmentIdType,
          government_id_path: governmentIdPath,
          selfie_path: selfiePath,
          declarations_accepted: true,
        });
        if (error) throw error;
      } catch (error) {
        if (uploaded.length) await supabase.storage.from(VERIFICATION_BUCKET).remove(uploaded);
        throw error;
      }
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["fx-instructor-application"] }),
  });
}

export function useFxInstructors() {
  return useQuery({
    queryKey: ["fx-instructors"],
    staleTime: 60_000,
    queryFn: async (): Promise<FxInstructorProfile[]> => {
      const { data: rows, error } = await db
        .from("fx_instructor_profiles")
        .select("id,user_id,about,experience_summary,specialties,follower_count,is_active")
        .eq("is_active", true)
        .order("follower_count", { ascending: false });
      if (error) throw error;
      const ids = (rows ?? []).map((row: { user_id: string }) => row.user_id);
      if (!ids.length) return [];
      const since = new Date(Date.now() - 5 * 60_000).toISOString();
      const [{ data: profiles }, { data: presence }] = await Promise.all([
        directory()
          .select("user_id,full_name,username,avatar_url,verified_tier,verified_until")
          .in("user_id", ids),
        supabase
          .from("member_presence")
          .select("user_id")
          .in("user_id", ids)
          .gte("last_active_at", since),
      ]);
      const onlineIds = new Set((presence ?? []).map((row) => row.user_id));
      const byUser = new Map(
        ((profiles ?? []) as DirectoryProfile[]).map((profile) => [profile.user_id, profile]),
      );
      return (rows ?? []).map(
        (row: Omit<FxInstructorProfile, "full_name" | "username" | "avatar_url">) => {
          const profile = byUser.get(row.user_id);
          return {
            ...row,
            full_name: profile?.full_name?.trim() || "Profile",
            username: profile?.username ?? null,
            avatar_url: profile?.avatar_url ?? null,
            verified_tier: profile?.verified_tier ?? null,
            verified_until: profile?.verified_until ?? null,
            online: onlineIds.has(row.user_id),
          };
        },
      );
    },
  });
}

export function useMyFxInstructorProfile() {
  return useQuery({
    queryKey: ["fx-instructor-profile", "mine"],
    queryFn: async (): Promise<FxInstructorProfile | null> => {
      const userId = await currentUserId();
      if (!userId) return null;
      const { data, error } = await db
        .from("fx_instructor_profiles")
        .select("id,user_id,about,experience_summary,specialties,follower_count,is_active")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,username,avatar_url,verified_tier,verified_until")
        .eq("user_id", userId)
        .maybeSingle();
      return {
        ...data,
        full_name: profile?.full_name?.trim() || "Profile",
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
        verified_tier: profile?.verified_tier ?? null,
        verified_until: profile?.verified_until ?? null,
        online: true,
      } as FxInstructorProfile;
    },
  });
}

export function useMySpotlightReferences(enabled = true) {
  return useQuery({
    queryKey: ["market-spotlight-references", "mine"],
    enabled,
    queryFn: async (): Promise<OwnSpotlightReference[]> => {
      const userId = await currentUserId();
      if (!userId) return [];
      const { data, error } = await supabase
        .from("spotlight_posts")
        .select("id,caption,created_at")
        .eq("author_id", userId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useMarketUpdates() {
  const feed = useSocialFeed(100);
  const metadata = useQuery({
    queryKey: ["market-posts"],
    staleTime: 15_000,
    queryFn: async (): Promise<MarketPostMeta[]> => {
      const { data, error } = await db
        .from("market_posts")
        .select(
          "id,social_post_id,instructor_id,content_type,market_category,instrument,title,educational_label,published_at",
        )
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as MarketPostMeta[];
    },
  });
  const posts = new Map((feed.data ?? []).map((post) => [post.id, post]));
  return {
    ...metadata,
    isLoading: metadata.isLoading || feed.isLoading,
    data: (metadata.data ?? []).flatMap((meta) => {
      const post = posts.get(meta.social_post_id);
      return post ? [{ ...meta, post }] : [];
    }),
  };
}

export function useMarketUpdate(marketPostId: string) {
  const metadata = useQuery({
    queryKey: ["market-post", marketPostId],
    queryFn: async (): Promise<MarketPostMeta | null> => {
      const { data, error } = await db
        .from("market_posts")
        .select(
          "id,author_id,social_post_id,instructor_id,content_type,market_category,instrument,title,educational_label,published_at",
        )
        .eq("id", marketPostId)
        .maybeSingle();
      if (error) throw error;
      return data as MarketPostMeta | null;
    },
  });
  const post = usePost(metadata.data?.social_post_id);
  return {
    isLoading: metadata.isLoading || post.isLoading,
    data: metadata.data && post.data ? { ...metadata.data, post: post.data } : null,
  };
}

export function useFxInstructorProfile(instructorId: string) {
  return useQuery({
    queryKey: ["fx-instructor-profile", instructorId],
    queryFn: async (): Promise<FxInstructorProfile | null> => {
      const { data, error } = await db
        .from("fx_instructor_profiles")
        .select("id,user_id,about,experience_summary,specialties,follower_count,is_active")
        .eq("id", instructorId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const since = new Date(Date.now() - 5 * 60_000).toISOString();
      const [{ data: profile }, { data: presence }] = await Promise.all([
        directory()
          .select("full_name,username,avatar_url,verified_tier,verified_until")
          .eq("user_id", data.user_id)
          .maybeSingle(),
        supabase
          .from("member_presence")
          .select("user_id")
          .eq("user_id", data.user_id)
          .gte("last_active_at", since)
          .maybeSingle(),
      ]);
      return {
        ...data,
        full_name: profile?.full_name?.trim() || "Profile",
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
        verified_tier: profile?.verified_tier ?? null,
        verified_until: profile?.verified_until ?? null,
        online: Boolean(presence),
      } as FxInstructorProfile;
    },
  });
}

export function useInstructorMarketUpdates(instructorId: string) {
  const all = useMarketUpdates();
  return { ...all, data: (all.data ?? []).filter((item) => item.instructor_id === instructorId) };
}

export function useInstructorFollowState(instructorId: string) {
  return useQuery({
    queryKey: ["fx-instructor-follow", instructorId],
    queryFn: async () => {
      const userId = await currentUserId();
      if (!userId) return false;
      const { data } = await db
        .from("fx_instructor_follows")
        .select("instructor_id")
        .eq("instructor_id", instructorId)
        .eq("follower_id", userId)
        .maybeSingle();
      return Boolean(data);
    },
  });
}

export function useMarketSaveState(marketPostId: string) {
  return useQuery({
    queryKey: ["market-save", marketPostId],
    queryFn: async () => {
      const userId = await currentUserId();
      if (!userId) return false;
      const { data } = await db
        .from("market_post_saves")
        .select("market_post_id")
        .eq("market_post_id", marketPostId)
        .eq("user_id", userId)
        .maybeSingle();
      return Boolean(data);
    },
  });
}

export function useToggleMarketSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ marketPostId, saved }: { marketPostId: string; saved: boolean }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      const request = saved
        ? db
            .from("market_post_saves")
            .delete()
            .eq("market_post_id", marketPostId)
            .eq("user_id", userId)
        : db.from("market_post_saves").insert({ market_post_id: marketPostId, user_id: userId });
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      trackEvent({
        event_type: input.saved ? "unsave" : "save",
        surface: "markets",
        target_type: "market_post",
        target_id: input.marketPostId,
      });
      void queryClient.invalidateQueries({ queryKey: ["market-save", input.marketPostId] });
    },
  });
}

export function useCreateMarketPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      socialPostId: string;
      instructorId: string;
      contentType: string;
      title: string;
      instrument?: string;
      spotlightPostId?: string;
    }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      const { error } = await db.from("market_posts").insert({
        social_post_id: input.socialPostId,
        instructor_id: input.instructorId,
        author_id: userId,
        content_type: input.contentType,
        market_category: "FX",
        instrument: input.instrument?.trim() || null,
        spotlight_post_id: input.spotlightPostId || null,
        title: input.title.trim(),
        educational_label:
          input.contentType === "EDUCATIONAL_POST"
            ? "Educational Discussion"
            : "Market Observation",
      });
      if (error) {
        await supabase.from("social_posts").delete().eq("id", input.socialPostId);
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["market-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["social-feed"] });
    },
  });
}

export function useToggleInstructorFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instructorId,
      following,
    }: {
      instructorId: string;
      following: boolean;
    }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      const request = following
        ? db
            .from("fx_instructor_follows")
            .delete()
            .eq("instructor_id", instructorId)
            .eq("follower_id", userId)
        : db
            .from("fx_instructor_follows")
            .insert({ instructor_id: instructorId, follower_id: userId });
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      if (!input.following) {
        trackEvent({
          event_type: "follow",
          surface: "markets",
          target_type: "instructor",
          target_id: input.instructorId,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["fx-instructors"] });
      void queryClient.invalidateQueries({
        queryKey: ["fx-instructor-follow", input.instructorId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["fx-instructor-profile", input.instructorId],
      });
    },
  });
}
