import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NetworkNode = {
  id: string;
  parent_id: string | null;
  level: number;
  account_status: string;
  joined_at: string;
  commission: number;
};

/** Returns the signed-in user's 3-level referral tree with status and earnings. */
export const getNetworkTree = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabase } = context;
  const { data, error } = await supabase.rpc("get_user_network_tree");
  if (error) throw error;

  return (data ?? []).map((n: Record<string, unknown>) => ({
    id: String(n.id),
    parent_id: n.parent_id ? String(n.parent_id) : null,
    level: Number(n.level),
    account_status: String(n.account_status),
    joined_at: String(n.joined_at),
    commission: Number(n.commission),
  })) as NetworkNode[];
});
