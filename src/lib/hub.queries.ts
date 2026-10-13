/**
 * ASH Hub — articles & publishing, job postings with in-app applications,
 * and the ASH Mentors board. Everything here talks to the ASH backend under RLS.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { verifyMediaFiles } from "./media-safety";
import { SPOTLIGHT_BUCKET, SPOTLIGHT_MAX_BYTES } from "./spotlight.queries";
import { directory } from "@/lib/public-profiles";

export type HubAuthor = { id: string; name: string; avatar_url: string | null };

export const ARTICLE_CATEGORIES = [
  { key: "GENERAL", en: "General", fr: "Général" },
  { key: "BUSINESS", en: "Business", fr: "Business" },
  { key: "TECH", en: "Tech", fr: "Tech" },
  { key: "BEAUTY", en: "Beauty", fr: "Beauté" },
  { key: "CAREER", en: "Career", fr: "Carrière" },
  { key: "MONEY", en: "Money", fr: "Finances" },
  { key: "COMMUNITY", en: "Community", fr: "Communauté" },
] as const;

export const EMPLOYMENT_TYPES = [
  { key: "FULL_TIME", en: "Full-time", fr: "Temps plein" },
  { key: "PART_TIME", en: "Part-time", fr: "Temps partiel" },
  { key: "CONTRACT", en: "Contract", fr: "Contrat" },
  { key: "INTERNSHIP", en: "Internship", fr: "Stage" },
  { key: "GIG", en: "Gig", fr: "Mission" },
] as const;

export const LOCATION_TYPES = [
  { key: "ONSITE", en: "On-site", fr: "Sur place" },
  { key: "HYBRID", en: "Hybrid", fr: "Hybride" },
  { key: "REMOTE", en: "Remote", fr: "À distance" },
] as const;

async function loadAuthors(ids: string[]): Promise<Record<string, HubAuthor>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data } = await directory().select("user_id, full_name, avatar_url").in("user_id", unique);
  const map: Record<string, HubAuthor> = {};
  for (const row of data ?? []) {
    map[row.user_id] = {
      id: row.user_id,
      name: row.full_name || "Profile unavailable",
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

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("SIGNED_OUT");
  return id;
}

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */

export type Article = {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: string;
  tags: string[];
  cover_url: string | null;
  like_count: number;
  created_at: string;
  author: HubAuthor;
  liked: boolean;
  is_mine: boolean;
};

export function useArticles(category: string = "ALL", limit = 40) {
  return useQuery({
    queryKey: ["hub-articles", category, limit],
    staleTime: 15_000,
    queryFn: async (): Promise<Article[]> => {
      let query = supabase
        .from("articles")
        .select(
          "id, author_id, title, excerpt, body, category, tags, cover_path, like_count, created_at",
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (category !== "ALL") query = query.eq("category", category);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];

      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id ?? null;
      const [authors, covers, likes] = await Promise.all([
        loadAuthors(rows.map((r) => r.author_id)),
        signImages(rows.map((r) => r.cover_path ?? "").filter(Boolean)),
        me
          ? supabase
              .from("article_likes")
              .select("article_id")
              .eq("user_id", me)
              .in(
                "article_id",
                rows.map((r) => r.id),
              )
          : Promise.resolve({ data: [] as { article_id: string }[] }),
      ]);
      const likedSet = new Set(
        ((likes as { data?: { article_id: string }[] }).data ?? []).map((l) => l.article_id),
      );

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        excerpt: row.excerpt,
        body: row.body,
        category: row.category,
        tags: row.tags ?? [],
        cover_url: row.cover_path ? (covers[row.cover_path] ?? null) : null,
        like_count: row.like_count ?? 0,
        created_at: row.created_at,
        author: authors[row.author_id] ?? {
          id: row.author_id,
          name: "Profile unavailable",
          avatar_url: null,
        },
        liked: likedSet.has(row.id),
        is_mine: row.author_id === me,
      }));
    },
  });
}

