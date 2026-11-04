import { describe, expect, it } from "vitest";
import { CAMPUS_CHANNEL_POLICY as policy, videoOrientation } from "../src/lib/campus-channel-policy";

describe("Campus channel release gates", () => {
  it("does not allow creators to go live", () => expect(policy.liveEnabled).toBe(false));
  it("does not collect membership fees while live sessions are unavailable", () => expect(policy.membershipsEnabled).toBe(false));
  it("keeps purchases closed until secure course access exists", () => expect(policy.purchasesEnabled).toBe(false));
  it("uses the confirmed 15 percent platform share", () => expect(policy.platformCommission).toBe(0.15));
  it("reserves 85 percent for the creator", () => expect(policy.creatorShare).toBe(0.85));
  it("supports individual course prices", () => expect(policy.individualPricing).toBe(true));
  it("supports separate bundle prices", () => expect(policy.bundlePricing).toBe(true));
  it("preserves portrait video orientation", () => expect(videoOrientation(1080, 1920)).toBe("portrait"));
  it("preserves landscape video orientation", () => expect(videoOrientation(1920, 1080)).toBe("landscape"));
});