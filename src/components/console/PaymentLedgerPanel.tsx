import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  consoleDecideBankPayment,
  consoleGetBankConfig,
  consoleListLedger,
  consoleSaveBankConfig,
} from "@/lib/payments-ledger.functions";
import { SectionCard } from "@/components/refer/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime, formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

const METHODS = [
  { id: "", label: "All" },
  { id: "MTN", label: "MTN" },
  { id: "ORANGE", label: "Orange" },
  { id: "BANK", label: "Bank" },
  { id: "CARD", label: "Stripe" },
];

/** Central payment ledger: every method, one source, filters, bank confirmations. */
export function PaymentLedgerPanel() {
  const qc = useQueryClient();
  const list = useServerFn(consoleListLedger);
  const [method, setMethod] = useState("");
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["console", "payment-ledger", method],
    queryFn: () => list({ data: { method } }),
  });
  const decide = useServerFn(consoleDecideBankPayment);
  const decision = useMutation({
    mutationFn: (v: { reference: string; decision: "CONFIRM" | "REJECT"; bankReference?: string }) => decide({ data: v }),
    onSuccess: () => { toast.success("Saved"); void qc.invalidateQueries({ queryKey: ["console"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const all = rows ?? [];
  const sum = (s: string) => all.filter((r) => r.status === s).reduce((a, r) => a + Number(r.amount ?? 0), 0);
  const count = (s: string) => all.filter((r) => r.status === s).length;
  const pendingBank = all.filter((r) => r.provider === "BANK" && (r.status === "PENDING" || r.status === "PROCESSING"));

  return (
    <div className="space-y-4">
      <SectionCard title="Payment ledger (all methods)">
        <div className="mb-3 flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <Button key={m.id} size="sm" variant={method === m.id ? "default" : "outline"} onClick={() => setMethod(m.id)}>
              {m.label}
            </Button>
          ))}
        </div>
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          {(["SUCCESS", "PENDING", "FAILED", "REFUNDED"] as const).map((s) => (
            <div key={s} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{s.toLowerCase()}</p>
              <p className="tabular font-bold text-foreground">{count(s)} · {formatXAF(sum(s))}</p>
            </div>
          ))}
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : error ? (
          <p className="text-sm text-destructive">Data not available.</p>
        ) : all.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded on the ledger yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>{["Reference", "Purpose", "Method", "Provider", "Provider ref", "Amount", "Status", "Reconciliation", "Created", "Completed"].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {all.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="tabular px-2 py-1.5 font-medium">{r.reference}</td>
                    <td className="px-2 py-1.5">{r.purpose}</td>
                    <td className="px-2 py-1.5">{r.method}</td>
                    <td className="px-2 py-1.5">{r.provider}</td>
                    <td className="tabular px-2 py-1.5">{r.provider_reference ?? r.bank_reference ?? "—"}</td>
                    <td className="tabular px-2 py-1.5">{r.amount == null ? "—" : `${Number(r.amount).toLocaleString("fr-FR")} ${r.currency}`}</td>
                    <td className={cn("px-2 py-1.5 font-semibold", r.status === "SUCCESS" && "text-primary", ["FAILED", "CANCELLED", "EXPIRED"].includes(r.status) && "text-destructive")}>{r.status}</td>
                    <td className="px-2 py-1.5">{r.reconciliation_status}</td>
                    <td className="px-2 py-1.5">{formatDateTime(r.created_at)}</td>
                    <td className="px-2 py-1.5">{r.completed_at ? formatDateTime(r.completed_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Pending bank transfers">
        {pendingBank.length === 0 ? <p className="text-sm text-muted-foreground">No bank transfers waiting.</p> : (
          <ul className="space-y-2">
            {pendingBank.map((r) => <BankRow key={r.id} reference={r.reference} amount={Number(r.amount ?? 0)} payer={r.payer_name} purpose={r.purpose} busy={decision.isPending} onDecide={(d, ref) => decision.mutate({ reference: r.reference, decision: d, bankReference: ref })} />)}
          </ul>
        )}
      </SectionCard>

      <BankConfigCard />
    </div>
  );
}

function BankRow({ reference, amount, payer, purpose, busy, onDecide }: { reference: string; amount: number; payer: string | null; purpose: string; busy: boolean; onDecide: (d: "CONFIRM" | "REJECT", ref?: string) => void }) {
  const [bankRef, setBankRef] = useState("");
  return (
    <li className="rounded-xl border border-border p-3 text-sm">
      <p className="font-semibold">{reference} · {formatXAF(amount)} · {purpose}{payer ? ` · ${payer}` : ""}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Input className="h-8 max-w-xs" placeholder="Bank statement reference" value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
        <Button size="sm" disabled={busy || !bankRef.trim()} onClick={() => onDecide("CONFIRM", bankRef)}>Confirm received</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecide("REJECT")}>Reject</Button>
      </div>
    </li>
  );
}

function BankConfigCard() {
  const qc = useQueryClient();
  const get = useServerFn(consoleGetBankConfig);
  const save = useServerFn(consoleSaveBankConfig);
  const { data: cfg } = useQuery({ queryKey: ["console", "bank-config"], queryFn: () => get() });
  const [form, setForm] = useState<Record<string, string>>({});
  const [verify, setVerify] = useState(false);
  const val = (k: string) => form[k] ?? String((cfg as Record<string, unknown> | null)?.[k] ?? "");
  const m = useMutation({
    mutationFn: () => save({ data: { bank_name: val("bank_name"), account_name: val("account_name"), account_number: val("account_number"), iban: val("iban"), swift: val("swift"), branch: val("branch"), country: val("country"), currency: val("currency") || "XAF", instructions: val("instructions"), verify } }),
    onSuccess: () => { toast.success("Bank details saved"); setForm({}); void qc.invalidateQueries({ queryKey: ["console", "bank-config"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const fields: [string, string][] = [["bank_name", "Bank name"], ["account_name", "Account name"], ["account_number", "Account number"], ["iban", "IBAN"], ["swift", "SWIFT/BIC"], ["branch", "Branch"], ["country", "Country"], ["currency", "Currency"], ["instructions", "Payer instructions"]];
  return (
    <SectionCard title="Bank details shown to payers">
      <p className="mb-3 text-xs text-muted-foreground">
        {cfg ? (cfg.is_verified ? `Verified by ${cfg.verified_by ?? "—"} on ${cfg.verified_at ? formatDateTime(cfg.verified_at) : "—"}.` : "Saved but NOT verified — payers see “Bank transfer is currently unavailable”.") : "No bank details configured — bank transfer is unavailable to payers."}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(([k, l]) => (
          <div key={k} className="space-y-1">
            <Label htmlFor={`bank-${k}`}>{l}</Label>
            <Input id={`bank-${k}`} value={val(k)} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
          </div>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} />
        I have verified these details against the official bank account documents
      </label>
      <Button className="mt-3" disabled={m.isPending} onClick={() => m.mutate()}>Save bank details</Button>
    </SectionCard>
  );
}
