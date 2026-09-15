import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------- birthdays */

export type BirthdayPerson = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  verified_tier: string | null;
  verified_until: string | null;
  birthday: string;
  /** 0 = today, 1 = tomorrow … */
  inDays: number;
};

function daysUntilBirthday(birthday: string): number | null {
  const parts = birthday.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!month || !day) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next < today) next = new Date(now.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

/** Members whose birthday lands within the next two weeks. */
export function useUpcomingBirthdays() {
  return useQuery({
    queryKey: ["rail", "birthdays"],
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<BirthdayPerson[]> => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, verified_tier, verified_until, birthday")
        .not("birthday", "is", null)
        .limit(500);

      const rows = (data ?? []) as {
        user_id: string;
        full_name: string;
        avatar_url: string | null;
        verified_tier: string | null;
        verified_until: string | null;
        birthday: string;
      }[];

      return rows
        .map((row) => ({ ...row, inDays: daysUntilBirthday(row.birthday) }))
        .filter((row): row is BirthdayPerson => row.inDays !== null && row.inDays <= 14)
        .sort((a, b) => a.inDays - b.inDays)
        .slice(0, 8);
    },
  });
}

/* ---------------------------------------------------------------- events */

export type RailEvent = {
  id: string;
  title: string;
  starts_at: string;
  city: string | null;
  is_free: boolean;
  ticket_price: number | null;
};

