/**
 * Per-device hashtag interest profile used by feed ranking.
 * Weights decay with a 14-day half-life so interests stay current.
 */
const KEY = "ash.interests.tags";
const HALF_LIFE_MS = 14 * 24 * 3600 * 1000;
type Store = Record<string, { w: number; t: number }>;

export function extractTags(text: string | null | undefined): string[] {
  if (!text) return [];
  const out = new Set<string>();
  for (const m of text.matchAll(/#([\p{L}\p{N}_]{2,50})/gu)) out.add(m[1]!.toLowerCase());
  return [...out];
}

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function decayed(e: { w: number; t: number }, now: number) {
  return e.w * Math.pow(0.5, (now - e.t) / HALF_LIFE_MS);
}

export function recordTagInterest(tags: string[], weight = 1) {
  if (typeof window === "undefined" || tags.length === 0) return;
  const now = Date.now();
  const s = read();
  for (const raw of tags) {
    const tag = raw.toLowerCase();
    const prev = s[tag];
    s[tag] = { w: Math.min(20, (prev ? decayed(prev, now) : 0) + weight), t: now };
  }
  const top = Object.entries(s).sort((a, b) => b[1].w - a[1].w).slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(top)));
}

/** 0..1 affinity of the current member for a set of tags. */
export function tagAffinity(tags: string[]): number {
  if (tags.length === 0) return 0;
  const s = read();
  const now = Date.now();
  let best = 0;
  for (const t of tags) {
    const e = s[t];
    if (e) best = Math.max(best, decayed(e, now));
  }
  return Math.min(1, best / 5);
}
