import { supabase } from "@/integrations/supabase/client";

/**
 * Members must agree to the Terms of Service and Privacy Policy once before
 * they can use the app. A missing profile row is treated as "not yet agreed".
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
