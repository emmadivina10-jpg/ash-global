import { createServerFn } from "@tanstack/react-start";

/** Public: checks that a referral code exists. Returns nothing else about the owner. */
export const validateReferralCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => ({ code: String(input?.code ?? "").trim().slice(0, 32) }))
  .handler(async ({ data }) => {
    if (!/^REFER-[A-Z0-9]{6}$/i.test(data.code)) return { valid: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("referral_code")
      .ilike("referral_code", data.code)
      .maybeSingle();
    return { valid: Boolean(profile) };
  });
