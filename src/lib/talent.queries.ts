import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_PROVIDER_COLUMNS } from "@/lib/provider-public-columns";
import type { Database } from "@/integrations/supabase/types";

export const TALENT_ROLES = [
  {
    id: "drummer",
    en: "Drummers",
    fr: "Batteurs",
    terms: ["drummer", "drums", "batteur", "batterie"],
  },
  { id: "pianist", en: "Pianists", fr: "Pianistes", terms: ["pianist", "pianiste", "piano"] },
  { id: "keyboardist", en: "Keyboardists", fr: "Claviéristes", terms: ["keyboard", "clavier"] },
  { id: "bassist", en: "Bassists", fr: "Bassistes", terms: ["bassist", "bassiste", "bass player"] },
  {
    id: "guitarist",
    en: "Guitarists",
    fr: "Guitaristes",
    terms: ["guitarist", "guitariste", "guitar", "guitare"],
  },
  {
    id: "vocalist",
    en: "Vocalists",
    fr: "Chanteurs",
    terms: ["vocalist", "singer", "chant", "chanteur", "chanteuse"],
  },
  { id: "soloist", en: "Soloists", fr: "Solistes", terms: ["soloist", "soliste"] },
  { id: "dj", en: "DJs", fr: "DJs", terms: ["dj", "disc jockey"] },
  { id: "saxophonist", en: "Saxophonists", fr: "Saxophonistes", terms: ["saxophon"] },
  {
    id: "director",
    en: "Music directors",
    fr: "Directeurs musicaux",
    terms: ["music director", "directeur musical", "directrice musicale"],
  },
] as const;

export type TalentRole = (typeof TALENT_ROLES)[number]["id"] | "all";
type ProviderRow = Database["public"]["Tables"]["provider_profiles"]["Row"];
export type TalentProvider = Pick<
  ProviderRow,
  | "id"
  | "business_name"
  | "bio"
  | "city"
  | "avatar_url"
  | "is_verified"
  | "accepting_bookings"
  | "rating_avg"
  | "rating_count"
>;

const ALL_TERMS = [
  "music",
  "musique",
  "musicien",
  "musician",
  ...TALENT_ROLES.flatMap((role) => role.terms),
];

/** Search real storefront names, descriptions and active services; no musician identities are invented. */
export function useTalentProviders(country: string | null, city: string, role: TalentRole) {
  return useQuery({
    queryKey: ["talent-providers", country, city, role],
    staleTime: 30_000,
    queryFn: async (): Promise<TalentProvider[]> => {
      const terms: readonly string[] =
        role === "all" ? ALL_TERMS : (TALENT_ROLES.find((item) => item.id === role)?.terms ?? []);
      const conditions = (fields: string[]) =>
        terms.flatMap((term) => fields.map((field) => `${field}.ilike.%${term}%`)).join(",");
      const servicesQuery = supabase
        .from("provider_services")
        .select("provider_id")
        .eq("is_active", true)
        .or(conditions(["title", "description"]))
        .limit(100);
      let providersQuery = supabase
        .from("provider_profiles")
        .select(PUBLIC_PROVIDER_COLUMNS)
        .eq("is_live", true)
        .or(conditions(["business_name", "bio"]))
        .limit(60);
      if (country) providersQuery = providersQuery.eq("country", country);
      if (city.trim())
        providersQuery = providersQuery.ilike("city", `%${city.trim().replace(/[%_,]/g, "")}%`);
      const [profiles, services] = await Promise.all([providersQuery, servicesQuery]);
      if (profiles.error) throw profiles.error;
      if (services.error) throw services.error;
      const ids = [...new Set((services.data ?? []).map((item) => item.provider_id))];
      let serviceProviders: TalentProvider[] = [];
      if (ids.length) {
        let query = supabase
          .from("provider_profiles")
          .select(PUBLIC_PROVIDER_COLUMNS)
          .eq("is_live", true)
          .in("id", ids);
        if (country) query = query.eq("country", country);
        if (city.trim()) query = query.ilike("city", `%${city.trim().replace(/[%_,]/g, "")}%`);
        const result = await query.limit(60);
        if (result.error) throw result.error;
        serviceProviders = (result.data ?? []) as unknown as TalentProvider[];
      }
      let djProviders: TalentProvider[] = [];
      if (role === "all" || role === "dj") {
        let query = supabase
          .from("provider_profiles")
          .select(PUBLIC_PROVIDER_COLUMNS)
          .eq("is_live", true)
          .contains("categories", ["DJ"]);
        if (country) query = query.eq("country", country);
        if (city.trim()) query = query.ilike("city", `%${city.trim().replace(/[%_,]/g, "")}%`);
        const result = await query.limit(60);
        if (result.error) throw result.error;
        djProviders = (result.data ?? []) as unknown as TalentProvider[];
      }
      const merged = [
        ...((profiles.data ?? []) as unknown as TalentProvider[]),
        ...serviceProviders,
        ...djProviders,
      ];
      return [
        ...new Map(
          merged
            .filter((provider) => provider.business_name?.trim())
            .map((provider) => [provider.id, provider]),
        ).values(),
      ].sort(
        (a, b) => Number(b.is_verified) - Number(a.is_verified) || b.rating_count - a.rating_count,
      );
    },
  });
}
