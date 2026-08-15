import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConsoleLedger } from "@/lib/console.functions";
import { SectionCard } from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "PLATFORM_FEE", label: "Platform fees" },
  { key: "BOOKING_EARNING", label: "Provider earnings" },
  { key: "REFERRAL_COMMISSION", label: "Referral commissions" },
  { key: "ACTIVATION_PAYMENT", label: "Activations" },
  { key: "WITHDRAWAL", label: "Withdrawals" },
] as const;

export const Route = createFileRoute("/console/ledger")({
  component: ConsoleLedger,
});

function ConsoleLedger() {
  const fetchLedger = useServerFn(getConsoleLedger);
  const [filter, setFilter] = useState<string>("ALL");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "ledger"],
    queryFn: fetchLedger,
  });

  const items = (data ?? []).filter((tx) => filter === "ALL" || tx.type.startsWith(filter));

  return (
    <SectionCard title="Ledger" description="Immutable record of every money movement on the platform.">
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={filter === item.key ? "default" : "outline"}
            className={cn("rounded-full")}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonRows rows={8} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <TransactionList items={items} />
      )}
    </SectionCard>
  );
}
