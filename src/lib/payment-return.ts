/** Only this app's configured public addresses and local development can receive checkout returns. */
export const PAYMENT_RETURN_ORIGIN = "https://ashglogroup.company";

export function paymentReturnOrigin(raw: unknown): string {
  const origin = String(raw ?? "").trim();
  if (
    /^https:\/\/(www\.)?(ashglogroup\.company|growrefer\.app)$/.test(origin) ||
    origin === "https://ash-global.lovable.app" ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  )
    return origin;
  // Credential-bearing and transient preview addresses must never be sent to Stripe.
  return PAYMENT_RETURN_ORIGIN;
}

export function bookingTrackingPath(bookingId: string): string {
  return `/booking/${encodeURIComponent(bookingId)}/track`;
}
