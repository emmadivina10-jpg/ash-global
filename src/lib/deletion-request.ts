import { z } from "zod";

export const deletionRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(200)
      .transform((email) => email.toLowerCase()),
    scope: z.enum(["ACCOUNT", "PERSONALIZATION"]),
  })
  .strict();

export function deletionTicket(scope: "ACCOUNT" | "PERSONALIZATION") {
  return {
    name: "ASH Glo privacy requester",
    subject:
      scope === "ACCOUNT"
        ? "ASH Glo account and personal data deletion request"
        : "ASH Glo personalization data deletion request",
    category: "ACCOUNT",
    message:
      scope === "ACCOUNT"
        ? "Public /delete-account request: delete my ASH Glo account and associated personal data. Identity is NOT verified. Contact the registered email to verify ownership before any action. Review the Privacy Policy, legal retention and pending obligations. Request receipt is not deletion completion. Permanent erasure deployment remains blocked until safe retention and persistence are ready."
        : "Public /delete-account request: delete only my personalization activity history and interest signals, keeping my ASH Glo account. Identity is NOT verified. Verify ownership using the registered email before any action. Do not delete posts, messages, bookings, wallet or payment records. Review legal retention and reply with the actual outcome.",
  };
}