export function useArticle(articleId: string | null) {
  return useQuery({
    queryKey: ["hub-article", articleId],
    enabled: Boolean(articleId),
    queryFn: async (): Promise<Article | null> => {
      if (!articleId) return null;
      const { data, error } = await supabase
        .from("articles")
        .select(
          "id, author_id, title, excerpt, body, category, tags, cover_path, like_count, created_at",
        )
        .eq("id", articleId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id ?? null;
      const [authors, covers] = await Promise.all([
        loadAuthors([data.author_id]),
        signImages(data.cover_path ? [data.cover_path] : []),
      ]);
      let liked = false;
      if (me) {
        const { data: like } = await supabase
          .from("article_likes")
          .select("id")
          .eq("article_id", data.id)
          .eq("user_id", me)
          .maybeSingle();
        liked = Boolean(like);
      }
      return {
        id: data.id,
        title: data.title,
        excerpt: data.excerpt,
        body: data.body,
        category: data.category,
        tags: data.tags ?? [],
        cover_url: data.cover_path ? (covers[data.cover_path] ?? null) : null,
        like_count: data.like_count ?? 0,
        created_at: data.created_at,
        author: authors[data.author_id] ?? {
          id: data.author_id,
          name: "Profile unavailable",
          avatar_url: null,
        },
        liked,
        is_mine: data.author_id === me,
      };
    },
  });
}

export function usePublishArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      excerpt: string;
      body: string;
      category: string;
      tags: string[];
      cover?: File | null;
    }) => {
      const userId = await currentUserId();
      let coverPath: string | null = null;
      const articleId = crypto.randomUUID();
      if (input.cover) {
        await verifyMediaFiles([input.cover], "ARTICLE_COVER");
        if (input.cover.size > SPOTLIGHT_MAX_BYTES) throw new Error("FILE_TOO_LARGE");
        const ext = input.cover.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/article/${articleId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(SPOTLIGHT_BUCKET)
          .upload(path, input.cover, { upsert: false, contentType: input.cover.type });
        if (uploadError) throw uploadError;
        coverPath = path;
      }
      const { data, error } = await supabase
        .from("articles")
        .insert({
          id: articleId,
          author_id: userId,
          title: input.title.trim(),
          excerpt: input.excerpt.trim() || null,
          body: input.body.trim(),
          category: input.category,
          tags: input.tags,
          cover_path: coverPath,
        })
        .select("id")
        .single();
      if (error) {
        if (coverPath) await supabase.storage.from(SPOTLIGHT_BUCKET).remove([coverPath]);
        throw error;
      }
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hub-articles"] }),
  });
}

