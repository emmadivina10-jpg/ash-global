/**
 * Personalised content rotation (client-side ranking layer).
 *
 * Runs AFTER the existing safety-filtered queries, so it can only reorder
 * eligible content — it never adds, invents or un-hides anything.
 *
 * score = relevance (from real signals) + seeded jitter (per user+session)
 *         - recent-exposure cooldown penalty, then a creator-diversity pass.
 * A fresh seed is drawn on every fetch, so refreshing yields a new valid order.
 */

export type RotationSettings = {
  /** 0..1 — how much the per-session seed reshuffles the relevance order. */
  rotationStrength: number;
  /** Hours a seen item is pushed back. */
  cooldownHours: number;
  /** Fraction of slots reserved for low-engagement / new items. */
  exploration: number;
  /** Max consecutive items from the same creator/provider. */
  maxRun: number;
  /** Skip the recent-exposure cooldown (keeps refetch order stable). */
  skipCooldown?: boolean;
};

export const ROTATION_DEFAULTS: RotationSettings = {
  rotationStrength: 0.45,
  cooldownHours: 6,
  exploration: 0.2,
  maxRun: 1,
};

const EXPOSURE_KEY = "ash.exposure.v1";
const MAX_EXPOSURE_ROWS = 600;

type Exposure = { t: string; f: number; l: number; n: number };
type ExposureMap = Record<string, Exposure>;

function readExposure(): ExposureMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(EXPOSURE_KEY) ?? "{}") as ExposureMap;
  } catch {
    return {};
  }
}

function writeExposure(map: ExposureMap) {
  if (typeof window === "undefined") return;
  const entries = Object.entries(map)
    .sort((a, b) => b[1].l - a[1].l)
    .slice(0, MAX_EXPOSURE_ROWS);
  try {
    window.localStorage.setItem(EXPOSURE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* storage full — rotation still works without history */
  }
}

/** Record that items were shown (impressions). Not permanent hiding — cooldown only. */
export function recordExposure(type: string, ids: string[]) {
  if (ids.length === 0) return;
  const map = readExposure();
  const now = Date.now();
  for (const id of ids) {
    const key = `${type}:${id}`;
    const prev = map[key];
    map[key] = prev ? { ...prev, l: now, n: prev.n + 1 } : { t: type, f: now, l: now, n: 1 };
  }
  writeExposure(map);
}

/** 0..1 penalty: 1 right after exposure, fading to 0 when the cooldown ends. */
function cooldownPenalty(map: ExposureMap, type: string, id: string, hours: number) {
  const e = map[`${type}:${id}`];
  if (!e) return 0;
  const age = (Date.now() - e.l) / 3_600_000;
  if (age >= hours) return 0;
  return 1 - age / hours;
}

/**
 * Stable seed for the whole app session: the feed keeps the same order across
 * refetches (likes, comments, realtime updates) so members don't lose their
 * place. A new order only appears on a fresh app load.
 */
const sessionSeeds = new Map<string, string>();
export function stableSessionSeed(userId: string | null) {
  const key = userId ?? "anon";
  let seed = sessionSeeds.get(key);
  if (!seed) {
    seed = newSessionSeed(userId);
    sessionSeeds.set(key, seed);
  }
  return seed;
}

/** New random seed per fetch → refresh produces a new ordering. */
export function newSessionSeed(userId: string | null) {
  const rand =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint32Array(1))[0]!
      : Math.floor(Math.random() * 2 ** 32);
  return `${userId ?? "anon"}:${rand}`;
}

/** Deterministic 0..1 hash of seed+id (FNV-1a). */
function seededUnit(seed: string, id: string) {
  let h = 2166136261;
  const s = `${seed}|${id}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Avalanche finaliser so similar ids spread across the whole range.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

export type RotationItem<T> = {
  item: T;
  id: string;
  creator: string;
  /** 0..1 relevance from real signals (freshness, engagement, location, …). */
  relevance: number;
  /** Low-engagement / new items eligible for exploration slots. */
  explorable?: boolean;
};

export function rotate<T>(
  type: string,
  input: RotationItem<T>[],
  seed: string,
  settings: RotationSettings = ROTATION_DEFAULTS,
): T[] {
  if (input.length <= 1) return input.map((i) => i.item);
  const exposure = readExposure();
  const s = settings.rotationStrength;

  const scored = input.map((i) => {
    const jitter = seededUnit(seed, i.id);
    const explore = i.explorable ? settings.exploration * seededUnit(seed + "x", i.id) : 0;
    const score =
      (1 - s) * i.relevance +
      s * jitter +
      explore -
      (settings.skipCooldown
        ? 0
        : 0.6 * cooldownPenalty(exposure, type, i.id, settings.cooldownHours));
    return { ...i, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // Diversity pass: avoid more than maxRun consecutive items from one creator.
  const out: typeof scored = [];
  const pool = [...scored];
  while (pool.length) {
    const tail = out.slice(-settings.maxRun).map((x) => x.creator);
    const blocked =
      tail.length === settings.maxRun && tail.every((c) => c === tail[0]) ? tail[0] : null;
    const idx = blocked ? pool.findIndex((p) => p.creator !== blocked) : 0;
    out.push(pool.splice(idx === -1 ? 0 : idx, 1)[0]!);
  }
  return out.map((x) => x.item);
}

/** Freshness 0..1 with a half-life in hours. */
export function freshness(createdAt: string | null | undefined, halfLifeHours = 48) {
  if (!createdAt) return 0;
  const age = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  return Math.pow(0.5, Math.max(0, age) / halfLifeHours);
}

/** Diminishing-returns engagement so likes can't dominate the ranking. */
export function engagement(count: number, saturation = 50) {
  return Math.log1p(Math.max(0, count)) / Math.log1p(saturation);
}
