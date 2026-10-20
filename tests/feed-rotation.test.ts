import { afterEach, describe, expect, it, vi } from "vitest";
import { prioritizePublishedContent, resetFeedRotation, rotateSessionContent } from "../src/lib/rotation";

const pool = Array.from({ length: 12 }, (_, i) => ({
  id: `post-${i}`,
  creator: `member-${i % 4}`,
  relevance: i === 0 ? 1 : 0.1,
  item: { id: `post-${i}`, creator: `member-${i % 4}` },
}));
afterEach(() => vi.unstubAllGlobals());

describe("member opening rotation", () => {
  it("keeps a confirmed new post inside the 120-post window from a 240-post pool", () => {
    const member = "publishing-viewer";
    resetFeedRotation(member);
    const candidates = Array.from({ length: 240 }, (_, i) => ({
      id: `existing-${i}`, creator: `author-${i}`, relevance: 0.5,
      item: { id: `existing-${i}` },
    }));
    const initial = rotateSessionContent("feed", candidates, member).slice(0, 120);
    const published = { id: "new-post", creator: member, relevance: 1, item: { id: "new-post" } };
    prioritizePublishedContent("feed", member, published.id);
    const updated = rotateSessionContent("feed", [published, ...candidates.slice(0, 239)], member).slice(0, 120);
    expect(updated[0]?.id).toBe("new-post");
    const retained = new Set(updated.slice(1).map((item) => item.id));
    expect(updated.slice(1)).toEqual(initial.filter((item) => retained.has(item.id)));
    expect(rotateSessionContent("feed", [published, ...candidates.slice(0, 239)], member).slice(0, 120)).toEqual(updated);
  });
  it("keeps a published Spotlight first after refetch on both Spotlight surfaces", () => {
    const member = "spotlight-publisher";
    for (const type of ["spotlight", "spotlight-feed"]) {
      resetFeedRotation(member);
      const initial = rotateSessionContent(type, pool, member);
      const published = { id: "new-spotlight", creator: member, relevance: 1, item: { id: "new-spotlight", creator: member } };
      prioritizePublishedContent(type, member, published.id);
      expect(rotateSessionContent(type, [published, ...pool], member)).toEqual([published.item, ...initial]);
    }
  });
  it("never inserts an unavailable published ID or shares publication priority between members", () => {
    resetFeedRotation("publisher-only");
    resetFeedRotation("other-viewer");
    const other = rotateSessionContent("feed", pool, "other-viewer");
    prioritizePublishedContent("feed", "publisher-only", "missing-post");
    prioritizePublishedContent("feed", "publisher-only", other.at(-1)?.id ?? "");
    expect(rotateSessionContent("feed", pool, "other-viewer")).toEqual(other);
    expect(rotateSessionContent("feed", pool, "publisher-only").map((item) => item.id).sort()).toEqual(pool.map((item) => item.id).sort());
  });
  it("varies the first post across members even with one highly ranked post", () => {
    const first = new Set(
      Array.from({ length: 30 }, (_, i) => {
        const member = `viewer-${i}`;
        resetFeedRotation(member);
        return rotateSessionContent("feed", pool, member)[0]?.id;
      }),
    );
    expect(first.size).toBeGreaterThan(3);
  });
  it("preserves order on background updates even when relevance changes", () => {
    resetFeedRotation("stable-viewer");
    const initial = rotateSessionContent("feed", pool, "stable-viewer").map((item) => item.id);
    const updated = rotateSessionContent(
      "feed",
      [...pool].reverse().map((entry) => ({
        ...entry,
        relevance: 1 - entry.relevance,
      })),
      "stable-viewer",
    ).map((item) => item.id);
    expect(updated).toEqual(initial);
  });
  it("changes opening creator on a fresh load or refresh when alternatives exist", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
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
    expect(
      rotateSessionContent("spotlight", pool, "safe-viewer")
        .map((item) => item.id)
        .sort(),
    ).toEqual(pool.map((entry) => entry.id).sort());
  });
});
