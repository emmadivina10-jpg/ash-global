import { supabase } from "@/integrations/supabase/client";
import type { IdentityStatus } from "./identity.functions";

export async function identityStatus(): Promise<IdentityStatus> {
  const { data, error } = await supabase.rpc("my_identity_status");
  if (error) throw new Error("Identity status unavailable. Please try again.");
  return data as unknown as IdentityStatus;
}

export function announceIdentityDenial(status: IdentityStatus) {
  window.dispatchEvent(new CustomEvent("ash-identity-denied", { detail: status }));
}

export const IDENTITY_DENIED = "Denied — this name or profile picture belongs to a verified account.";