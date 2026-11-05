import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_PROVIDER_COLUMNS } from "./provider-public-columns";

/** Signed-in members keep full access; guests are limited to the public columns. */
export async function providerColumns(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session ? "*" : PUBLIC_PROVIDER_COLUMNS;
}

export type PublicProviderIdentity = {
  id: string;
  user_id: string | null;
  business_name: string;
  slug: string | null;
  city: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  categories: string[] | null;
  rating_avg: number;
  rating_count: number;
};

/** Guest-safe lookup of storefront identities for the given owners or provider ids. */
export async function fetchPublicProviderIdentities(
  userIds: string[],
  providerIds: string[],
): Promise<PublicProviderIdentity[]> {
  const { data, error } = await (supabase as any).rpc("public_provider_identities", {
    _user_ids: userIds,
    _provider_ids: providerIds,
  });
  if (error) throw error;
  return (data ?? []) as unknown as PublicProviderIdentity[];
}
