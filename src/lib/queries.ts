import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getNetworkTree, type NetworkNode } from "./network.functions";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTransactions(limit = 100) {
  return useQuery({
    queryKey: ["transactions", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type NetworkLevel = {
  level: number;
  members: number;
  active: number;
  pending: number;
  commissions: number;
  pendingCommissions: number;
};

/**
 * Referral figures come from the referral ledger (activation_status /
 * commission_status / commission_amount), which the backend maintains when an
 * activation payment is verified. Nothing here is derived from frontend state.
 */
export function useNetwork() {
  return useQuery({
    queryKey: ["network"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        return {
          levels: [] as NetworkLevel[],
          total: 0,
          direct: 0,
          pendingTotal: 0,
          earnedTotal: 0,
        };
      }

      const { data: refs, error } = await supabase
        .from("referrals")
        .select("referred_user_id, level, activation_status, commission_status, commission_amount")
        .eq("referrer_id", auth.user.id);
      if (error) throw error;

      const levels: NetworkLevel[] = [1, 2, 3].map((level) => {
        const members = (refs ?? []).filter((r) => r.level === level);
        const earned = members.filter((m) => m.commission_status === "EARNED");
        const pending = members.filter((m) => m.commission_status === "PENDING");
        return {
          level,
          members: members.length,
          active: members.filter((m) => m.activation_status === "ACTIVE").length,
          pending: pending.length,
          commissions: earned.reduce((sum, m) => sum + Number(m.commission_amount ?? 0), 0),
          pendingCommissions: pending.reduce((sum, m) => sum + Number(m.commission_amount ?? 0), 0),
        };
      });

      return {
        levels,
        total: refs?.length ?? 0,
        direct: levels[0]?.members ?? 0,
        pendingTotal: levels.reduce((s, l) => s + l.pendingCommissions, 0),
        earnedTotal: levels.reduce((s, l) => s + l.commissions, 0),
      };
    },
  });
}

export function useWithdrawals() {
  return useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
}

export function useNetworkTree() {
  const fetch = useServerFn(getNetworkTree);
  return useQuery({
    queryKey: ["network-tree"],
    queryFn: fetch,
  });
}
