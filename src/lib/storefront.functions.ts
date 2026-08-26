import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type StorefrontService = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string;
};

export type StorefrontPhoto = { id: string; url: string; caption: string | null };

export type Storefront = {
  id: string;
  slug: string;
  business_name: string;
  tagline: string | null;
  bio: string | null;
  city: string | null;
  whatsapp: string | null;
  phone: string | null;
  categories: string[];
  avatar_url: string | null;
  cover_url: string | null;
  is_verified: boolean;
  accepting_bookings: boolean;
  rating_avg: number;
  rating_count: number;
  completed_bookings: number;
  services: StorefrontService[];
  photos: StorefrontPhoto[];
  reviews: { id: string; rating: number; comment: string | null; created_at: string }[];
};

/** Read-only client bound to the publishable key (anon RLS policies apply). */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Public catalog for a shareable storefront link (/s/:slug). */
export const getStorefront = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({ slug: String(input?.slug ?? "").slice(0, 80) }))
  .handler(async ({ data }): Promise<Storefront | null> => {
    if (!data.slug) return null;
    const supabase = publicClient();

    const { data: provider } = await supabase
      .from("provider_profiles")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_live", true)
      .maybeSingle();
    if (!provider) return null;

    const [{ data: services }, { data: photos }, { data: reviews }] = await Promise.all([
      supabase
        .from("provider_services")
        .select("id, title, description, price, duration_minutes, category")
        .eq("provider_id", provider.id)
        .eq("is_active", true)
        .order("price", { ascending: true }),
      supabase
        .from("portfolio_items")
        .select("id, image_path, caption")
        .eq("provider_id", provider.id)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("reviews")
        .select("id, rating, comment, created_at")
        .eq("provider_id", provider.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const paths = (photos ?? []).map((p) => p.image_path).filter(Boolean);
    let signed: Record<string, string> = {};
    if (paths.length > 0) {
      const { data: urls } = await supabase.storage.from("portfolio").createSignedUrls(paths, 60 * 60 * 24 * 365);
      for (const u of urls ?? []) {
        if (u.path && u.signedUrl) signed[u.path] = u.signedUrl;
      }
    }

    return {
      id: provider.id,
      slug: provider.slug ?? data.slug,
      business_name: provider.business_name,
      tagline: provider.tagline ?? null,
      bio: provider.bio,
      city: provider.city,
      whatsapp: provider.whatsapp,
      phone: provider.phone,
      categories: (provider.categories ?? []) as string[],
      avatar_url: provider.avatar_url,
      cover_url: provider.cover_url,
      is_verified: provider.is_verified,
      accepting_bookings: provider.accepting_bookings,
      rating_avg: Number(provider.rating_avg ?? 0),
      rating_count: Number(provider.rating_count ?? 0),
      completed_bookings: Number(provider.completed_bookings ?? 0),
      services: (services ?? []) as StorefrontService[],
      photos: (photos ?? [])
        .map((p) => ({ id: p.id, url: signed[p.image_path] ?? "", caption: p.caption }))
        .filter((p) => p.url),
      reviews: (reviews ?? []) as Storefront["reviews"],
    };
  });

export type PublicPaymentLink = {
  code: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  business_name: string;
  slug: string | null;
  is_verified: boolean;
  is_active: boolean;
};

/** Public read of a payment link (/pay/:code). */
export const getPaymentLink = createServerFn({ method: "GET" })
  .inputValidator((input: { code: string }) => ({ code: String(input?.code ?? "").slice(0, 40) }))
  .handler(async ({ data }): Promise<PublicPaymentLink | null> => {
    if (!data.code) return null;
    const supabase = publicClient();
    const { data: link } = await supabase
      .from("payment_links")
      .select("code, title, description, amount, currency, is_active, provider_profiles(business_name, slug, is_verified)")
      .eq("code", data.code)
      .maybeSingle();
    if (!link) return null;
    const provider = link.provider_profiles as unknown as
      | { business_name: string; slug: string | null; is_verified: boolean }
      | null;
    return {
      code: link.code,
      title: link.title,
      description: link.description,
      amount: link.amount,
      currency: link.currency,
      is_active: link.is_active,
      business_name: provider?.business_name ?? "ASH Glo",
      slug: provider?.slug ?? null,
      is_verified: Boolean(provider?.is_verified),
    };
  });

function makeReference(): string {
  return `PLK-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

/** Starts a TchokoPay checkout for a payment link. Anyone with the link can pay. */
export const startLinkPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; name: string; phone: string }) => ({
    code: String(input?.code ?? "").slice(0, 40),
    name: String(input?.name ?? "").trim().slice(0, 80),
    phone: String(input?.phone ?? "").trim().slice(0, 20),
  }))
  .handler(async ({ data }) => {
    if (!data.code || !data.name || !data.phone) return { ok: false as const, error: "INVALID_INPUT" };

    const supabase = publicClient();
    const { data: link } = await supabase
      .from("payment_links")
      .select("id, code, title, amount, currency, is_active")
      .eq("code", data.code)
      .maybeSingle();
    if (!link || !link.is_active) return { ok: false as const, error: "LINK_UNAVAILABLE" };

    const reference = makeReference();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: chargeError } = await supabaseAdmin.from("payment_link_charges").insert({
      link_id: link.id,
      reference,
      amount: link.amount,
      payer_name: data.name,
      payer_phone: data.phone,
    });
    if (chargeError) return { ok: false as const, error: "CHARGE_CREATE_FAILED" };

    const appUrl = process.env["APP_URL"] ?? "https://growrefer.app";
    const { tchokoPay } = await import("./tchokopay.server");
    const result = await tchokoPay.createPayment({
      reference,
      amount: link.amount,
      currency: link.currency || "XAF",
      description: `ASH — ${link.title}`,
      customer: { name: data.name, email: "", phone: data.phone },
      callbackUrl: `${appUrl}/api/public/webhooks/tchokopay`,
      returnUrl: `${appUrl}/pay/${link.code}?ref=${reference}`,
    });

    if (!result.ok) {
      await supabaseAdmin.rpc("fail_link_payment", { _payment_reference: reference, _status: "FAILED" });
      return { ok: false as const, error: result.error ?? "PAYMENT_START_FAILED" };
    }

    return { ok: true as const, reference, checkoutUrl: result.checkoutUrl ?? null };
  });

/** Verifies a link payment against the provider API (source of truth). */
export const verifyLinkPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { reference: string }) => ({ reference: String(input?.reference ?? "").slice(0, 64) }))
  .handler(async ({ data }) => {
    if (!data.reference.startsWith("PLK-")) return { ok: false as const, status: "NOT_FOUND" as const };
    const { tchokoPay } = await import("./tchokopay.server");
    const verification = await tchokoPay.verifyPayment(data.reference);
    if (!verification.ok) return { ok: false as const, status: "UNVERIFIED" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (verification.status === "PAID") {
      await supabaseAdmin.rpc("complete_link_payment", {
        _payment_reference: data.reference,
        _provider_transaction_id: (verification.providerTransactionId ?? null) as unknown as string,
      });
      return { ok: true as const, status: "PAID" as const };
    }
    if (verification.status === "FAILED" || verification.status === "CANCELLED") {
      await supabaseAdmin.rpc("fail_link_payment", { _payment_reference: data.reference, _status: verification.status });
    }
    return { ok: true as const, status: verification.status };
  });
