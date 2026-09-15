import { useMemo, useState } from "react";
import { Download, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatSignedXAF, formatXAF, transactionLabel } from "@/lib/format";
import type { TransactionRow } from "./TransactionList";

const PERIODS = [
  { id: "30", en: "Last 30 days", fr: "30 derniers jours", days: 30 },
  { id: "90", en: "Last 90 days", fr: "90 derniers jours", days: 90 },
  { id: "365", en: "Last 12 months", fr: "12 derniers mois", days: 365 },
  { id: "all", en: "All time", fr: "Tout", days: 0 },
] as const;

export type StatementHolder = {
  name: string;
  email?: string | null;
  phone?: string | null;
  reference?: string | null;
};

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Printable financial statement. Rendering is presentation only — the rows
 * come straight from the transaction ledger, nothing is recalculated.
 */
export function StatementDialog({
  open,
  onClose,
  holder,
  transactions,
  fr = false,
}: {
  open: boolean;
  onClose: () => void;
  holder: StatementHolder;
  transactions: TransactionRow[];
  fr?: boolean;
}) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("90");

  const rows = useMemo(() => {
    const entry = PERIODS.find((p) => p.id === period);
    if (!entry || entry.days === 0) return transactions;
    const cutoff = Date.now() - entry.days * 24 * 60 * 60 * 1000;
    return transactions.filter((tx) => new Date(tx.created_at).getTime() >= cutoff);
  }, [period, transactions]);

  const totals = useMemo(() => {
    let credits = 0;
    let debits = 0;
    for (const tx of rows) {
      const amount = Number(tx.amount);
      if (amount >= 0) credits += amount;
      else debits += Math.abs(amount);
    }
    return { credits, debits, net: credits - debits };
  }, [rows]);

  if (!open) return null;

  function download() {
    const header = ["Date", "Type", "Reference", "Description", "Status", "Amount (XAF)"];
    const body = rows.map((tx) =>
      [
        new Date(tx.created_at).toISOString(),
        transactionLabel(tx.type),
        tx.reference,
        tx.description ?? "",
        tx.status,
        String(Number(tx.amount)),
      ]
        .map(csvEscape)
        .join(","),
    );
    const blob = new Blob([[header.map(csvEscape).join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ash-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm print:static print:block print:bg-transparent sm:items-center sm:p-4">
      <button
        type="button"
        aria-label={fr ? "Fermer" : "Close"}
        onClick={onClose}
        className="absolute inset-0 print:hidden"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={fr ? "Relevé financier" : "Financial statement"}
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-raised)] print:max-h-none print:rounded-none print:border-0 print:shadow-none sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 print:hidden">
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold text-foreground">
              {fr ? "Relevé financier" : "Financial statement"}
            </p>
            <p className="text-xs text-muted-foreground">
              {fr ? "Imprimez ou enregistrez en PDF" : "Print or save as PDF"}
            </p>
          </div>
          <Button size="icon" variant="ghost" aria-label={fr ? "Fermer" : "Close"} onClick={onClose}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3 print:hidden">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={
                period === item.id
                  ? "rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              }
            >
              {fr ? item.fr : item.en}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={download}>
              <Download className="size-4" aria-hidden />
              CSV
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              {fr ? "Imprimer" : "Print"}
            </Button>
          </div>
        </div>

        <div className="ash-statement overflow-y-auto px-5 py-5 print:overflow-visible">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="font-display text-xl font-extrabold text-foreground">ASH Glo</p>
              <p className="text-xs text-muted-foreground">
                {fr ? "Relevé de compte" : "Account statement"} ·{" "}
                {new Date().toLocaleDateString(fr ? "fr-FR" : "en-GB")}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="text-sm font-bold text-foreground">{holder.name}</p>
              {holder.email ? <p>{holder.email}</p> : null}
              {holder.phone ? <p>{holder.phone}</p> : null}
              {holder.reference ? <p>{fr ? "Code" : "Code"}: {holder.reference}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 py-4">
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {fr ? "Entrées" : "Money in"}
              </p>
              <p className="tabular mt-1 text-sm font-bold text-success">{formatXAF(totals.credits)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {fr ? "Sorties" : "Money out"}
              </p>
              <p className="tabular mt-1 text-sm font-bold text-foreground">{formatXAF(totals.debits)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {fr ? "Net" : "Net"}
              </p>
              <p className="tabular mt-1 text-sm font-bold text-foreground">{formatSignedXAF(totals.net)}</p>
            </div>
          </div>

          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 font-bold">Date</th>
                <th className="py-2 pr-2 font-bold">{fr ? "Opération" : "Type"}</th>
                <th className="py-2 pr-2 font-bold">{fr ? "Référence" : "Reference"}</th>
                <th className="py-2 pr-2 font-bold">{fr ? "Statut" : "Status"}</th>
                <th className="py-2 text-right font-bold">{fr ? "Montant" : "Amount"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-2 text-muted-foreground">{formatDateTime(tx.created_at)}</td>
                  <td className="py-2 pr-2 font-semibold text-foreground">{transactionLabel(tx.type)}</td>
                  <td className="py-2 pr-2 break-all text-muted-foreground">{tx.reference}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{tx.status}</td>
                  <td className="tabular py-2 text-right font-bold text-foreground">
                    {formatSignedXAF(Number(tx.amount))}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    {fr ? "Aucune opération sur cette période." : "No transactions in this period."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <p className="mt-5 text-[10px] leading-relaxed text-muted-foreground">
            {fr
              ? "Document généré automatiquement depuis le registre ASH Glo. Les montants sont en francs CFA (XAF)."
              : "Automatically generated from the ASH Glo ledger. All amounts are in CFA francs (XAF)."}
          </p>
        </div>
      </div>
    </div>
  );
}
