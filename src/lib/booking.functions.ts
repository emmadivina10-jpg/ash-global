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
  .inputValidator((input: { bookingId: string; method?: "MOMO" | "CARD"; provider?: string; phone?: string; country?: string; origin?: string }) => {
    if (!input?.bookingId) throw new Error("bookingId required");
    // Only same-app origins are allowed for Stripe success/cancel URLs.
    const rawOrigin = String(input.origin ?? "").trim();
    const origin = /^https:\/\/[\w.-]+\.lovable\.app$/.test(rawOrigin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(rawOrigin)
      ? rawOrigin
      : "";
    return {
      bookingId: input.bookingId,
      method: input.method === "CARD" ? ("CARD" as const) : ("MOMO" as const),
      provider: String(input.provider ?? "").trim().slice(0, 40),
      phone: String(input.phone ?? "").trim().slice(0, 20),
      country: (String(input.country ?? "CM").toUpperCase().slice(0, 2) || "CM"),
      origin,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");

    // The back/cancel link on Stripe must land on the app the payer came
    // from, so the session URLs follow the caller's origin when available.
    const appUrl = data.origin || process.env["APP_URL"] || "https://ashglogroup.company";

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

    // Resume an in-flight payment when the rail still has a live attempt.
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
            successUrl: `${appUrl}/booking/${booking.id}/confirmed`,
            cancelUrl: `${appUrl}/bookings`,
            metadata: { booking_id: booking.id },
          });
          if (resumed.ok && resumed.checkoutUrl) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("bookings").update({ provider_transaction_id: resumed.id }).eq("id", booking.id);
            return { ok: true as const, reference: booking.payment_reference, checkoutUrl: resumed.checkoutUrl, error: null };
          }
        }
      } else if (
        booking.payment_provider !== "STRIPE" &&
        data.method === "MOMO" &&
        booking.provider_transaction_id?.startsWith("REQ-")
      ) {
        // A prompt is already on the payer's phone: don't send a second one.
        const current = await tchokoPay.getCollection(booking.provider_transaction_id);
        if (current.ok && (current.status === "PENDING" || current.status === "PROCESSING")) {
          return {
            ok: true as const,
            reference: booking.payment_reference,
            checkoutUrl: null,
            providerReference: booking.provider_transaction_id,
            status: current.status,
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

    // Card rail (Stripe): available worldwide, including to Cameroonian cards.
    if (data.method === "CARD") {
      const { stripePay, xafToUsdCents } = await import("./stripe.server");
      const amountCents = xafToUsdCents(Number(booking.price));
      const session = await stripePay.createCheckoutSession({
        reference,
        amountCents,
        currency: "USD",
        description: `ASH booking — ${booking.service_title}`,
        ...(profile?.email ? { email: profile.email } : {}),
        successUrl: `${appUrl}/booking/${booking.id}/confirmed`,
        cancelUrl: `${appUrl}/bookings`,
        metadata: { booking_id: booking.id },
      });

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (!session.ok || !session.checkoutUrl) {
        await supabaseAdmin.rpc("fail_booking_payment", { _payment_reference: reference, _status: "FAILED" });
        return { ok: false as const, error: session.error ?? "PAYMENT_START_FAILED" };
      }

      await supabaseAdmin
        .from("bookings")
        .update({
          payment_provider: "STRIPE",
          payment_currency: "USD",
          payment_amount: amountCents / 100,
          provider_transaction_id: session.id,
        })
        .eq("id", booking.id);

      return { ok: true as const, reference, checkoutUrl: session.checkoutUrl, error: null };
    }

    // Mobile money rail: a direct charge, so the payer stays inside ASH and
    // simply approves the prompt on their phone.
    if (!data.provider || !data.phone) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("fail_booking_payment", { _payment_reference: reference, _status: "FAILED" });
      return { ok: false as const, error: "MOMO_DETAILS_REQUIRED" };
    }

    const result = await tchokoPay.createCharge({
      merchantReference: reference,
      amount: Number(booking.price),
      currency: "XAF",
      country: data.country,
      provider: data.provider,
      phone: data.phone || (profile?.phone ?? ""),
      description: `ASH booking — ${booking.service_title}`,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!result.ok) {
      await supabaseAdmin.rpc("fail_booking_payment", {
        _payment_reference: reference,
        _status: "FAILED",
      });
      return {
        ok: false as const,
        error: result.error ?? "PAYMENT_START_FAILED",
        message: result.message ?? null,
      };
    }

    await supabaseAdmin
      .from("bookings")
      .update({
        payment_provider: "TCHOKOPAY",
        payment_currency: "XAF",
        provider_transaction_id: result.providerReference ?? null,
      })
      .eq("id", booking.id);

    return {
      ok: true as const,
      reference,
      checkoutUrl: null,
      providerReference: result.providerReference ?? null,
      status: result.status,
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
      .select("id, client_id, status, payment_reference, invoice_number, payment_provider, provider_transaction_id")
      .eq("id", data.bookingId)
      .maybeSingle();

    if (!booking || booking.client_id !== userId) return { ok: false as const, error: "NOT_FOUND" };
    if (["CONFIRMED", "IN_PROGRESS", "COMPLETED", "SETTLED"].includes(booking.status)) {
      return { ok: true as const, status: "PAID" as const, bookingStatus: booking.status, error: null };
    }
    if (!booking.payment_reference) {
      return { ok: true as const, status: "PENDING" as const, bookingStatus: booking.status, error: null };
    }

    // Only the verified Marketplace webhook can confirm a card booking.
    // A Checkout return or API polling result is not a settlement authority.
    if (booking.payment_provider === "STRIPE") {
      return { ok: true as const, status: "PENDING" as const, bookingStatus: booking.status, error: null };
    }

    let verification: {
      ok: boolean;
      status: "PAID" | "PENDING" | "FAILED" | "CANCELLED" | string;
      providerTransactionId?: string | null | undefined;
      error?: string | null | undefined;
    };

    {
      const { tchokoPay } = await import("./tchokopay.server");
      const providerRef = booking.provider_transaction_id ?? "";
      const collection = providerRef.startsWith("REQ-")
        ? await tchokoPay.getCollection(providerRef)
        : await tchokoPay.verifyLegacyPayment(booking.payment_reference);
      verification = {
        ok: collection.ok,
        status: collection.status,
        providerTransactionId: collection.providerReference ?? providerRef,
        error: collection.error,
      };
    }

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
