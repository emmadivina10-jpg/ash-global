import { describe, expect, it } from "vitest";
import { CATEGORY_GROUPS, categoryLabel, groupOf } from "../src/lib/taxonomy";
import { SERVICE_CATEGORIES } from "../src/lib/marketplace";

describe("category groups", () => {
  it("exposes the six discovery groups", () => {
    expect(CATEGORY_GROUPS.map((g) => g.id)).toEqual([
      "BEAUTY",
      "TECH",
      "HOME",
      "EVENTS",
      "HEALTH",
      "PROFESSIONAL",
    ]);
  });

  it("gives every group bilingual copy and an image", () => {
    for (const group of CATEGORY_GROUPS) {
      expect(group.label.en.length).toBeGreaterThan(0);
      expect(group.label.fr.length).toBeGreaterThan(0);
      expect(group.headline.fr.length).toBeGreaterThan(0);
      expect(group.image).toBeTruthy();
    }
  });

  it("only groups real service categories", () => {
    for (const group of CATEGORY_GROUPS) {
      for (const category of group.categories) {
        expect(SERVICE_CATEGORIES).toContain(category);
      }
    }
  });

  it("gives every group at least two categories", () => {
    for (const group of CATEGORY_GROUPS) {
      expect(group.categories.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("category labels", () => {
  it("labels a category in English", () => {
    expect(categoryLabel("BRAIDER", "en")).toBe("Braider");
  });

  it("labels a category in French", () => {
    expect(categoryLabel("BRAIDER", "fr")).toBe("Tresseuse");
  });

  it("labels every category in both languages", () => {
    for (const category of SERVICE_CATEGORIES) {
      expect(categoryLabel(category, "en")).not.toContain("_");
      expect(categoryLabel(category, "fr").length).toBeGreaterThan(0);
    }
  });

  it("humanises an unknown category", () => {
    expect(categoryLabel("SPACE_TOURISM", "en")).toBe("space tourism");
  });
});

describe("group lookup", () => {
  it("maps a beauty category to the beauty group", () => {
    expect(groupOf("BARBER")).toBe("BEAUTY");
  });

  it("maps a trade category to the home group", () => {
    expect(groupOf("ELECTRICIAN")).toBe("HOME");
  });

  it("maps a tech category to the tech group", () => {
    expect(groupOf("WEB_DEV")).toBe("TECH");
  });

  it("returns null for an unknown category", () => {
    expect(groupOf("SPACE_TOURISM")).toBeNull();
  });
});
