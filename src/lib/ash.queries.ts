/**
 * Client-side reads for the four new ASH pillars:
 * Freelance, Deals, Promotions and Events.
 *
 * Everything here goes through the browser Supabase client, so row level
 * security decides what a member can actually see.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Deal = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  original_price: number;
  deal_price: number;
  city: string | null;
  country: string;
  starts_at: string;
  ends_at: string;
  claim_limit: number;
  claimed_count: number;
  is_active: boolean;
};

export type AshEvent = {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  category: string;
  venue: string | null;
  city: string | null;
  country: string;
  starts_at: string;
  ends_at: string | null;
  is_free: boolean;
  ticket_price: number;
  ticket_capacity: number;
  tickets_sold: number;
  is_published: boolean;
};

export type FreelancerProfile = {
  id: string;
  user_id: string;
  headline: string;
  bio: string | null;
  skills: string[];
  categories: string[];
  city: string | null;
  country: string;
  hourly_rate: number | null;
  starting_price: number;
  availability: string;
  years_experience: number;
  is_published: boolean;
  rating_avg: number;
  rating_count: number;
  completed_projects: number;
};

export type FreelanceProject = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline_days: number;
  skills: string[];
  location_type: string;
  city: string | null;
  status: string;
  proposals_count: number;
  awarded_user_id: string | null;
  created_at: string;
};

export type Proposal = {
  id: string;
  project_id: string;
  freelancer_id: string;
  cover_letter: string;
  amount: number;
  delivery_days: number;
  status: string;
  created_at: string;
};

export function discountPercent(deal: Pick<Deal, "original_price" | "deal_price">): number {
  if (!deal.original_price || deal.original_price <= deal.deal_price) return 0;
  return Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100);
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ------------------------------- deals ---------------------------------- */

export function useDeals(city?: string | null) {
  return useQuery({
    queryKey: ["deals", city ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select("*")
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(60);
      if (city) query = query.eq("city", city);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Deal[];
    },
  });
}

export function useMyDeals() {
  return useQuery({
    queryKey: ["deals", "mine"],
    queryFn: async () => {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Deal[];
    },
  });
}

