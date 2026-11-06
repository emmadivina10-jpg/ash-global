import { describe, expect, it } from "vitest";
import {
  matchesCommunityPost,
  matchesCommunityTopic,
} from "../src/components/refer/community-topics";
import { matchesCategory } from "../src/components/refer/feed-categories";

describe("community topics", () => {
  it("limits All Videos to video posts", () => {
    expect(matchesCommunityTopic("#food", "all", true)).toBe(true);
    expect(matchesCommunityTopic("#food", "all", false)).toBe(false);
  });

  it("matches explicit category tags without substring or author guesses", () => {
    expect(matchesCommunityTopic("Dinner #food", "food", false)).toBe(true);
    expect(matchesCommunityTopic("Dinner #foodie", "food", false)).toBe(false);
    expect(matchesCommunityTopic("Food is good", "food", false)).toBe(false);
    expect(matchesCommunityTopic("#food #tech", "tech", true)).toBe(true);
    expect(matchesCommunityTopic("#web", "tech", true)).toBe(true);
    expect(matchesCommunityTopic("#properties", "home", false)).toBe(false);
  });

  it("does not classify untagged media as creators or infer unrelated categories", () => {
    expect(matchesCategory("A lovely photo", "creators", 1)).toBe(false);
    expect(matchesCategory("#services #events", "services", 1)).toBe(true);
    expect(matchesCategory("#services #events", "events", 1)).toBe(true);
    expect(matchesCategory("#services-extra", "services", 1)).toBe(false);
    expect(matchesCategory("#properties", "property", 1)).toBe(true);
  });

  it("combines search with the selected category", () => {
    expect(matchesCommunityPost("#food lunch", "Alex", false, "food", "alex")).toBe(true);
    expect(matchesCommunityPost("#tech lunch", "Food Alex", true, "food", "alex")).toBe(false);
    expect(matchesCommunityPost("#food lunch", "Alex", false, "food", "dinner")).toBe(false);
    expect(matchesCommunityPost("#food lunch", "Alex", false, "all", "lunch")).toBe(false);
  });
});
