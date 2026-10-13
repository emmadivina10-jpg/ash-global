import { describe, expect, it } from "vitest";
import { isReplySwipe, replyMessageId } from "../src/components/refer/chat-reply";
import { actualRating, interleaveSpotlights } from "../src/components/refer/feed-spotlights";

describe("requested Feed and reply behavior", () => {
  it("accepts rightward replies, never leftward or vertical scrolling", () => {
    expect(isReplySwipe(80, 5)).toBe(true);
    expect(isReplySwipe(-80, 5)).toBe(false);
    expect(isReplySwipe(30, 80)).toBe(false);
  });
  it("stores a quoted message reference rather than copying private content", () => {
    expect(replyMessageId({ reply_to: "voice-1", duration: 10 })).toBe("voice-1");
    expect(replyMessageId({ reply_to: { body: "private" } })).toBeNull();
    expect(replyMessageId(null)).toBeNull();
  });
  it("includes Spotlights among posts once while keeping original post order", () => {
    const posts = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}` }));
    const result = interleaveSpotlights(posts, [{ id: "s1" }, { id: "s1" }, { id: "s2" }]);
    expect(result.map((entry) => entry.item.id)).toEqual([
      "p0",
      "p1",
      "p2",
      "s1",
      "p3",
      "p4",
      "p5",
      "s2",
    ]);
  });
  it("does not invent ratings for members without reviews", () => {
    expect(actualRating(4.7, 12)).toEqual({ value: 4.7, reviews: 12 });
    expect(actualRating(5, 0)).toBeNull();
    expect(actualRating(null, null)).toBeNull();
  });
});
