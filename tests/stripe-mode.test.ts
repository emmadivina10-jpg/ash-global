import { afterEach, describe, expect, it } from "vitest";
import {
  STRIPE_FIXED_FEE_MINOR,
  STRIPE_FX_PERCENT,
  STRIPE_PERCENT_FEE,
  PLATFORM_COMMISSION,
  chargeConverts,
  chargeIsViable,
  minimumChargeMinor,
} from "../src/lib/stripe-mode";
import { stripeEnvironment, stripePay } from "../src/lib/stripe.server";

const ENV_KEYS = ["STRIPE_SECRET_KEY", "STRIPE_TEST_SECRET_KEY"] as const;
const saved: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) saved[k] = process.env[k];

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("minimum viable charge (fees measured on ASH's live account)", () => {
  it("uses the measured 2.9% + 30¢ processing fee and 2% FX fee", () => {
    expect(STRIPE_PERCENT_FEE).toBe(0.029);
    expect(STRIPE_FIXED_FEE_MINOR).toBe(30);
    expect(STRIPE_FX_PERCENT).toBe(0.02);
    expect(PLATFORM_COMMISSION).toBe(0.15);
  });
  it("sets the CAD minimum at 248¢", () => expect(minimumChargeMinor("cad")).toBe(248));
  it("sets the USD minimum at 298¢ because it converts into the CAD balance", () =>
    expect(minimumChargeMinor("usd")).toBe(298));
  it("treats every non-CAD currency as converting", () => {
    expect(chargeConverts("cad")).toBe(false);
    expect(chargeConverts("usd")).toBe(true);
    expect(chargeConverts("xaf")).toBe(true);
  });
  it("commission covers the Stripe fee at the CAD minimum", () => {
    const gross = minimumChargeMinor("cad");
    expect(gross * PLATFORM_COMMISSION).toBeGreaterThanOrEqual(
      gross * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE_MINOR,
    );
  });
  it("commission covers the Stripe fee plus FX at the USD minimum", () => {
    const gross = minimumChargeMinor("usd");
    expect(gross * PLATFORM_COMMISSION).toBeGreaterThanOrEqual(
      gross * (STRIPE_PERCENT_FEE + STRIPE_FX_PERCENT) + STRIPE_FIXED_FEE_MINOR,
    );
  });
  it("flags the audited 81¢ test charges as not viable", () => {
    expect(chargeIsViable("usd", 81)).toBe(false);
    expect(chargeIsViable("usd", 298)).toBe(true);
  });
});

describe("checkout minimum enforcement", () => {
  it("rejects a below-minimum charge before touching Stripe", async () => {
    delete process.env["STRIPE_SECRET_KEY"];
    const result = await stripePay.createCheckoutSession({
      reference: "BKG-test",
      amountCents: 81,
      currency: "usd",
      description: "tiny",
      successUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/no",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("BELOW_MINIMUM_CHARGE");
  });
});

describe("live/test credential isolation", () => {
  it("live environment rejects a test key", () => {
    process.env["STRIPE_SECRET_KEY"] = "sk_test_shouldnotcount";
    delete process.env["STRIPE_TEST_SECRET_KEY"];
    expect(stripeEnvironment().live).toBe(false);
  });
  it("test environment rejects a live key", () => {
    process.env["STRIPE_TEST_SECRET_KEY"] = "sk_live_shouldnotcount";
    delete process.env["STRIPE_SECRET_KEY"];
    expect(stripeEnvironment().test).toBe(false);
  });
  it("recognizes each environment with its own key format", () => {
    process.env["STRIPE_SECRET_KEY"] = "sk_live_a";
    process.env["STRIPE_TEST_SECRET_KEY"] = "sk_test_b";
    expect(stripeEnvironment()).toEqual({ live: true, test: true });
  });
});
