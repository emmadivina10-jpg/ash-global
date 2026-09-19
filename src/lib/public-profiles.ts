import { supabase } from "@/integrations/supabase/client";

/**
 * Safe, member-visible directory of other people (name, handle, photo,
 * verification, city, birthday). The full `profiles` table stays private to
 * its owner and admins, so every peer lookup must go through here.
 */
export type DirectoryProfile = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verified_tier: string | null;
  verified_until: string | null;
  birthday: string | null;
  city: string | null;
  account_status: string | null;
  created_at: string | null;
};

type LooseClient = {
  from: (table: string) => ReturnType<typeof supabase.from<never, never>>;
};

/** Query builder over the public member directory. */
export function directory() {
  return (supabase as unknown as LooseClient).from("public_profiles");
}
