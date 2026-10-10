import { describe, expect, it } from "vitest";
import { checkoutMatches, providerMinorShare, releaseBlocker, transferKey } from "../src/lib/stripe-release-policy";

const eligible = { paid: true, verified: true, completed: true, held: false, destinationCountry: "CA", transfersActive: true, payoutsEnabled: true, currency: "cad" };
const checkout = { expectedSession: "cs_live_one", actualSession: "cs_live_one", expectedReference: "BKG-one", actualReference: "BKG-one", expectedMinor: 10000, actualMinor: 10000, expectedCurrency: "USD", actualCurrency: "usd", live: true, paid: true };
describe("verified provider releases", () => {
  it("keeps 15% and releases 85% of the actual charged minor units", () => expect(providerMinorShare(10000, 0.15)).toBe(8500));
  it("preserves a saved 12% rate", () => expect(providerMinorShare(10000, 0.12)).toBe(8800));
  it("rejects a wallet-style fractional minor amount", () => expect(() => providerMinorShare(85.5, 0.15)).toThrow());
  it("blocks release before verified payment", () => expect(releaseBlocker({ ...eligible, paid: false })).toBe("PAYMENT_NOT_VERIFIED"));
  it("blocks release before customer verification", () => expect(releaseBlocker({ ...eligible, verified: false })).toBe("SERVICE_NOT_VERIFIED"));
  it("blocks release before completed service", () => expect(releaseBlocker({ ...eligible, completed: false })).toBe("SERVICE_NOT_VERIFIED"));
  it("blocks held refunds or disputes", () => expect(releaseBlocker({ ...eligible, held: true })).toBe("PAYMENT_HELD"));
  it("rejects Cameroon as a Stripe destination", () => expect(releaseBlocker({ ...eligible, destinationCountry: "CM" })).toBe("UNSUPPORTED_DESTINATION"));
  it("rejects Nigeria as an unconfirmed Stripe destination", () => expect(releaseBlocker({ ...eligible, destinationCountry: "NG" })).toBe("UNSUPPORTED_DESTINATION"));
  it("blocks inactive transfer capability", () => expect(releaseBlocker({ ...eligible, transfersActive: false })).toBe("PROVIDER_NOT_READY"));
  it("blocks disabled bank payouts", () => expect(releaseBlocker({ ...eligible, payoutsEnabled: false })).toBe("PROVIDER_NOT_READY"));
  it("never sends an XAF wallet amount to Stripe", () => expect(releaseBlocker({ ...eligible, currency: "xaf" })).toBe("UNSUPPORTED_TRANSFER_CURRENCY"));
  it("permits a verified Canadian bank destination", () => expect(releaseBlocker(eligible)).toBeNull());
  it("uses the same transfer identity on every retry", () => expect(transferKey("booking-one")).toBe("ash_marketplace_booking_booking-one_v1"));
  it("accepts matching live paid Checkout evidence", () => expect(checkoutMatches(checkout)).toBe(true));
  it("rejects changed amounts", () => expect(checkoutMatches({ ...checkout, actualMinor: 9999 })).toBe(false));
  it("rejects changed currency", () => expect(checkoutMatches({ ...checkout, actualCurrency: "cad" })).toBe(false));
  it("rejects a different session", () => expect(checkoutMatches({ ...checkout, actualSession: "cs_live_other" })).toBe(false));
  it("rejects sandbox payments", () => expect(checkoutMatches({ ...checkout, live: false })).toBe(false));
  it("rejects unpaid sessions", () => expect(checkoutMatches({ ...checkout, paid: false })).toBe(false));
  it("rejects Flights references on Marketplace", () => expect(checkoutMatches({ ...checkout, actualReference: "FLT-one" })).toBe(false));
});