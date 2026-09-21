import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { directory, type DirectoryProfile } from "@/lib/public-profiles";
import { trackEvent } from "./activity";

const db = supabase as unknown as { from: (table: string) => any };
export const CAMPUS_BUCKET = "campus-verification";

export type CampusApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ADDITIONAL_INFORMATION_REQUIRED"
  | "APPROVED"
  | "REJECTED";

export type CampusCatalogueKind = "SUBJECT" | "LANGUAGE" | "EXAM" | "SKILL" | "LEVEL";

export type CampusSubject = {
  id: string;
  category: string;
  kind: CampusCatalogueKind;
  name_en: string;
  name_fr: string;
  sort_order: number;
  is_active?: boolean;
};

export type CampusQualification = {
  id: string;
  kind: string;
  title: string;
  institution: string;
  completed_year: number | null;
};

export type CampusAvailability = {
  id: string;
  day_of_week: number;
  part_of_day: "MORNING" | "AFTERNOON" | "EVENING";
};

export type CampusInstructor = {
  id: string;
  user_id: string;
  provider_id: string | null;
  display_name: string;
  headline: string;
  bio: string;
  methodology: string;
  subjects: string[];
  levels: string[];
  languages: string[];
  teaching_modes: string[];
  instructor_types: string[];
  exams: string[];
  skills: string[];
  language_levels: { language?: string; level?: string }[];
  timezone: string | null;
  country: string | null;
  city: string | null;
  areas_served: string;
  years_experience: number;
  hourly_from: number | null;
  currency: string;
  is_active: boolean;
  is_verified: boolean;
  approved_at: string;
  profile?: DirectoryProfile | null;
  rating_avg?: number | null;
  rating_count?: number | null;
};

