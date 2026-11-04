import { describe, expect, it } from "vitest";
import { DISCOVER_TOPICS, DISCOVER_UPLOAD_DESTINATION, topicMatches } from "../src/lib/discover-topics";

describe("Discover category allocation", () => {
  it("includes every video in All", () => expect(topicMatches("Unrelated lesson", "all")).toBe(true));
  for (const category of DISCOVER_TOPICS.filter((item) => item.id !== "all")) {
    it(`only includes allocated ${category.id} videos`, () => {
      expect(topicMatches(`Lesson\n#${category.id}`, category.id)).toBe(true);
      expect(topicMatches("Unrelated lesson #food", category.id)).toBe(false);
    });
  }
  it("uses the assigned category rather than incidental descriptive keywords", () => {
    expect(topicMatches("Programming examples for Forex #forex", "programming")).toBe(false);
    expect(topicMatches("Programming examples for Forex #forex", "forex")).toBe(true);
  });
  it("matches legacy descriptions without matching word fragments", () => {
    expect(topicMatches("Learn React and CSS", "web")).toBe(true);
    expect(topicMatches("Happy holiday", "mobile")).toBe(false);
    expect(topicMatches("Mathematics and algèbre", "maths")).toBe(true);
  });
  it("returns successful uploads directly to Discover", () => expect(DISCOVER_UPLOAD_DESTINATION).toBe("/discover"));
  it("keeps the top-level navigation to All and Buy Courses while preserving the five course subjects", () => {
    expect(DISCOVER_TOPICS.map((item) => item.id)).toEqual(["all", "forex", "web", "mobile", "programming", "maths"]);
  });
});