export function useToggleArticleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { articleId: string; liked: boolean }) => {
      const userId = await currentUserId();
      if (input.liked) {
        const { error } = await supabase
          .from("article_likes")
          .delete()
          .eq("article_id", input.articleId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("article_likes")
          .insert({ article_id: input.articleId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["hub-articles"] });
      void queryClient.invalidateQueries({ queryKey: ["hub-article", vars.articleId] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Jobs                                                                */
/* ------------------------------------------------------------------ */

export type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  category: string;
  employment_type: string;
  location_type: string;
  city: string | null;
  country: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  apply_deadline: string | null;
  is_open: boolean;
  applications_count: number;
  created_at: string;
  image_path: string | null;
  image_url: string | null;
  poster: HubAuthor;
  is_mine: boolean;
};

export function useJobs(
  filters: { employmentType?: string; locationType?: string; search?: string } = {},
) {
  return useQuery({
    queryKey: ["hub-jobs", filters],
    staleTime: 15_000,
    queryFn: async (): Promise<Job[]> => {
      let query = supabase
        .from("jobs")
        .select(
          "id, poster_id, title, company, description, category, employment_type, location_type, city, country, salary_min, salary_max, currency, apply_deadline, is_open, applications_count, created_at, image_path",
        )
        .eq("is_open", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (filters.employmentType && filters.employmentType !== "ALL")
        query = query.eq("employment_type", filters.employmentType);
      if (filters.locationType && filters.locationType !== "ALL")
        query = query.eq("location_type", filters.locationType);
      if (filters.search?.trim())
        query = query.or(
          `title.ilike.%${filters.search.trim()}%,company.ilike.%${filters.search.trim()}%`,
        );
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id ?? null;
      const posters = await loadAuthors(rows.map((r) => r.poster_id));
      const imagePaths = rows
        .map((row) => row.image_path)
        .filter((path): path is string => Boolean(path));
      const { data: signed } = imagePaths.length
        ? await supabase.storage.from("job-images").createSignedUrls(imagePaths, 60 * 60)
        : { data: [] };
      const imageUrls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
      return rows.map((row) => ({
        ...row,
        image_url: row.image_path ? (imageUrls.get(row.image_path) ?? null) : null,
        poster: posters[row.poster_id] ?? {
          id: row.poster_id,
          name: "Profile unavailable",
          avatar_url: null,
        },
        is_mine: row.poster_id === me,
      })) as Job[];
    },
  });
}

export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: ["hub-job", jobId],
    enabled: Boolean(jobId),
    queryFn: async (): Promise<Job | null> => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, poster_id, title, company, description, category, employment_type, location_type, city, country, salary_min, salary_max, currency, apply_deadline, is_open, applications_count, created_at, image_path",
        )
        .eq("id", jobId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id ?? null;
      const posters = await loadAuthors([data.poster_id]);
      const imageUrl = data.image_path
        ? ((await supabase.storage.from("job-images").createSignedUrl(data.image_path, 60 * 60))
            .data?.signedUrl ?? null)
        : null;
      return {
        ...data,
        image_url: imageUrl,
        poster: posters[data.poster_id] ?? {
          id: data.poster_id,
          name: "Profile unavailable",
          avatar_url: null,
        },
        is_mine: data.poster_id === me,
      } as Job;
    },
  });
}

export function usePostJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      company: string;
      description: string;
      employment_type: string;
      location_type: string;
      city: string;
      salary_min: number | null;
      salary_max: number | null;
      apply_deadline: string | null;
      contact_email: string | null;
      imageFile?: File | null;
    }) => {
      const userId = await currentUserId();
      let imagePath: string | null = null;
      if (input.imageFile) {
        if (!input.imageFile.type.startsWith("image/"))
          throw new Error("Please choose an image file.");
        if (input.imageFile.size > 8 * 1024 * 1024)
          throw new Error("Image must be 8 MB or smaller.");
        await verifyMediaFiles([input.imageFile], "JOB_IMAGE");
        imagePath = `${userId}/${crypto.randomUUID()}.${input.imageFile.name.split(".").pop()?.toLowerCase() || "jpg"}`;
        const { error: uploadError } = await supabase.storage
          .from("job-images")
          .upload(imagePath, input.imageFile, { upsert: false });
        if (uploadError) throw uploadError;
      }
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          poster_id: userId,
          title: input.title.trim(),
          company: input.company.trim(),
          description: input.description.trim(),
          employment_type: input.employment_type,
          location_type: input.location_type,
          city: input.city.trim() || null,
          salary_min: input.salary_min,
          salary_max: input.salary_max,
          apply_deadline: input.apply_deadline,
          contact_email: input.contact_email,
          image_path: imagePath,
        })
        .select("id")
        .single();
      if (error) {
        if (imagePath) await supabase.storage.from("job-images").remove([imagePath]);
        throw error;
      }
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hub-jobs"] }),
  });
}

export async function openJobConversation(jobId: string): Promise<string> {
  const { data, error } = await supabase.rpc("open_job_conversation", { _job_id: jobId });
  if (error || !data) throw error ?? new Error("Could not open the job conversation.");
  return String(data);
}

export type JobApplication = {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string;
  contact_phone: string | null;
  status: string;
  created_at: string;
  applicant: HubAuthor;
};

