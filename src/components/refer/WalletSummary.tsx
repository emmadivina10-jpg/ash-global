import { Link } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/queries";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function WalletSummary({ onClose }: { onClose?: () => void }) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { data: wallet, isLoading, error } = useWallet();
  const amount = (value: number | undefined) => isLoading ? "…" : error ? "—" : formatXAF(value ?? 0);
  return <div className="p-4">
    <div className="virtual-card grain relative overflow-hidden p-5">
      <div className="flex items-center justify-between"><span className="text-xs font-extrabold uppercase opacity-70">ASH Card</span><CreditCard className="size-5" /></div>
      <p className="mt-7 text-xs opacity-65">{fr ? "Solde disponible" : "Available balance"}</p>
      <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{amount(wallet?.available_balance)}</p>
      <div className="mt-6 flex items-center justify-between border-t border-primary-foreground/15 pt-3 text-xs"><span className="opacity-65">{fr ? "En attente" : "Pending"}</span><strong>{amount(wallet?.pending_balance)}</strong></div>
    </div>
    <Button asChild className="mt-4 w-full"><Link to="/wallet" onClick={onClose}>{fr ? "Portefeuille" : "Wallet"}</Link></Button>
  </div>;
}