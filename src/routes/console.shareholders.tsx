import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getShareholderCenter, recordShareholderPayment, type ShareholderRow } from "@/lib/shareholders.functions";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GlassCard, HistoryCard, InvestmentCard, OwnershipPlan, PerformanceCard } from "@/components/shareholders/ShareholderViews";

export const Route = createFileRoute("/console/shareholders")({
  ssr: false,
  component: ShareholdersConsole,
});

function PaymentDialog({ s, onDone }: { s: ShareholderRow; onDone: () => void }) {
  const fn = useServerFn(recordShareholderPayment);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const r = await fn({ data: { id: s.id, amount: Number(amount), reference } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Payment recorded");
    setOpen(false);
    onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Record confirmed payment</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment from {s.display_name}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Only record money that has actually arrived and been reconciled. This does not change ownership.</p>
        <Label>Amount ({s.currency})</Label>
        <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Label>Transaction / reference ID</Label>
        <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        <Button disabled={busy} onClick={submit}>Save</Button>
      </DialogContent>
    </Dialog>
  );
}

function ShareholdersConsole() {
  const qc = useQueryClient();
  const fn = useServerFn(getShareholderCenter);
  const { data, isLoading, error } = useQuery({ queryKey: ["console", "shareholders"], queryFn: fn });
  if (isLoading) return <LoadingState label="Loading shareholders…" />;
  if (error || !data) return <p className="text-sm text-muted-foreground">Only the CEO can open the Shareholders & Investor Center.</p>;
  const refresh = () => qc.invalidateQueries({ queryKey: ["console", "shareholders"] });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-foreground">Shareholders & Investor Center</h1>
      <GlassCard title="Cap table">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th>Shareholder</th><th>Role</th><th className="text-right">Ownership</th></tr></thead>
          <tbody>
            {data.shareholders.map((s) => (
              <tr key={s.id} className="border-t border-border/50"><td className="py-2 font-semibold">{s.display_name}</td><td>{s.role}</td><td className="text-right">{Number(s.ownership_pct)}%</td></tr>
            ))}
            <tr className="border-t border-border font-bold"><td className="py-2">Total issued</td><td /><td className="text-right">{data.cap.issued}%</td></tr>
          </tbody>
        </table>
      </GlassCard>
      <div className="grid gap-4 md:grid-cols-2">
        {data.shareholders.filter((s) => !s.is_founder).map((s) => (
          <div key={s.id} className="space-y-2">
            <InvestmentCard s={s} />
            <PaymentDialog s={s} onDone={refresh} />
          </div>
        ))}
        <OwnershipPlan cap={data.cap} />
      </div>
      <PerformanceCard p={data.performance} />
      <HistoryCard items={data.history} />
    </div>
  );
}
