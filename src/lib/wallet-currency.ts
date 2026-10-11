import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DISPLAY_CURRENCIES } from "@/lib/currency-catalog";

/**
 * One wallet, real money per currency. XAF is Mobile Money (TchokoPay) money;
 * every other currency is card money exactly as Stripe settled it. Amounts are
 * never converted between currencies for display or withdrawal.
 */
export const BASE_CURRENCIES = DISPLAY_CURRENCIES;

export type CurrencyBalance = {
  currency: string;
  available: number;
  pending: number;
  totalIn: number;
  totalOut: number;
};

const ZERO_DECIMAL = new Set(["XAF", "XOF", "JPY", "KRW", "RWF", "UGX", "GNF"]);

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

export function formatMoney(value: number | string | null | undefined, currency: string): string {
  const n = Number(value ?? 0);
  const cur = currency.toUpperCase();
  if (cur === "XAF") {
    const sign = n < 0 ? "-" : "";
    return `${sign}${Math.abs(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} XAF`;
  }
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: cur, currencyDisplay: "symbol" }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

/** Withdrawals leave the same way the money came in. */
export function withdrawalMethodsFor(currency: string): Array<"MTN_MOMO" | "ORANGE_MONEY" | "STRIPE_BANK"> {
  return currency.toUpperCase() === "XAF" ? ["MTN_MOMO", "ORANGE_MONEY"] : ["STRIPE_BANK"];
}

export function minWithdrawalFor(currency: string): number {
  return currency.toUpperCase() === "XAF" ? 100 : 1;
}

export function balanceFor(balances: CurrencyBalance[], currency: string): CurrencyBalance {
  const cur = currency.toUpperCase();
  return balances.find((b) => b.currency === cur) ?? { currency: cur, available: 0, pending: 0, totalIn: 0, totalOut: 0 };
}

export function useWalletBalances() {
  return useQuery({
    queryKey: ["wallet-balances"],
    queryFn: async (): Promise<CurrencyBalance[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const [{ data: w, error: we }, { data: rows, error: re }] = await Promise.all([
        supabase.from("wallets").select("available_balance, pending_balance, card_balance, total_earned, total_withdrawn").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("wallet_balances").select("currency, available, pending, total_in, total_out").eq("user_id", auth.user.id),
      ]);
      if (we) throw we;
      if (re) throw re;
      const xaf: CurrencyBalance = {
        currency: "XAF",
        available: Math.max(Number(w?.available_balance ?? 0) - Number(w?.card_balance ?? 0), 0),
        pending: Number(w?.pending_balance ?? 0),
        totalIn: Number(w?.total_earned ?? 0),
        totalOut: Number(w?.total_withdrawn ?? 0),
      };
      return [xaf, ...(rows ?? []).map((r) => ({
        currency: String(r.currency).toUpperCase(),
        available: Number(r.available ?? 0),
        pending: Number(r.pending ?? 0),
        totalIn: Number(r.total_in ?? 0),
        totalOut: Number(r.total_out ?? 0),
      }))];
    },
  });
}

export function currencyOptions(balances: CurrencyBalance[]): string[] {
  const set = new Set<string>(BASE_CURRENCIES);
  for (const b of balances) set.add(b.currency);
  return [...set];
}

const KEY = "ash.wallet.currency";

/** Selected wallet currency, saved on this device. Read after hydration. */
export function useWalletCurrency(): [string, (c: string) => void] {
  const [currency, setCurrency] = useState("XAF");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved && /^[A-Z]{3}$/.test(saved)) setCurrency(saved);
    } catch { /* private mode */ }
  }, []);
  const update = (c: string) => {
    setCurrency(c);
    try { window.localStorage.setItem(KEY, c); } catch { /* private mode */ }
  };
  return [currency, update];
}

export type FlowRange = "7d" | "30d" | "12m";
export type FlowPoint = { label: string; in: number; out: number };

type TxLike = { amount: number | string | null; currency?: string | null; status?: string | null; created_at: string; type?: string | null };

/** Money in/out per day (7d, 30d) or month (12m) for one currency, from completed movements only. */
export function buildMoneyFlow(rows: TxLike[], currency: string, range: FlowRange, now = new Date()): { points: FlowPoint[]; totalIn: number; totalOut: number } {
  const cur = currency.toUpperCase();
  const monthly = range === "12m";
  const count = range === "7d" ? 7 : range === "30d" ? 30 : 12;
  const keys: string[] = [];
  const labels: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (monthly) { d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i); } else d.setUTCDate(d.getUTCDate() - i);
    keys.push(monthly ? d.toISOString().slice(0, 7) : d.toISOString().slice(0, 10));
    labels.push(monthly ? d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }));
  }
  const map = new Map(keys.map((k, i) => [k, { label: labels[i] ?? "", in: 0, out: 0 }]));
  let totalIn = 0;
  let totalOut = 0;
  for (const r of rows) {
    if ((r.currency ?? "XAF").toUpperCase() !== cur) continue;
    if (r.status && !["COMPLETED", "SUCCESS"].includes(r.status)) continue;
    const key = monthly ? r.created_at.slice(0, 7) : r.created_at.slice(0, 10);
    const bucket = map.get(key);
    if (!bucket) continue;
    const v = Number(r.amount ?? 0);
    if (v >= 0) { bucket.in += v; totalIn += v; } else { bucket.out += -v; totalOut += -v; }
  }
  return { points: [...map.values()], totalIn, totalOut };
}