/** Applications on one job — visible to the poster; the applicant sees their own. */
export function useJobApplications(jobId: string | null) {
  return useQuery({
    queryKey: ["hub-job-applications", jobId],
    enabled: Boolean(jobId),
    queryFn: async (): Promise<JobApplication[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("job_applications")
        .select("id, job_id, applicant_id, cover_letter, contact_phone, status, created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const people = await loadAuthors(rows.map((r) => r.applicant_id));
      return rows.map((row) => ({
        ...row,
        applicant: people[row.applicant_id] ?? {
          id: row.applicant_id,
          name: "Profile unavailable",
          avatar_url: null,
        },
      }));
    },
  });
}

export function useApplyToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { jobId: string; coverLetter: string; phone: string }) => {
      const userId = await currentUserId();
      const { error } = await supabase.from("job_applications").insert({
        job_id: input.jobId,
        applicant_id: userId,
        cover_letter: input.coverLetter.trim(),
        contact_phone: input.phone.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["hub-job-applications", vars.jobId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-job", vars.jobId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-jobs"] });
    },
  });
}

export function useSetApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; jobId: string; status: string }) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      queryClient.invalidateQueries({ queryKey: ["hub-job-applications", vars.jobId] }),
  });
}

/* ------------------------------------------------------------------ */
/* Mentors                                                             */
/* ------------------------------------------------------------------ */

export type Mentor = {
  id: string;
  user_id: string;
  headline: string;
  bio: string | null;
  skills: string[];
  availability: string;
  is_free: boolean;
  session_price: number;
  city: string | null;
  country: string;
  sessions_count: number;
  person: HubAuthor;
  is_mine: boolean;
};

export function useMentors() {
  return useQuery({
    queryKey: ["hub-mentors"],
    staleTime: 30_000,
    queryFn: async (): Promise<Mentor[]> => {
      const { data, error } = await supabase
        .from("mentors")
        .select(
          "id, user_id, headline, bio, skills, availability, is_free, session_price, city, country, sessions_count",
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id ?? null;
      const people = await loadAuthors(rows.map((r) => r.user_id));
      return rows.map((row) => ({
        ...row,
        skills: row.skills ?? [],
        person: people[row.user_id] ?? {
          id: row.user_id,
          name: "Profile unavailable",
          avatar_url: null,
        },
        is_mine: row.user_id === me,
      }));
    },
  });
}

export function useBecomeMentor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      headline: string;
      bio: string;
      skills: string[];
      availability: string;
      is_free: boolean;
      session_price: number;
      city: string;
    }) => {
      const userId = await currentUserId();
      const { error } = await supabase.from("mentors").upsert(
        {
          user_id: userId,
          headline: input.headline.trim(),
          bio: input.bio.trim() || null,
          skills: input.skills,
          availability: input.availability,
          is_free: input.is_free,
          session_price: input.is_free ? 0 : input.session_price,
          city: input.city.trim() || null,
          is_published: true,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hub-mentors"] }),
  });
}

export function useRequestMentor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { mentorId: string; topic: string; message: string }) => {
      const userId = await currentUserId();
      const { error } = await supabase.from("mentor_requests").insert({
        mentor_id: input.mentorId,
        requester_id: userId,
        topic: input.topic.trim(),
        message: input.message.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hub-mentor-requests"] }),
  });
}

export type MentorRequest = {
  id: string;
  mentor_id: string;
  requester_id: string;
  topic: string;
  message: string | null;
  status: string;
  created_at: string;
  person: HubAuthor;
};

/** Requests I received as a mentor, plus requests I sent. */
export function useMentorRequests() {
  return useQuery({
    queryKey: ["hub-mentor-requests"],
    queryFn: async (): Promise<MentorRequest[]> => {
      const { data, error } = await supabase
        .from("mentor_requests")
        .select("id, mentor_id, requester_id, topic, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = data ?? [];
      const people = await loadAuthors(rows.map((r) => r.requester_id));
      return rows.map((row) => ({
        ...row,
        person: people[row.requester_id] ?? {
          id: row.requester_id,
          name: "Profile unavailable",
          avatar_url: null,
        },
      }));
    },
  });
}