export type CampusApplication = {
  id: string;
  user_id: string;
  legal_full_name: string;
  display_name: string;
  country: string;
  city: string | null;
  headline: string;
  bio: string;
  methodology: string;
  teaching_experience: string;
  subjects: string[];
  levels: string[];
  languages: string[];
  teaching_modes: string[];
  instructor_types: string[];
  exams: string[];
  skills: string[];
  language_levels: { language?: string; level?: string }[];
  timezone: string | null;
  areas_served: string;
  years_experience: number;
  hourly_from: number | null;
  currency: string;
  qualifications: { kind?: string; title?: string; institution?: string; year?: string }[];
  availability: { day?: number; part?: string }[];
  status: CampusApplicationStatus;
  admin_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

export const CAMPUS_LEVELS = [
  "PRIMARY",
  "GCE_O_LEVEL",
  "GCE_A_LEVEL",
  "HND",
  "UNIVERSITY",
  "PROFESSIONAL",
  "OTHER",
] as const;

export const CAMPUS_MODES = ["ONLINE", "IN_PERSON"] as const;

export const CAMPUS_PARTS = ["MORNING", "AFTERNOON", "EVENING"] as const;

export function levelLabel(level: string, fr: boolean) {
  const map: Record<string, [string, string]> = {
    PRIMARY: ["Primary", "Primaire"],
    GCE_O_LEVEL: ["GCE O/L", "GCE O/L"],
    GCE_A_LEVEL: ["GCE A/L", "GCE A/L"],
    HND: ["HND", "HND"],
    UNIVERSITY: ["University", "Université"],
    PROFESSIONAL: ["Professional", "Professionnel"],
    OTHER: ["Other", "Autre"],
  };
  const entry = map[level] ?? [level, level];
  return fr ? entry[1] : entry[0];
}

export function modeLabel(mode: string, fr: boolean) {
  if (mode === "ONLINE") return fr ? "En ligne" : "Online";
  if (mode === "IN_PERSON") return fr ? "En présentiel" : "In-person";
  return mode;
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function useCampusSubjects() {
  return useQuery({
    queryKey: ["campus", "subjects"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<CampusSubject[]> => {
      const { data, error } = await db
        .from("campus_subjects")
        .select("id,category,name_en,name_fr,sort_order")
        .eq("is_active", true)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CampusSubject[];
    },
  });
}

export type InstructorFilters = {
  term?: string;
  level?: string;
  mode?: string;
  city?: string;
  language?: string;
  sort?: "relevance" | "experience" | "price";
};

async function decorate(rows: CampusInstructor[]): Promise<CampusInstructor[]> {
  if (rows.length === 0) return rows;
  const userIds = rows.map((row) => row.user_id);
  const providerIds = rows.map((row) => row.provider_id).filter(Boolean) as string[];
  const [{ data: people }, providers] = await Promise.all([
    directory().select("*").in("user_id", userIds),
    providerIds.length
      ? db.from("provider_profiles").select("id,rating_avg,rating_count").in("id", providerIds)
      : Promise.resolve({ data: [] }),
  ]);
  const byUser = new Map<string, DirectoryProfile>((people ?? []).map((p: DirectoryProfile) => [p.user_id, p]));
  const byProvider = new Map<string, { rating_avg: number; rating_count: number }>(
    ((providers as { data?: { id: string; rating_avg: number; rating_count: number }[] }).data ?? []).map((p) => [
      p.id,
      { rating_avg: p.rating_avg, rating_count: p.rating_count },
    ]),
  );
  return rows.map((row) => {
    const rating = row.provider_id ? byProvider.get(row.provider_id) : undefined;
    return {
      ...row,
      profile: byUser.get(row.user_id) ?? null,
      rating_avg: rating?.rating_avg ?? null,
      rating_count: rating?.rating_count ?? null,
    };
  });
}

export function useInstructors(filters: InstructorFilters) {
  return useQuery({
    queryKey: ["campus", "instructors", filters],
    queryFn: async (): Promise<CampusInstructor[]> => {
      let query = db.from("campus_instructor_profiles").select("*").eq("is_active", true);
      const term = (filters.term ?? "").trim();
      if (term.length >= 2) {
        query = query.or(
          `display_name.ilike.%${term}%,headline.ilike.%${term}%,bio.ilike.%${term}%,areas_served.ilike.%${term}%`,
        );
      }
      if (filters.level) query = query.contains("levels", [filters.level]);
      if (filters.mode) query = query.contains("teaching_modes", [filters.mode]);
      if (filters.language) query = query.contains("languages", [filters.language]);
      if (filters.city) query = query.ilike("city", `%${filters.city}%`);
      if (filters.sort === "price") query = query.order("hourly_from", { ascending: true, nullsFirst: false });
      else query = query.order("years_experience", { ascending: false });
      const { data, error } = await query.limit(40);
      if (error) throw error;
      let rows = (data ?? []) as CampusInstructor[];
      if (term.length >= 2) {
        const needle = term.toLowerCase();
        const matchesSubject = rows.filter((row) =>
          row.subjects.some((subject) => subject.toLowerCase().includes(needle)),
        );
        const ids = new Set(rows.map((row) => row.id));
        const { data: bySubject } = await db
          .from("campus_instructor_profiles")
          .select("*")
          .eq("is_active", true)
          .overlaps("subjects", [term])
          .limit(20);
        for (const row of (bySubject ?? []) as CampusInstructor[]) {
          if (!ids.has(row.id)) {
            rows.push(row);
            ids.add(row.id);
          }
        }
        void matchesSubject;
      }
      return decorate(rows);
    },
  });
}

export function useInstructor(instructorId: string) {
  return useQuery({
    queryKey: ["campus", "instructor", instructorId],
    enabled: Boolean(instructorId),
    queryFn: async (): Promise<CampusInstructor | null> => {
      const { data, error } = await db
        .from("campus_instructor_profiles")
        .select("*")
        .eq("id", instructorId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [row] = await decorate([data as CampusInstructor]);
      return row ?? null;
    },
  });
}

export function useInstructorDetails(instructorId: string) {
  return useQuery({
    queryKey: ["campus", "instructor-details", instructorId],
    enabled: Boolean(instructorId),
    queryFn: async () => {
      const [{ data: qualifications }, { data: availability }] = await Promise.all([
        db
          .from("campus_instructor_qualifications")
          .select("id,kind,title,institution,completed_year")
          .eq("instructor_id", instructorId),
        db
          .from("campus_instructor_availability")
          .select("id,day_of_week,part_of_day")
          .eq("instructor_id", instructorId)
          .order("day_of_week"),
      ]);
      return {
        qualifications: (qualifications ?? []) as CampusQualification[],
        availability: (availability ?? []) as CampusAvailability[],
      };
    },
  });
}

export function useMyInstructorProfile() {
  return useQuery({
    queryKey: ["campus", "my-instructor"],
    queryFn: async (): Promise<CampusInstructor | null> => {
      const userId = await currentUserId();
      if (!userId) return null;
      const { data } = await db.from("campus_instructor_profiles").select("*").eq("user_id", userId).maybeSingle();
      return (data as CampusInstructor) ?? null;
    },
  });
}

export function useMyCampusApplication() {
  return useQuery({
    queryKey: ["campus", "my-application"],
    queryFn: async (): Promise<CampusApplication | null> => {
      const userId = await currentUserId();
      if (!userId) return null;
      const { data } = await db
        .from("campus_instructor_applications")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return (data as CampusApplication) ?? null;
    },
  });
}

async function uploadCampusDocument(userId: string, file: File, kind: string) {
  const extension = (file.name.split(".").pop() ?? "bin").toLowerCase().slice(0, 8);
  const path = `${userId}/${kind}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(CAMPUS_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  return path;
}

export type CampusApplicationInput = {
  legalFullName: string;
  displayName: string;
  country: string;
  city: string;
  dateOfBirth: string;
  headline: string;
  bio: string;
  methodology: string;
  teachingExperience: string;
  subjects: string[];
  levels: string[];
  languages: string[];
  teachingModes: string[];
  areasServed: string;
  yearsExperience: number;
  hourlyFrom: number | null;
  currency: string;
  qualifications: { kind: string; title: string; institution: string; year: string }[];
  availability: { day: number; part: string }[];
  identityDocument: File | null;
  qualificationDocument: File | null;
  declarationsAccepted: boolean;
};

export function useSubmitCampusApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CampusApplicationInput) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      if (!input.declarationsAccepted) throw new Error("Please accept the declaration before submitting.");
      if (!input.identityDocument) throw new Error("Please attach an identity document.");
      if (input.subjects.length === 0) throw new Error("Please choose at least one subject.");
      if (input.levels.length === 0) throw new Error("Please choose at least one education level.");

      const uploaded: string[] = [];
      try {
        const identityPath = await uploadCampusDocument(userId, input.identityDocument, "identity");
        uploaded.push(identityPath);
        let qualificationPath: string | null = null;
        if (input.qualificationDocument) {
          qualificationPath = await uploadCampusDocument(userId, input.qualificationDocument, "qualification");
          uploaded.push(qualificationPath);
        }

        const payload = {
          user_id: userId,
          legal_full_name: input.legalFullName.trim(),
          display_name: input.displayName.trim(),
          country: input.country.trim(),
          city: input.city.trim() || null,
          date_of_birth: input.dateOfBirth || null,
          headline: input.headline.trim(),
          bio: input.bio.trim(),
          methodology: input.methodology.trim(),
          teaching_experience: input.teachingExperience.trim(),
          subjects: input.subjects,
          levels: input.levels,
          languages: input.languages,
          teaching_modes: input.teachingModes,
          areas_served: input.areasServed.trim(),
          years_experience: Math.max(0, Math.min(60, Math.round(input.yearsExperience))),
          hourly_from: input.hourlyFrom,
          currency: input.currency,
          qualifications: input.qualifications,
          availability: input.availability,
          identity_document_path: identityPath,
          qualification_document_path: qualificationPath,
          status: "SUBMITTED" as const,
        };

        const existing = await db
          .from("campus_instructor_applications")
          .select("id,status")
          .eq("user_id", userId)
          .maybeSingle();

        if (existing.data?.id) {
          const { error } = await db
            .from("campus_instructor_applications")
            .update(payload)
            .eq("id", existing.data.id);
          if (error) throw error;
        } else {
          const { error } = await db.from("campus_instructor_applications").insert(payload);
          if (error) throw error;
        }
      } catch (error) {
        if (uploaded.length) await supabase.storage.from(CAMPUS_BUCKET).remove(uploaded);
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campus", "my-application"] });
    },
  });
}

export function useUpdateMyInstructorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pick<CampusInstructor, "headline" | "bio" | "methodology" | "is_active" | "hourly_from" | "city" | "areas_served">>) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      const { error } = await db.from("campus_instructor_profiles").update(input).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campus"] });
    },
  });
}

/** Record that a member opened an instructor page (privacy-safe activity signal). */
export function trackInstructorView(instructorId: string, subjects: string[]) {
  trackEvent({
    event_type: "profile_view",
    surface: "other",
    target_type: "campus_instructor",
    target_id: instructorId,
    category: subjects[0] ?? null,
  });
}
