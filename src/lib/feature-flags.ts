/**
 * Server-readable feature switches (public.feature_flags, read-only to the
 * app). A switch that cannot be read is treated as OFF, except that the last
 * value this device successfully read is reused while offline, so the tab bar
 * doesn't flip back and forth on a flaky connection.
 */
import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlagKey =
  | "new_nav"
  | "discover"
  | "buy_sell"
  | "kitchen"
  | "services_hub"
  | "my_account"
  | "courses"
  | "uploads";

export type FeatureFlags = Partial<Record<FeatureFlagKey, boolean>>;

const CACHE_KEY = "ash.feature-flags.v1";

function readCached(): FeatureFlags {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: FeatureFlags = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>))
      if (value === true) out[key as FeatureFlagKey] = true;
    return out;
  } catch {
    return {};
  }
}

function writeCached(flags: FeatureFlags) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(flags));
  } catch {
    /* storage unavailable */
  }
}

/** Turns raw rows into a flag map; anything not explicitly `true` is off. */
export function toFeatureFlags(rows: ReadonlyArray<{ key: string; enabled: boolean | null }>) {
  const out: FeatureFlags = {};
  for (const row of rows) if (row.enabled === true) out[row.key as FeatureFlagKey] = true;
  return out;
}

async function fetchFeatureFlags(): Promise<FeatureFlags> {
  if (typeof window === "undefined") return {};
  try {
    const { data, error } = await supabase.from("feature_flags").select("key, enabled");
    if (error || !data) return readCached();
    const flags = toFeatureFlags(data);
    writeCached(flags);
    return flags;
  } catch {
    return readCached();
  }
}

export const featureFlagsQuery = queryOptions({
  queryKey: ["feature-flags"],
  queryFn: fetchFeatureFlags,
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  retry: 0,
});

/**
 * Loads the switches before a layout renders so the tab bar never flashes the
 * wrong set. Never throws; gives up waiting after `timeoutMs` (the query keeps
 * loading and the screen updates when it lands).
 */
export async function prefetchFeatureFlags(
  queryClient: QueryClient,
  timeoutMs = 2500,
): Promise<FeatureFlags> {
  const cached = queryClient.getQueryData(featureFlagsQuery.queryKey);
  if (cached) return cached;
  const pending = queryClient.ensureQueryData(featureFlagsQuery).catch(() => ({}) as FeatureFlags);
  const timeout = new Promise<FeatureFlags>((resolve) =>
    setTimeout(() => resolve(readCachedSafe()), timeoutMs),
  );
  return Promise.race([pending, timeout]);
}

function readCachedSafe(): FeatureFlags {
  return typeof window === "undefined" ? {} : readCached();
}

export function useFeatureFlags(): FeatureFlags {
  const { data } = useQuery(featureFlagsQuery);
  return data ?? {};
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return useFeatureFlags()[key] === true;
}

/** The member home tab: Discover under the new tab bar, otherwise the Feed. */
export function homePath(flags: FeatureFlags): "/discover" | "/feed" {
  return flags.new_nav ? "/discover" : "/feed";
}

export function useHomePath(): "/discover" | "/feed" {
  return homePath(useFeatureFlags());
}
