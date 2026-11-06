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
  status: "PENDING" | "ACCEPTED" | "DECLINED";
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
          Partial<Pick<Musician, "biography" | "genres" | "experience">>,
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

export function useMusicians(country: string | null, city: string, role: string, search: string) {
  return useQuery({
    queryKey: ["musicians", country, city, role, search],
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
      if (search.trim())
        query = query.ilike("display_name", `%${search.trim().replace(/[%_\\]/g, "")}%`);
      const { data, error } = await query;
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
