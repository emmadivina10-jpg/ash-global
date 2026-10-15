import { afterEach, describe, expect, it, vi } from "vitest";
import { resetFeedRotation, rotateSessionContent } from "../src/lib/rotation";

const pool = Array.from({ length: 12 }, (_, i) => ({
  id: `post-${i}`, creator: `member-${i % 4}`, relevance: i === 0 ? 1 : 0.1,
  item: { id: `post-${i}`, creator: `member-${i % 4}` },
}));
afterEach(() => vi.unstubAllGlobals());

describe("member opening rotation", () => {
  it("varies the first post across members even with one highly ranked post", () => {
    const first = new Set(Array.from({ length: 30 }, (_, i) => {
      const member = `viewer-${i}`;
      resetFeedRotation(member);
      return rotateSessionContent("feed", pool, member)[0]?.id;
    }));
    expect(first.size).toBeGreaterThan(3);
  });
  it("preserves order on background updates even when relevance changes", () => {
    resetFeedRotation("stable-viewer");
    const initial = rotateSessionContent("feed", pool, "stable-viewer").map((item) => item.id);
    const updated = rotateSessionContent("feed", [...pool].reverse().map((entry) => ({
      ...entry, relevance: 1 - entry.relevance,
    })), "stable-viewer").map((item) => item.id);
    expect(updated).toEqual(initial);
  });
  it("changes opening creator on a fresh load or refresh when alternatives exist", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } });
    for (const type of ["feed", "spotlight", "spotlight-feed"]) {
      resetFeedRotation("returning-viewer");
      const first = rotateSessionContent(type, pool, "returning-viewer")[0];
      resetFeedRotation("returning-viewer");
      const next = rotateSessionContent(type, pool, "returning-viewer")[0];
      expect(next?.creator).not.toBe(first?.creator);
      expect(rotateSessionContent(type, pool, "returning-viewer")[0]?.id).toBe(next?.id);
    }
  });
  it("only reorders eligible IDs and does not duplicate or add content", () => {
    resetFeedRotation("safe-viewer");
    expect(rotateSessionContent("spotlight", pool, "safe-viewer").map((item) => item.id).sort())
      .toEqual(pool.map((entry) => entry.id).sort());
  });
});