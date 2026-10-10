import { describe, expect, it } from "vitest";
import { PUSH_CATEGORIES, isPushCategory, notificationLink } from "../src/lib/push";
import { shouldMirrorDeviceAlert } from "../src/lib/notification-delivery";

describe("single device alert ownership", () => {
  it("does not duplicate native remote banners with local notifications", () => {
    expect(shouldMirrorDeviceAlert(true, "visible")).toBe(false);
    expect(shouldMirrorDeviceAlert(true, "hidden")).toBe(false);
  });
  it("does not interrupt the foreground web app with a duplicate banner", () => {
    expect(shouldMirrorDeviceAlert(false, "visible")).toBe(false);
  });
  it("keeps browser OS alerts for a background tab", () => {
    expect(shouldMirrorDeviceAlert(false, "hidden")).toBe(true);
  });
});

describe("push categories", () => {
  it("covers the money-critical events", () => {
    expect(PUSH_CATEGORIES).toContain("WITHDRAWAL");
    expect(PUSH_CATEGORIES).toContain("ACTIVATION");
    expect(PUSH_CATEGORIES).toContain("COMMISSION");
  });

  it("covers marketplace events", () => {
    expect(PUSH_CATEGORIES).toContain("BOOKING");
    expect(PUSH_CATEGORIES).toContain("MESSAGE");
  });

  it("recognises known categories", () => {
    expect(isPushCategory("WITHDRAWAL")).toBe(true);
    expect(isPushCategory("REVIEW")).toBe(true);
  });

  it("rejects unknown categories", () => {
    expect(isPushCategory("MARKETING")).toBe(false);
    expect(isPushCategory("")).toBe(false);
  });
});

describe("notification deep links", () => {
  it("sends withdrawal alerts to the withdraw screen", () => {
    expect(notificationLink("WITHDRAWAL")).toBe("/withdraw");
  });

  it("sends activation alerts to the dashboard", () => {
    expect(notificationLink("ACTIVATION")).toBe("/dashboard");
  });

  it("sends commission alerts to the network view", () => {
    expect(notificationLink("COMMISSION")).toBe("/network");
  });

  it("sends booking alerts to bookings", () => {
    expect(notificationLink("BOOKING")).toBe("/bookings");
  });

  it("opens the exact conversation when the id is present", () => {
    expect(notificationLink("MESSAGE", { conversation_id: "abc" })).toBe("/messages?c=abc");
  });

  it("falls back to the inbox without a conversation id", () => {
    expect(notificationLink("MESSAGE")).toBe("/messages");
  });

  it("falls back to the dashboard for unknown categories", () => {
    expect(notificationLink("SOMETHING")).toBe("/feed");
  });

  it("opens account notifications on the profile", () => {
    expect(notificationLink("ACCOUNT")).toBe("/profile");
  });
});
