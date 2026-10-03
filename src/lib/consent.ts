import { supabase } from "@/integrations/supabase/client";

/** Bump when the Terms of Use / Community Guidelines change materially. */
export const TERMS_VERSION = "2026-10-03";

/** Records agreement to the current Terms of Use and Community Guidelines. */
export async function recordTermsAcceptance(userId: string) {
  return supabase
    .from("profiles")
    .update({ terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION })
    .eq("user_id", userId);
}

/**
 * Members must agree to the Terms of Service and Privacy Policy once, then add
 * a profile picture, before they can use the app. A missing profile row is
 * treated as "not yet agreed".
 */
export async function needsConsent(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("user_id", userId)
    .maybeSingle();

  // Never lock anyone out because a read failed.
  if (error) return false;
  return !(data as { terms_accepted_at?: string | null } | null)?.terms_accepted_at;
}

/** True when the member has agreed but still has no profile picture. */
export async function needsProfilePhoto(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !(data as { avatar_url?: string | null } | null)?.avatar_url;
}

/** Where a freshly signed-in member should land. */
export async function nextOnboardingRoute(userId: string): Promise<"/consent" | "/setup-profile" | "/feed"> {
  if (await needsConsent(userId)) return "/consent";
  if (await needsProfilePhoto(userId)) return "/setup-profile";
  return "/feed";
}
