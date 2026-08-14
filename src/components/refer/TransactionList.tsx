import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./states";
import { formatDateTime, formatSignedXAF, transactionLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TransactionRow = {
  id: string;
  type: string;
  amount: number | string;
  reference: string;
  description: string | null;
  status: string;
  created_at: string;
};

export function TransactionList({ items }: { items: TransactionRow[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="size-5" aria-hidden />}
        title="No transactions yet"
        description="Every activation payment, commission and withdrawal will appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((tx) => {
        const amount = Number(tx.amount);
        const positive = amount > 0;
        return (
          <li key={tx.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3.5">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full",
                positive ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
              )}
            >
              {positive ? (
                <ArrowDownLeft className="size-4" aria-hidden />
              ) : (
                <ArrowUpRight className="size-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{transactionLabel(tx.type)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatDateTime(tx.created_at)} · {tx.reference}
              </p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "tabular text-sm font-bold",
                  positive ? "text-success" : "text-foreground",
                )}
              >
                {formatSignedXAF(amount)}
              </p>
              <StatusBadge status={tx.status} className="mt-1" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
