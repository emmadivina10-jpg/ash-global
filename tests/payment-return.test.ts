import { describe, expect, it } from "vitest";
import { bookingTrackingPath, paymentReturnOrigin } from "../src/lib/payment-return";

describe("checkout return routing", () => {
  it("returns a booking to its own tracking page", () => {
    expect(bookingTrackingPath("booking-123")).toBe("/booking/booking-123/track");
  });
  it("keeps the ASH custom domain", () => {
    expect(paymentReturnOrigin("https://ashglogroup.company")).toBe("https://ashglogroup.company");
  });
  it("never sends payment returns to transient previews or unknown Lovable projects", () => {
    expect(paymentReturnOrigin("https://id-preview-2--unknown.lovable.app")).toBe("https://ashglogroup.company");
    expect(paymentReturnOrigin("https://other-project.lovable.app")).toBe("https://ashglogroup.company");
    expect(paymentReturnOrigin("https://project-devserver-secret.lovableproject.com")).toBe("https://ashglogroup.company");
  });
  it("rejects foreign addresses and retains local development", () => {
    expect(paymentReturnOrigin("https://example.com")).toBe("https://ashglogroup.company");
    expect(paymentReturnOrigin("http://localhost:8080")).toBe("http://localhost:8080");
  });
});