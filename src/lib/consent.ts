import { supabase } from "@/integrations/supabase/client";

/** Bump when the Terms of Use / Community Guidelines change materially. */
export const TERMS_VERSION = "2026-10-05";

/** Browser flag set when the agreement box is ticked on the sign-up screen. */
const PENDING_KEY = "ash-terms-agreed";

export function markPendingTermsAgreement(agreed: boolean) {
  try {
    if (agreed) localStorage.setItem(PENDING_KEY, TERMS_VERSION);
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable */
  }
}

function readPendingAgreement(): boolean {
  try {
    return localStorage.getItem(PENDING_KEY) === TERMS_VERSION;
  } catch {
    return false;
  }
}

/** Records agreement to the current Terms of Use and Community Guidelines. */
export async function recordTermsAcceptance(userId: string) {
  return supabase
    .from("profiles")
    .update({ terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION })
    .eq("user_id", userId);
}

/**
 * The agreement given on the sign-up screen (before the account existed) is
 * saved to the profile once a verified session exists, so new members are not
 * asked to accept the same Terms a second time.
 */
async function applyPendingAgreement(userId: string) {
  const { data } = await supabase.auth.getSession();
  const meta = (data.session?.user.user_metadata ?? {}) as { terms_version?: string };
  if (meta.terms_version !== TERMS_VERSION && !readPendingAgreement()) return;
  const { error } = await recordTermsAcceptance(userId);
  if (!error) markPendingTermsAgreement(false);
}

/** True when the member has not accepted the current Terms version. */
export function lacksCurrentTerms(
  profile: { terms_accepted_at?: string | null; terms_version?: string | null } | null,
) {
  if (!profile) return false;
  return !profile.terms_accepted_at || profile.terms_version !== TERMS_VERSION;
}

export async function needsConsent(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("terms_accepted_at, terms_version")
    .eq("user_id", userId)
    .maybeSingle();

  // Never lock anyone out because a read failed.
  if (error || !data) return false;
  return lacksCurrentTerms(
    data as { terms_accepted_at: string | null; terms_version: string | null },
  );
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
export async function nextOnboardingRoute(
  userId: string,
): Promise<"/consent" | "/setup-profile" | "/feed"> {
  if (await needsConsent(userId)) {
    await applyPendingAgreement(userId);
    if (await needsConsent(userId)) return "/consent";
  }
  if (await needsProfilePhoto(userId)) return "/setup-profile";
  return "/feed";
}
