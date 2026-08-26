import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function makeReference(): string {
  return `BKG-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

/**
 * Starts (or resumes) the TchokoPay checkout for an accepted booking.
 * Payment is only ever available after the provider accepted the request.
 */
export const startBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string; method?: "MOMO" | "CARD" }) => {
    if (!input?.bookingId) throw new Error("bookingId required");
    return { bookingId: input.bookingId, method: input.method === "CARD" ? ("CARD" as const) : ("MOMO" as const) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, client_id, status, price, service_title, payment_reference, pay_by, payment_provider, provider_transaction_id")
      .eq("id", data.bookingId)
      .maybeSingle();

    if (!booking || booking.client_id !== userId) return { ok: false as const, error: "NOT_FOUND" };
    if (["CONFIRMED", "IN_PROGRESS", "COMPLETED", "SETTLED"].includes(booking.status)) {
      return { ok: false as const, error: "ALREADY_PAID" };
    }
    if (!["ACCEPTED", "PAYMENT_PROCESSING", "PAYMENT_FAILED"].includes(booking.status)) {
      return { ok: false as const, error: "PAYMENT_NOT_AVAILABLE" };
    }

    // Resume an in-flight checkout when the rail still has a usable link.
    if (booking.status === "PAYMENT_PROCESSING" && booking.payment_reference) {
      if (booking.payment_provider === "STRIPE" && data.method === "CARD" && booking.provider_transaction_id) {
        const { stripePay } = await import("./stripe.server");
        const current = await stripePay.verifySession(booking.provider_transaction_id);
        if (current.ok && current.status === "PENDING") {
          const resumed = await stripePay.createCheckoutSession({
            reference: booking.payment_reference,
            amountCents: (await import("./stripe.server")).xafToUsdCents(Number(booking.price)),
            currency: "USD",
            description: `ASH booking — ${booking.service_title}`,
            successUrl: `${process.env["APP_URL"] ?? "https://growrefer.app"}/bookings`,
            cancelUrl: `${process.env["APP_URL"] ?? "https://growrefer.app"}/bookings`,
            metadata: { booking_id: booking.id },
          });
          if (resumed.ok && resumed.checkoutUrl) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("bookings").update({ provider_transaction_id: resumed.id }).eq("id", booking.id);
            return { ok: true as const, reference: booking.payment_reference, checkoutUrl: resumed.checkoutUrl, error: null };
          }
        }
      } else if (booking.payment_provider !== "STRIPE" && data.method === "MOMO") {
        const current = await tchokoPay.verifyPayment(booking.payment_reference);
        if (current.ok && current.checkoutUrl && current.status !== "FAILED" && current.status !== "CANCELLED") {
          return {
            ok: true as const,
            reference: booking.payment_reference,
            checkoutUrl: current.checkoutUrl,
            error: null,
          };
        }
      }
    }


    const reference = makeReference();
    const { data: begun, error: beginError } = await supabase.rpc("begin_booking_payment", {
      _booking_id: booking.id,
      _reference: reference,
    });
    const begin = begun as { ok?: boolean; error?: string } | null;
    if (beginError || !begin?.ok) {
      return { ok: false as const, error: begin?.error ?? beginError?.message ?? "PAYMENT_NOT_AVAILABLE" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", userId)
      .maybeSingle();

    const appUrl = process.env["APP_URL"] ?? "https://growrefer.app";
    const result = await tchokoPay.createPayment({
      reference,
      amount: Number(booking.price),
      currency: "XAF",
      description: `ASH booking — ${booking.service_title}`,
      customer: {
        name: profile?.full_name ?? "ASH client",
        email: profile?.email ?? "",
        phone: profile?.phone ?? "",
      },
      callbackUrl: `${appUrl}/api/public/webhooks/tchokopay`,
      returnUrl: `${appUrl}/bookings`,
    });

    if (!result.ok) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("fail_booking_payment", {
        _payment_reference: reference,
        _status: "FAILED",
      });
      return { ok: false as const, error: result.error ?? "PAYMENT_START_FAILED" };
    }

    return {
      ok: true as const,
      reference,
      checkoutUrl: result.checkoutUrl ?? null,
      error: null,
    };
  });

/**
 * Server-side verification of a booking payment. The provider API is the only
 * source of truth; confirmation runs through the idempotent
 * complete_booking_payment() database function.
 */
export const syncBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string }) => {
    if (!input?.bookingId) throw new Error("bookingId required");
    return { bookingId: input.bookingId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, client_id, status, payment_reference, invoice_number")
      .eq("id", data.bookingId)
      .maybeSingle();

    if (!booking || booking.client_id !== userId) return { ok: false as const, error: "NOT_FOUND" };
    if (["CONFIRMED", "IN_PROGRESS", "COMPLETED", "SETTLED"].includes(booking.status)) {
      return { ok: true as const, status: "PAID" as const, bookingStatus: booking.status, error: null };
    }
    if (!booking.payment_reference) {
      return { ok: true as const, status: "PENDING" as const, bookingStatus: booking.status, error: null };
    }

    const { tchokoPay } = await import("./tchokopay.server");
    const verification = await tchokoPay.verifyPayment(booking.payment_reference);
    if (!verification.ok) {
      return { ok: false as const, error: verification.error ?? "UNVERIFIED", bookingStatus: booking.status };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (verification.status === "PAID") {
      await supabaseAdmin.rpc("complete_booking_payment", {
        _payment_reference: booking.payment_reference,
        _provider_transaction_id: (verification.providerTransactionId ?? null) as unknown as string,
      });
      await supabaseAdmin.from("payment_events").insert({
        source: "BOOKING_SYNC",
        reference: booking.payment_reference,
        status: "PAID",
        signature_verified: false,
        outcome: "BOOKING_CONFIRMED",
        detail: { booking_id: booking.id },
      });
      return { ok: true as const, status: "PAID" as const, bookingStatus: "CONFIRMED", error: null };
    }

    if (verification.status === "FAILED" || verification.status === "CANCELLED") {
      await supabaseAdmin.rpc("fail_booking_payment", {
        _payment_reference: booking.payment_reference,
        _status: verification.status,
      });
      return { ok: true as const, status: verification.status, bookingStatus: "PAYMENT_FAILED", error: null };
    }

    return { ok: true as const, status: verification.status, bookingStatus: booking.status, error: null };
  });