export function useRailEvents() {
  return useQuery({
    queryKey: ["rail", "events"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<RailEvent[]> => {
      const { data } = await supabase
        .from("events")
        .select("id, title, starts_at, city, is_free, ticket_price")
        .eq("is_published", true)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(5);
      return (data ?? []) as RailEvent[];
    },
  });
}

/* -------------------------------------------------------------- articles */

export type RailArticle = { id: string; title: string; excerpt: string | null; like_count: number; created_at: string };

export function useRailArticles() {
  return useQuery({
    queryKey: ["rail", "articles"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<RailArticle[]> => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, excerpt, like_count, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as RailArticle[];
    },
  });
}

/* ----------------------------------------------------------------- deals */

export type RailDeal = { id: string; title: string; deal_price: number; original_price: number; city: string | null };

export function useRailDeals() {
  return useQuery({
    queryKey: ["rail", "deals"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<RailDeal[]> => {
      const { data } = await supabase
        .from("deals")
        .select("id, title, deal_price, original_price, city")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4);
      return (data ?? []) as RailDeal[];
    },
  });
}

/* ------------------------------------------------------------------ jobs */

export type RailJob = { id: string; title: string; company: string | null; city: string | null };

export function useRailJobs() {
  return useQuery({
    queryKey: ["rail", "jobs"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<RailJob[]> => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, company, city, created_at")
        .eq("is_open", true)
        .order("created_at", { ascending: false })
        .limit(4);
      return (data ?? []).map((row) => ({
        id: row.id as string,
        title: row.title as string,
        company: (row.company as string | null) ?? null,
        city: (row.city as string | null) ?? null,
      }));
    },
  });
}

/* ----------------------------------------------------------- trending posts */

export type RailPost = { id: string; caption: string; like_count: number; comment_count: number; author: string };

export function useTrendingPosts() {
  return useQuery({
    queryKey: ["rail", "trending-posts"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<RailPost[]> => {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data } = await supabase
        .from("social_posts")
        .select("id, caption, like_count, comment_count, author_id")
        .eq("is_published", true)
        .gte("created_at", since)
        .order("like_count", { ascending: false })
        .limit(5);

      const rows = (data ?? []) as {
        id: string;
        caption: string | null;
        like_count: number;
        comment_count: number;
        author_id: string;
      }[];
      if (rows.length === 0) return [];

      const { data: people } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", Array.from(new Set(rows.map((row) => row.author_id))));
      const names = new Map((people ?? []).map((row) => [row.user_id as string, row.full_name as string]));

      return rows.map((row) => ({
        id: row.id,
        caption: row.caption ?? "",
        like_count: row.like_count ?? 0,
        comment_count: row.comment_count ?? 0,
        author: names.get(row.author_id) ?? "ASH member",
      }));
    },
  });
}

/* --------------------------------------------------------------- location */

export type RailPlace = { latitude: number; longitude: number; city: string; country: string; countryCode: string };

const PLACE_KEY = "ash.rail.place";

/** Where the member is: remembered, then browser location, then Douala. */
export function useRailPlace() {
  return useQuery({
    queryKey: ["rail", "place"],
    staleTime: 6 * 60 * 60_000,
    queryFn: async (): Promise<RailPlace> => {
      const fallback: RailPlace = {
        latitude: 4.0511,
        longitude: 9.7679,
        city: "Douala",
        country: "Cameroon",
        countryCode: "CM",
      };

      const cached = typeof window !== "undefined" ? window.localStorage.getItem(PLACE_KEY) : null;
      if (cached) {
        try {
          return JSON.parse(cached) as RailPlace;
        } catch {
          /* ignore a damaged cache */
        }
      }

      const coords = await new Promise<GeolocationCoordinates | null>((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
        navigator.permissions
          ?.query({ name: "geolocation" as PermissionName })
          .then((status) => {
            if (status.state !== "granted") return resolve(null);
            navigator.geolocation.getCurrentPosition(
              (position) => resolve(position.coords),
              () => resolve(null),
              { timeout: 6000, maximumAge: 30 * 60_000 },
            );
          })
          .catch(() => resolve(null));
      });

      if (!coords) return fallback;

      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`,
        );
        const json = (await response.json()) as { city?: string; locality?: string; countryName?: string; countryCode?: string };
        const place: RailPlace = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: json.city || json.locality || fallback.city,
          country: json.countryName || fallback.country,
          countryCode: json.countryCode || fallback.countryCode,
        };
        window.localStorage.setItem(PLACE_KEY, JSON.stringify(place));
        return place;
      } catch {
        return { ...fallback, latitude: coords.latitude, longitude: coords.longitude };
      }
    },
  });
}

/* ---------------------------------------------------------------- weather */

export type RailWeather = { temperature: number; code: number; high: number; low: number };

export function useWeather(place: RailPlace | undefined) {
  return useQuery({
    queryKey: ["rail", "weather", place?.latitude, place?.longitude],
    enabled: Boolean(place),
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<RailWeather | null> => {
      if (!place) return null;
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`,
      );
      if (!response.ok) return null;
      const json = (await response.json()) as {
        current?: { temperature_2m?: number; weather_code?: number };
        daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
      };
      if (typeof json.current?.temperature_2m !== "number") return null;
      return {
        temperature: Math.round(json.current.temperature_2m),
        code: json.current.weather_code ?? 0,
        high: Math.round(json.daily?.temperature_2m_max?.[0] ?? json.current.temperature_2m),
        low: Math.round(json.daily?.temperature_2m_min?.[0] ?? json.current.temperature_2m),
      };
    },
  });
}

/** Plain-language weather label for an Open-Meteo WMO code. */
export function weatherLabel(code: number, fr: boolean): string {
  if (code === 0) return fr ? "Ciel dégagé" : "Clear sky";
  if (code <= 3) return fr ? "Partiellement nuageux" : "Partly cloudy";
  if (code <= 48) return fr ? "Brouillard" : "Fog";
  if (code <= 57) return fr ? "Bruine" : "Drizzle";
  if (code <= 67) return fr ? "Pluie" : "Rain";
  if (code <= 77) return fr ? "Neige" : "Snow";
  if (code <= 82) return fr ? "Averses" : "Showers";
  if (code <= 86) return fr ? "Averses de neige" : "Snow showers";
  return fr ? "Orage" : "Thunderstorm";
}
