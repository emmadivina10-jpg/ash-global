import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AvailableVendor = {
  id: string;
  user_id: string;
  business_name: string;
  avatar_url: string | null;
};

const PAGE_SIZE = 100;

/** Reuse existing storefront visibility; presence never determines inclusion. */
export async function fetchAvailableVendors(country: string | null): Promise<AvailableVendor[]> {
  const vendors: AvailableVendor[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("provider_profiles")
      .select("id, user_id, business_name, avatar_url")
      .eq("is_live", true);
    if (country) query = query.eq("country", country);
    const { data, error } = await query
      .order("business_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    vendors.push(...page);
    if (page.length < PAGE_SIZE) return vendors;
  }
}

export function useAvailableVendors(country: string | null, userId: string | undefined) {
  return useQuery({
    queryKey: ["available-vendors", userId, country],
    enabled: Boolean(userId),
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: () => fetchAvailableVendors(country),
  });
}