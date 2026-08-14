import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
  commissions: number;
};

export function useNetwork() {
  return useQuery({
    queryKey: ["network"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { levels: [] as NetworkLevel[], total: 0, direct: 0 };

      const { data: refs, error } = await supabase
        .from("referrals")
        .select("referred_user_id, level, created_at")
        .eq("referrer_id", auth.user.id);
      if (error) throw error;

      const ids = (refs ?? []).map((r) => r.referred_user_id);
      let statuses: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, account_status")
          .in("user_id", ids);
        statuses = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.account_status]));
      }

      const { data: commissionTx } = await supabase
        .from("transactions")
        .select("amount, description")
        .eq("type", "REFERRAL_COMMISSION");

      const commissionByLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      for (const tx of commissionTx ?? []) {
        const match = /Level (\d)/.exec(tx.description ?? "");
        const lvl = match ? Number(match[1]) : 0;
        if (lvl >= 1 && lvl <= 3) commissionByLevel[lvl] = (commissionByLevel[lvl] ?? 0) + Number(tx.amount);
      }

      const levels: NetworkLevel[] = [1, 2, 3].map((level) => {
        const members = (refs ?? []).filter((r) => r.level === level);
        return {
          level,
          members: members.length,
          active: members.filter((m) => statuses[m.referred_user_id] === "ACTIVE").length,
          commissions: commissionByLevel[level] ?? 0,
        };
      });

      return {
        levels,
        total: refs?.length ?? 0,
        direct: levels[0]?.members ?? 0,
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
