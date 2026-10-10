import { describe, expect, it } from "vitest";
import { bookingPaymentAction, paymentCheckOutcome } from "../src/lib/booking-payment-state";

describe("booking payment actions", () => {
  it("does not offer another payment while confirmation is pending", () => {
    expect(bookingPaymentAction("PAYMENT_PROCESSING")).toBe("confirm");
  });
  it("offers tracking for a confirmed booking", () => {
    expect(bookingPaymentAction("CONFIRMED")).toBe("track");
    expect(bookingPaymentAction("IN_PROGRESS")).toBe("track");
  });
  it("offers payment only for accepted or failed bookings", () => {
    expect(bookingPaymentAction("ACCEPTED")).toBe("pay");
    expect(bookingPaymentAction("PAYMENT_FAILED")).toBe("pay");
    expect(bookingPaymentAction("REFUNDED")).toBe("none");
  });
});

describe("payment check outcomes", () => {
  it("never treats a pending check as paid", () => {
    expect(paymentCheckOutcome({ ok: true, status: "PENDING" })).toBe("pending");
    expect(paymentCheckOutcome({ ok: true, status: "PROCESSING" })).toBe("pending");
  });
  it("never treats an unsuccessful check as payment evidence", () => {
    expect(paymentCheckOutcome({ ok: false, status: "PAID" })).toBe("unavailable");
  });
  it("distinguishes verified success from failed payment", () => {
    expect(paymentCheckOutcome({ ok: true, status: "PAID" })).toBe("paid");
    expect(paymentCheckOutcome({ ok: true, status: "FAILED" })).toBe("failed");
    expect(paymentCheckOutcome({ ok: true, status: "CANCELLED" })).toBe("failed");
  });
});