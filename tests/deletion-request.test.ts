import { describe, expect, it } from "vitest";
import { deletionRequestSchema, deletionTicket } from "../src/lib/deletion-request";

describe("public ASH Glo deletion intake", () => {
  it("accepts only registered email identification and the requested scope", () => {
    expect(deletionRequestSchema.parse({ email: " Reviewer@Example.com ", scope: "ACCOUNT" })).toEqual({ email: "reviewer@example.com", scope: "ACCOUNT" });
    expect(deletionRequestSchema.safeParse({ email: "invalid", scope: "ACCOUNT" }).success).toBe(false);
    expect(deletionRequestSchema.safeParse({ email: "reviewer@example.com", scope: "ACCOUNT", password: "must-not-collect" }).success).toBe(false);
  });
  it("allows account deletion or personalization-only data deletion, not arbitrary destructive scope", () => {
    expect(deletionRequestSchema.safeParse({ email: "reviewer@example.com", scope: "PERSONALIZATION" }).success).toBe(true);
    expect(deletionRequestSchema.safeParse({ email: "reviewer@example.com", scope: "ALL_PAYMENTS" }).success).toBe(false);
  });
  it("routes both requests to the existing Account support category without a user ID", () => {
    expect(deletionTicket("ACCOUNT").category).toBe("ACCOUNT");
    expect(deletionTicket("PERSONALIZATION").category).toBe("ACCOUNT");
    expect(deletionTicket("ACCOUNT")).not.toHaveProperty("user_id");
    expect(deletionTicket("PERSONALIZATION")).not.toHaveProperty("user_id");
  });
});