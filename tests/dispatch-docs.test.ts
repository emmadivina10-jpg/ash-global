import { describe, expect, it } from "vitest";
import { SIGNED_URL_MAX_SECONDS, clampSignedUrlSeconds, missingDocs, riderCanTakeWork, riderDocPath, validateRiderDoc } from "../src/lib/dispatch-docs";

const UID = "33333333-3333-3333-3333-333333333333";

describe("rider identity documents", () => {
  it("signed links never exceed 60 seconds", () => {
    expect(SIGNED_URL_MAX_SECONDS).toBe(60);
    expect(clampSignedUrlSeconds(3600)).toBe(60);
    expect(clampSignedUrlSeconds(30)).toBe(30);
    expect(clampSignedUrlSeconds(0)).toBe(60);
    expect(clampSignedUrlSeconds(Number.NaN)).toBe(60);
  });
  it("files go into the rider's own folder", () => {
    expect(riderDocPath(UID, "SELFIE", "image/jpeg", 1)).toBe(`${UID}/selfie-1.jpg`);
    expect(() => riderDocPath("../x", "SELFIE", "image/jpeg")).toThrow();
    expect(() => riderDocPath(UID, "SELFIE", "text/html")).toThrow();
  });
  it("accepts only images or PDF up to 10 MB", () => {
    expect(validateRiderDoc({ type: "image/png", size: 1000 })).toBe("OK");
    expect(validateRiderDoc({ type: "image/svg+xml", size: 1000 })).toBe("BAD_TYPE");
    expect(validateRiderDoc({ type: "application/pdf", size: 10 * 1024 * 1024 + 1 })).toBe("TOO_LARGE");
  });
  it("motor riders need a driving licence", () => {
    expect(missingDocs("MOTORCYCLE", ["PASSPORT", "SELFIE"])).toEqual(["DRIVER_LICENCE"]);
    expect(missingDocs("BICYCLE", ["PASSPORT", "SELFIE"])).toEqual([]);
  });
  it("only approved, active and available riders can take work", () => {
    expect(riderCanTakeWork({ verification_status: "VERIFIED", is_active: true, availability_status: "AVAILABLE" })).toBe(true);
    expect(riderCanTakeWork({ verification_status: "PENDING", is_active: true, availability_status: "AVAILABLE" })).toBe(false);
    expect(riderCanTakeWork({ verification_status: "VERIFIED", is_active: false, availability_status: "AVAILABLE" })).toBe(false);
    expect(riderCanTakeWork({ verification_status: "VERIFIED", is_active: true, availability_status: "OFFLINE" })).toBe(false);
  });
});
