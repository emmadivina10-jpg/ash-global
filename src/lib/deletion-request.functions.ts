import { createServerFn } from "@tanstack/react-start";
import { deletionRequestSchema, deletionTicket } from "./deletion-request";

/** Public intake only: no account lookup, account mutation or automatic erasure. */
export const submitDeletionRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deletionRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      return { ok: false as const, error: "REQUEST_NOT_ALLOWED" };
    }
    // Reuse the existing public Support process, including its persistent abuse controls,
    // staff permissions and replies. Never bind an unverified email to another user's ID.
    const { submitSupportTicket } = await import("./support.functions");
    const result = await submitSupportTicket({
      data: { ...deletionTicket(data.scope), email: data.email },
    });
    if (!result.ok)
      return {
        ok: false as const,
        error: result.error === "RATE_LIMITED" ? "RATE_LIMITED" : "SAVE_FAILED",
      };
    let staffNotified = false;
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      const notification = await sendTemplateEmail(
        "deletion-request-notification",
        "privacy@ashglogroup.company",
        {
          templateData: { reference: result.reference, scope: data.scope },
          idempotencyKey: `deletion-staff-${result.id}`,
        },
      );
      staffNotified = notification.sent;
    } catch {
      // The saved request remains in the Support inbox when email delivery is unavailable.
    }
    return { ok: true as const, reference: result.reference, staffNotified };
  });
