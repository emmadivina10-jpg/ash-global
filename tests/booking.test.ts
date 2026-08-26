import { describe, expect, it } from "vitest";
import {
  BOOKING_LIFECYCLE,
  PAYABLE_STATUSES,
  bookingStatusLabel,
  bookingStatusTone,
  formatCountdown,
  timeLeft,
} from "../src/lib/booking";

describe("booking lifecycle", () => {
  it("starts at PENDING and contains the paid states", () => {
    expect(BOOKING_LIFECYCLE[0]).toBe("PENDING");
    expect(BOOKING_LIFECYCLE).toContain("CONFIRMED");
    expect(BOOKING_LIFECYCLE).toContain("SETTLED");
  });

  it("has no duplicate states", () => {
    expect(new Set(BOOKING_LIFECYCLE).size).toBe(BOOKING_LIFECYCLE.length);
  });

  it("only marks payment-pending states as payable", () => {
    expect(PAYABLE_STATUSES).toEqual(["ACCEPTED", "PAYMENT_PROCESSING", "PAYMENT_FAILED"]);
    expect(PAYABLE_STATUSES).not.toContain("COMPLETED");
  });
});

describe("status labels", () => {
  it("labels states in English", () => {
    expect(bookingStatusLabel("PENDING", "en")).toBe("Requested");
    expect(bookingStatusLabel("ACCEPTED", "en")).toBe("Payment required");
  });

  it("labels states in French", () => {
    expect(bookingStatusLabel("PENDING", "fr")).toBe("Demandée");
    expect(bookingStatusLabel("COMPLETED", "fr")).toBe("Terminée");
  });

  it("labels every lifecycle state in both languages", () => {
    for (const status of BOOKING_LIFECYCLE) {
      expect(bookingStatusLabel(status, "en").length).toBeGreaterThan(0);
      expect(bookingStatusLabel(status, "fr").length).toBeGreaterThan(0);
    }
  });

  it("humanises an unknown state", () => {
    expect(bookingStatusLabel("SOME_NEW_STATE", "en")).toBe("some new state");
  });
});

describe("status tones", () => {
  it("marks successful states positive", () => {
    expect(bookingStatusTone("COMPLETED")).toBe("positive");
    expect(bookingStatusTone("SETTLED")).toBe("positive");
    expect(bookingStatusTone("CONFIRMED")).toBe("positive");
  });

  it("marks in-flight states warning", () => {
    expect(bookingStatusTone("ACCEPTED")).toBe("warning");
    expect(bookingStatusTone("IN_PROGRESS")).toBe("warning");
  });

  it("marks failures danger", () => {
    expect(bookingStatusTone("DECLINED")).toBe("danger");
    expect(bookingStatusTone("PAYMENT_EXPIRED")).toBe("danger");
    expect(bookingStatusTone("REFUNDED")).toBe("danger");
  });

  it("falls back to neutral", () => {
    expect(bookingStatusTone("PENDING")).toBe("neutral");
  });
});

describe("countdowns", () => {
  it("returns null without a deadline", () => {
    expect(timeLeft(null)).toBeNull();
    expect(timeLeft(undefined)).toBeNull();
  });

  it("returns a positive remaining time for a future deadline", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(timeLeft(future)!).toBeGreaterThan(0);
  });

  it("returns a negative remaining time for a past deadline", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(timeLeft(past)!).toBeLessThan(0);
  });

  it("shows hours and minutes when over an hour remains", () => {
    expect(formatCountdown(3_600_000 + 300_000, "en")).toBe("1h 5m");
  });

  it("shows only minutes under an hour", () => {
    expect(formatCountdown(600_000, "en")).toBe("10m");
  });

  it("reports expiry in both languages", () => {
    expect(formatCountdown(0, "en")).toBe("expired");
    expect(formatCountdown(-1, "fr")).toBe("expiré");
  });
});
