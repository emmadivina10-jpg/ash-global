import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Musician = {
  id: string;
  user_id: string;
  display_name: string;
  biography: string;
  instruments: string[];
  genres: string[];
  experience: string;
  city: string;
  country: string;
  accepting_enquiries: boolean;
  online: boolean;
  hourly_rate_minor: number | null;
  rate_currency: "CAD" | "XAF" | null;
  review_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  updated_at: string;
};
export type MusicianMedia = {
  id: string;
  musician_id: string;
  object_path: string;
  media_type: "PHOTO" | "VIDEO" | "AUDIO";
  review_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
};
export type MusicianEnquiry = {
  id: string;
  musician_id: string;
  customer_id: string;
  message: string;
  event_date: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED";
  completed_by_customer?: boolean;
  completed_by_musician?: boolean;
  created_at: string;
  updated_at: string;
};
type Contact = { musician_id: string; email: string | null; phone: string | null };
type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
type TalentDatabase = {
  public: {
    Tables: {
      musician_profiles: Table<
        Musician,
        Pick<Musician, "user_id" | "display_name" | "instruments" | "city" | "country"> &
          Partial<
            Pick<
              Musician,
              "biography" | "genres" | "experience" | "hourly_rate_minor" | "rate_currency"
            >
          >,
        Partial<
          Pick<
            Musician,
            | "display_name"
            | "instruments"
            | "city"
            | "country"
            | "biography"
            | "genres"
            | "experience"
            | "accepting_enquiries"
            | "online"
            | "hourly_rate_minor"
            | "rate_currency"
          >
        >
      >;
      musician_contacts: Table<Contact, Contact, Partial<Contact>>;
      musician_media: Table<
        MusicianMedia,
        Pick<MusicianMedia, "musician_id" | "object_path" | "media_type">,
        never
      >;
      musician_enquiries: Table<MusicianEnquiry, never, never>;
      musician_favorites: Table<
        { user_id: string; musician_id: string; created_at: string },
        { user_id: string; musician_id: string; created_at?: string },
        never
      >;
      musician_reviews: Table<
        {
          id: string;
          enquiry_id: string;
          musician_id: string;
          reviewer_id: string;
          rating: number;
          review: string;
          created_at: string;
        },
        never,
        never
      >;
    };
    Views: Record<string, never>;
    Functions: {
      submit_musician_enquiry: {
        Args: { _musician_id: string; _message: string; _event_date?: string | null };
        Returns: string;
      };
      respond_musician_enquiry: { Args: { _id: string; _status: string }; Returns: undefined };
      review_musician_content: {
        Args: { _kind: string; _id: string; _status: string };
        Returns: undefined;
      };
      create_musician_review: {
        Args: { _enquiry_id: string; _rating: number; _review?: string };
        Returns: string;
      };
      get_musician_stats: {
        Args: { _musician_ids: string[] };
        Returns: {
          musician_id: string;
          rating_average: number;
          review_count: number;
          booking_count: number;
        }[];
      };
      confirm_musician_gig_completed: { Args: { _enquiry_id: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
// Schema additions are kept separate until types can be generated from the migrated database.
export const talentDb = supabase as unknown as SupabaseClient<
  TalentDatabase & Pick<Database, "__InternalSupabase">
>;
export const TALENT_BUCKET = "musician-portfolio";

export function useMusicians(country: string | null, city: string, role: string) {
  return useQuery({
    queryKey: ["musicians", country, city, role],
    queryFn: async () => {
      let query = talentDb
        .from("musician_profiles")
        .select("*")
        .eq("review_status", "APPROVED")
        .order("created_at", { ascending: false })
        .limit(100);
      if (country) query = query.eq("country", country);
      if (city.trim()) query = query.ilike("city", `%${city.trim().replace(/[%_\\]/g, "")}%`);
      if (role !== "all") query = query.contains("instruments", [role]);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export type SignedMusicianMedia = MusicianMedia & { url: string };
export type MusicianStats = {
  musician_id: string;
  rating_average: number;
  review_count: number;
  booking_count: number;
};

export function useMusician(id: string) {
  return useQuery({
    queryKey: ["musician", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await talentDb
        .from("musician_profiles")
        .select("*")
        .eq("id", id)
        .eq("review_status", "APPROVED")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMusicianPreviewMedia(ids: string[]) {
  const keys = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["musician-preview-media", keys],
    enabled: keys.length > 0,
    queryFn: async (): Promise<SignedMusicianMedia[]> => {
      const result = await talentDb
        .from("musician_media")
        .select("*")
        .in("musician_id", keys)
        .eq("review_status", "APPROVED")
        .order("created_at");
      if (result.error) throw result.error;
      const paths = [...new Set(result.data.map((item) => item.object_path))];
      const signed = await supabase.storage.from(TALENT_BUCKET).createSignedUrls(paths, 300);
      if (signed.error) throw signed.error;
      const urlByPath = new Map(
        signed.data.flatMap((item) =>
          item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
        ),
      );
      return result.data.flatMap((item) => {
        const url = urlByPath.get(item.object_path);
        return url ? [{ ...item, url }] : [];
      });
    },
    staleTime: 180_000,
  });
}

export function useMusicianStats(ids: string[]) {
  const keys = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["musician-stats", keys],
    enabled: keys.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await talentDb.rpc("get_musician_stats", { _musician_ids: keys });
      if (error) throw error;
      return new Map((data ?? []).map((item) => [item.musician_id, item]));
    },
  });
}

export function useMusicianFavorite(userId: string | undefined, musicianId: string) {
  return useQuery({
    queryKey: ["musician-favorite", userId, musicianId],
    enabled: Boolean(userId && musicianId),
    queryFn: async () => {
      const { data, error } = await talentDb
        .from("musician_favorites")
        .select("musician_id")
        .eq("user_id", userId!)
        .eq("musician_id", musicianId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });
}

export function useMusicianReviews(id: string) {
  return useQuery({
    queryKey: ["musician-reviews-public", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await talentDb
        .from("musician_reviews")
        .select("id, rating, review, created_at")
        .eq("musician_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMusicianMedia(id: string | undefined) {
  return useQuery({
    queryKey: ["musician-media", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const result = await talentDb
        .from("musician_media")
        .select("*")
        .eq("musician_id", id!)
        .order("created_at");
      if (result.error) throw result.error;
      const urls = await Promise.all(
        result.data.map(async (media) => {
          const signed = await supabase.storage
            .from(TALENT_BUCKET)
            .createSignedUrl(media.object_path, 300);
          if (signed.error) throw signed.error;
          return { ...media, url: signed.data.signedUrl };
        }),
      );
      return urls;
    },
    staleTime: 180_000,
  });
}

export function useMyMusician(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-musician", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await talentDb
        .from("musician_profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}