export function useMyClaims() {
  return useQuery({
    queryKey: ["deal-claims", "mine"],
    queryFn: async () => {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("deal_claims")
        .select("id, code, status, claimed_at, deal:deals(id, title, deal_price, ends_at, city)")
        .eq("user_id", uid)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ------------------------------- events --------------------------------- */

export function useEvents(city?: string | null) {
  return useQuery({
    queryKey: ["events", city ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .gte("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString())
        .order("starts_at", { ascending: true })
        .limit(60);
      if (city) query = query.eq("city", city);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AshEvent[];
    },
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as AshEvent | null;
    },
  });
}

export function useMyTickets() {
  return useQuery({
    queryKey: ["event-tickets", "mine"],
    queryFn: async () => {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("event_tickets")
        .select("id, code, quantity, amount, status, created_at, event:events(id, title, starts_at, venue, city)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ----------------------------- freelance -------------------------------- */

export function useFreelancers(search?: string) {
  return useQuery({
    queryKey: ["freelancers", search ?? ""],
    queryFn: async () => {
      let query = supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("is_published", true)
        .order("rating_avg", { ascending: false })
        .limit(60);
      if (search) query = query.ilike("headline", `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as FreelancerProfile[];
    },
  });
}

export function useMyFreelancerProfile() {
  return useQuery({
    queryKey: ["freelancer-profile", "mine"],
    queryFn: async () => {
      const uid = await currentUserId();
      if (!uid) return null;
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as FreelancerProfile | null;
    },
  });
}

export function useProjects(status = "OPEN") {
  return useQuery({
    queryKey: ["freelance-projects", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelance_projects")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as FreelanceProject[];
    },
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["freelance-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelance_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as FreelanceProject | null;
    },
  });
}

export function useProposals(projectId: string) {
  return useQuery({
    queryKey: ["freelance-proposals", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelance_proposals")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Proposal[];
    },
  });
}

export function useMyProjects() {
  return useQuery({
    queryKey: ["freelance-projects", "mine"],
    queryFn: async () => {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("freelance_projects")
        .select("*")
        .eq("client_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FreelanceProject[];
    },
  });
}

export function useMyProposals() {
  return useQuery({
    queryKey: ["freelance-proposals", "mine"],
    queryFn: async () => {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("freelance_proposals")
        .select("*, project:freelance_projects(id, title, budget, status)")
        .eq("freelancer_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ----------------------------- promotions -------------------------------- */

export function useActivePromotions(targetType?: string) {
  return useQuery({
    queryKey: ["promotions", targetType ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("promotions")
        .select("id, headline, target_type, target_id, city, category, ends_at")
        .eq("status", "ACTIVE")
        .gt("ends_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(12);
      if (targetType) query = query.eq("target_type", targetType);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyPromotions() {
  return useQuery({
    queryKey: ["promotions", "mine"],
    queryFn: async () => {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("promotions")
        .select(
          "id, owner_id, target_type, target_id, headline, plan, amount, currency, city, category, status, starts_at, ends_at, impressions, clicks, created_at, updated_at",
        )
        .eq("owner_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* --------------------------- universal search ---------------------------- */

export type SearchBuckets = {
  freelancers: FreelancerProfile[];
  projects: FreelanceProject[];
  deals: Deal[];
  events: AshEvent[];
  providers: Array<{ id: string; business_name: string; city: string | null; slug: string | null; rating_avg: number }>;
  services: Array<{ id: string; title: string; price: number; provider_id: string; category: string }>;
  properties: Array<{
    id: string;
    title: string;
    category: string;
    city: string;
    neighborhood: string | null;
    price: number;
    currency: string;
    price_period: string | null;
  }>;
  instructors: Array<{
    id: string;
    display_name: string;
    headline: string;
    subjects: string[];
    city: string | null;
    hourly_from: number | null;
    currency: string;
  }>;
};

export function useUniversalSearch(term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: ["universal-search", q],
    enabled: q.length >= 2,
    queryFn: async (): Promise<SearchBuckets> => {
      const like = `%${q}%`;
      const nowIso = new Date().toISOString();
      const [freelancers, projects, deals, events, providers, services, properties] = await Promise.all([
        supabase.from("freelancer_profiles").select("*").eq("is_published", true).or(`headline.ilike.${like},bio.ilike.${like}`).limit(12),
        supabase.from("freelance_projects").select("*").eq("status", "OPEN").or(`title.ilike.${like},description.ilike.${like}`).limit(12),
        supabase.from("deals").select("*").eq("is_active", true).gt("ends_at", new Date().toISOString()).ilike("title", like).limit(12),
        supabase.from("events").select("*").eq("is_published", true).or(`title.ilike.${like},venue.ilike.${like}`).limit(12),
        supabase.from("provider_profiles").select("id, business_name, city, slug, rating_avg").eq("is_live", true).ilike("business_name", like).limit(12),
        supabase.from("provider_services").select("id, title, price, provider_id, category").eq("is_active", true).ilike("title", like).limit(12),
        supabase
          .from("property_listings")
          .select("id, title, category, city, neighborhood, price, currency, price_period")
          .eq("status", "ACTIVE")
          .gt("expires_at", nowIso)
          .or(`title.ilike.${like},description.ilike.${like},city.ilike.${like},neighborhood.ilike.${like},university.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      return {
        freelancers: (freelancers.data ?? []) as unknown as FreelancerProfile[],
        projects: (projects.data ?? []) as unknown as FreelanceProject[],
        deals: (deals.data ?? []) as unknown as Deal[],
        events: (events.data ?? []) as unknown as AshEvent[],
        providers: (providers.data ?? []) as SearchBuckets["providers"],
        services: (services.data ?? []) as unknown as SearchBuckets["services"],
        properties: (properties.data ?? []) as unknown as SearchBuckets["properties"],
      };
    },
  });
}
