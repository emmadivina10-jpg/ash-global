import { supabase } from "@/integrations/supabase/client";

/**
 * Reuses signed media links across screens and app restarts. Re-signing the
 * same photo produces a new URL every time, which defeats the browser's image
 * cache and makes every photo download again.
 */
const STORAGE_KEY = "ash-signed-url-cache-v1";
type Entry = { url: string; expiresAt: number };
const cache = new Map<string, Entry>();

if (typeof window !== "undefined") {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      Entry
    >;
    const now = Date.now();
    for (const [k, v] of Object.entries(saved)) if (v.expiresAt > now) cache.set(k, v);
  } catch {
    /* Storage is optional. */
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (typeof window === "undefined" || timer) return;
  timer = setTimeout(() => {
    timer = null;
    try {
      const entries = Array.from(cache.entries()).slice(-600);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      /* ignore */
    }
  }, 500);
}

export async function signPathsCached(
  bucket: string,
  paths: string[],
  expiresIn: number,
): Promise<{ map: Record<string, string>; error: Error | null }> {
  const now = Date.now();
  const map: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of Array.from(new Set(paths.filter(Boolean)))) {
    const hit = cache.get(`${bucket}/${p}`);
    if (hit && hit.expiresAt > now) map[p] = hit.url;
    else missing.push(p);
  }
  if (missing.length === 0) return { map, error: null };
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(missing, expiresIn);
  if (error) return { map, error: new Error(error.message) };
  // Keep a safety margin so a cached link never expires mid-view.
  const expiresAt = now + Math.max(expiresIn * 1000 - 60 * 60 * 1000, expiresIn * 500);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      map[item.path] = item.signedUrl;
      cache.set(`${bucket}/${item.path}`, { url: item.signedUrl, expiresAt });
    }
  }
  persist();
  return { map, error: null };
}
