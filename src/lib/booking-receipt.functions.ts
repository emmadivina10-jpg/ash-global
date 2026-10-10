import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BookingReceipt = {
  viewer: "CUSTOMER" | "PROVIDER" | "STAFF";
  bookingId: string;
  receiptNumber: string | null;
  transactionId: string | null;
  paymentReference: string | null;
  status: string;
  paid: boolean;
  paidAt: string | null;
  scheduledAt: string | null;
  location: string | null;
  service: string;
  category: string | null;
  amount: number;
  currency: string;
  chargedAmount: number | null;
  chargedCurrency: string | null;
  paymentMethod: string | null;
  commissionRate: number | null;
  commission: number | null;
  providerEntitlement: number | null;
  entitlementStatus: string | null;
  verificationStatus: string | null;
  tripStatus: string;
  tripStartedAt: string | null;
  arrivedAt: string | null;
  customer: { name: string | null; email: string | null; phone: string | null; avatar: string | null };
  provider: { profileId: string; userId: string | null; name: string | null; phone: string | null; avatar: string | null; verified: boolean };
  /** Only ever filled for the paying customer. */
  verificationCode: string | null;
  codeExpiresAt: string | null;
  codeUsed: boolean;
};


/** Builds the receipt from saved records only. The code is attached only for the customer. */
async function buildReceipt(bookingId: string, viewer: BookingReceipt["viewer"], viewerUserId: string | null): Promise<BookingReceipt | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: b } = await supabaseAdmin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return null;
  const { data: prov } = await supabaseAdmin
    .from("provider_profiles")
    .select("user_id, business_name, phone, avatar_url, is_verified, country")
    .eq("id", b.provider_id)
    .maybeSingle();

  let role = viewer;
  if (viewer !== "STAFF") {
    if (b.client_id === viewerUserId) role = "CUSTOMER";
    else if (prov?.user_id && prov.user_id === viewerUserId) role = "PROVIDER";
    else return null;
  }

  const [{ data: cust }, svc, code] = await Promise.all([
    supabaseAdmin.from("profiles").select("full_name, email, phone, avatar_url").eq("user_id", b.client_id).maybeSingle(),
    b.service_id
      ? supabaseAdmin.from("provider_services").select("category").eq("id", b.service_id).maybeSingle()
      : Promise.resolve({ data: null }),
    role === "CUSTOMER"
      ? supabaseAdmin.from("booking_verification_codes").select("code, expires_at, used_at").eq("booking_id", b.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { data: provOwner } = prov?.user_id
    ? await supabaseAdmin.from("profiles").select("avatar_url").eq("user_id", prov.user_id).maybeSingle()
    : { data: null };
  // Avatars bucket is private: storage paths become short-lived signed links.
  const photo = async (v: unknown): Promise<string | null> => {
    if (typeof v !== "string" || !v) return null;
    if (/^https:\/\//.test(v)) return v;
    const { data: signed } = await supabaseAdmin.storage.from("avatars").createSignedUrl(v.replace(/^avatars\//, ""), 3600);
    return signed?.signedUrl ?? null;
  };
  const [custAvatar, provAvatar] = await Promise.all([photo(cust?.avatar_url), photo(prov?.avatar_url ?? provOwner?.avatar_url)]);
  const paid = !!b.paid_at;
  const showProviderContact = paid; // contact details only after payment
  const codeRow = code.data as { code: string; expires_at: string; used_at: string | null } | null;

  return {
    viewer: role,
    bookingId: b.id,
    receiptNumber: b.invoice_number ?? null,
    transactionId: b.provider_transaction_id ?? null,
    paymentReference: b.payment_reference ?? null,
    status: b.status,
    paid,
    paidAt: b.paid_at ?? null,
    scheduledAt: b.scheduled_at ?? null,
    location: b.address ?? null,
    service: b.service_title,
    category: (svc.data as { category?: string } | null)?.category ?? null,
    amount: Number(b.price),
    currency: "XAF",
    chargedAmount: b.payment_amount != null ? Number(b.payment_amount) : null,
    chargedCurrency: b.payment_currency ?? null,
    paymentMethod: b.payment_provider ?? null,
    commissionRate: b.commission_rate != null ? Number(b.commission_rate) : null,
    commission: b.platform_fee != null ? Number(b.platform_fee) : null,
    providerEntitlement: b.provider_amount != null ? Number(b.provider_amount) : null,
    entitlementStatus: b.provider_transfer_status ?? null,
    verificationStatus: b.verification_status ?? null,
    tripStatus: b.trip_status ?? "NOT_STARTED",
    tripStartedAt: b.trip_started_at ?? null,
    arrivedAt: b.arrived_at ?? null,
    customer: {
      name: cust?.full_name ?? null,
      // Provider sees only the customer's name and photo; staff and the customer see all.
      email: role === "PROVIDER" ? null : cust?.email ?? null,
      phone: role === "PROVIDER" && !paid ? null : cust?.phone ?? null,
      avatar: custAvatar,
    },
    provider: {
      profileId: b.provider_id,
      userId: prov?.user_id ?? null,
      name: prov?.business_name ?? null,
      phone: showProviderContact || role !== "CUSTOMER" ? prov?.phone ?? null : null,
      avatar: provAvatar,
      verified: !!prov?.is_verified,
    },
    verificationCode: role === "CUSTOMER" && codeRow && !codeRow.used_at ? codeRow.code : null,
    codeExpiresAt: role === "CUSTOMER" ? codeRow?.expires_at ?? null : null,
    codeUsed: !!codeRow?.used_at,
  };
}

/** Customer or provider of the booking. */
export const getBookingReceipt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { bookingId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(i?.bookingId ?? ""))) throw new Error("INVALID_BOOKING");
    return { bookingId: i.bookingId };
  })
  .handler(async ({ data, context }) => {
    const r = await buildReceipt(data.bookingId, "CUSTOMER", context.userId);
    if (!r) throw new Error("NOT_FOUND");
    return r;
  });

/** Staff (super admin, Finance, Trust & Safety, Support, Marketplace Ops). Never includes the code. */
export const getStaffBookingReceipt = createServerFn({ method: "GET" })
  .inputValidator((i: { bookingId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(i?.bookingId ?? ""))) throw new Error("INVALID_BOOKING");
    return { bookingId: i.bookingId };
  })
  .handler(async ({ data }) => {
    const { requireDepartment } = await import("./console.server");
    await requireDepartment("REVENUE", "TRUST", "SUPPORT", "MARKETPLACE_OPS");
    const r = await buildReceipt(data.bookingId, "STAFF", null);
    if (!r) throw new Error("NOT_FOUND");
    return r;
  });
