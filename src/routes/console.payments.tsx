import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, RotateCw, Search, ShieldCheck, XCircle } from "lucide-react";
import {
  getConsoleAuditLog,
  getConsolePayments,
  manualActivate,
  reconcilePayments,
  verifyPaymentReference,
  type PaymentRow,
} from "@/lib/console.functions";
import { getStripeEnvironment, getTestSettlementReadiness } from "@/lib/stripe-release.functions";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateTime, formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "PAID", label: "Paid" },
  { key: "PENDING", label: "Awaiting payment" },
  { key: "FAILED", label: "Failed / cancelled" },
] as const;

export const Route = createFileRoute("/console/payments")({
  component: ConsolePayments,
});

function ConsolePayments() {
  const queryClient = useQueryClient();
  const fetchPayments = useServerFn(getConsolePayments);
  const fetchAudit = useServerFn(getConsoleAuditLog);
  const verify = useServerFn(verifyPaymentReference);
  const reconcile = useServerFn(reconcilePayments);
  const activate = useServerFn(manualActivate);

  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [manualUser, setManualUser] = useState<{
    user_id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["console", "payments"],
    queryFn: fetchPayments,
    // The console is a live operations surface: keep the table fresh while it is open.
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const { data: audit } = useQuery({ queryKey: ["console", "audit"], queryFn: fetchAudit });
  const fetchStripeEnv = useServerFn(getStripeEnvironment);
  const { data: stripeEnv } = useQuery({
    queryKey: ["console", "stripe-env"],
    queryFn: () => fetchStripeEnv({ data: undefined as never }),
  });
  const fetchTestReadiness = useServerFn(getTestSettlementReadiness);
  const { data: testReadiness } = useQuery({
    queryKey: ["console", "stripe-test-readiness"],
    queryFn: () => fetchTestReadiness({ data: undefined as never }),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.payments ?? []).filter((row) => {
      const matchStatus =
        filter === "ALL" ||
        (filter === "PAID" && row.status === "PAID") ||
        (filter === "PENDING" && (row.status === "PENDING" || row.status === "PROCESSING")) ||
        (filter === "FAILED" && (row.status === "FAILED" || row.status === "CANCELLED"));
      if (!matchStatus) return false;
      if (!term) return true;
      return [
        row.payment_reference,
        row.provider_transaction_id ?? "",
        row.profile?.full_name ?? "",
        row.profile?.email ?? "",
        row.profile?.phone ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [data?.payments, filter, search]);

  async function refreshAll() {
    await queryClient.invalidateQueries({ queryKey: ["console"] });
  }

  async function runReconcile() {
    setBusy(true);
    const result = await reconcile();
    setBusy(false);
    if (!result.ok) {
      toast.error("Reconciliation failed", { description: result.error });
      return;
    }
    toast.success(`Checked ${result.checked} payment(s) · ${result.activated} activated`);
    await refreshAll();
  }

  async function runVerify(reference: string) {
    setBusy(true);
    const result = await verify({ data: { reference } });
    setBusy(false);
    if (!result.ok) {
      toast.error("Provider could not confirm this payment", {
        description: result.error ?? result.outcome,
      });
      return;
    }
    toast.success(`Provider reports ${result.status}`);
    setSelected(null);
    await refreshAll();
  }

  async function runManualActivate() {
    if (!manualUser) return;
    setBusy(true);
    const result = await activate({ data: { userId: manualUser.user_id, reason } });
    setBusy(false);
    if (!result.ok) {
      toast.error("Could not activate", { description: result.error });
      return;
    }
    toast.success(`${manualUser.full_name || "Member"} activated`);
    setManualUser(null);
    setReason("");
    await refreshAll();
  }

  if (isLoading) return <SkeletonRows rows={8} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const totals = data?.totals;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Payments & activations"
        description="Every activation payment, straight from the provider record of truth."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Collected" value={formatXAF(totals?.collected ?? 0)} />
          <Stat label="Paid" value={String(totals?.paid ?? 0)} />
          <Stat label="Awaiting" value={String(totals?.pending ?? 0)} />
          <Stat label="Failed" value={String(totals?.failed ?? 0)} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {stripeEnv ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                stripeEnv.mode === "LIVE"
                  ? "bg-success/15 text-success"
                  : "bg-destructive/10 text-destructive",
              )}
              title={
                stripeEnv.testAvailable
                  ? "Test credentials are also configured; test events never settle live records."
                  : "Only live Stripe credentials are configured."
              }
            >
              Stripe {stripeEnv.mode}
            </span>
          ) : null}
          {FILTERS.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, phone or reference"
              className="pl-9"
              aria-label="Search payments"
            />
          </div>
          <Button size="sm" variant="outline" onClick={runReconcile} disabled={busy}>
            <RotateCw className={cn("size-4", busy && "animate-spin")} aria-hidden />
            Reconcile
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} aria-hidden />
            Refresh
          </Button>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No payments match this view" />
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelected(row)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {row.profile?.full_name || "Unknown member"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.profile?.email || "—"} · {row.profile?.phone || "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.payment_reference} · {formatDateTime(row.paid_at ?? row.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="tabular text-sm font-bold text-foreground">
                      {formatXAF(row.amount)}
                    </span>
                    <StatusBadge status={row.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Test settlement readiness"
        description="Every check must pass before test settlements are enabled. Test events can never settle live bookings."
      >
        {!testReadiness ? (
          <SkeletonRows rows={3} />
        ) : (
          <>
            <p
              className={cn(
                "mb-3 text-sm font-semibold",
                testReadiness.ready ? "text-success" : "text-muted-foreground",
              )}
            >
              {testReadiness.ready
                ? "All prerequisites pass — test settlements can be enabled on an isolated backend."
                : "Not ready — resolve the failing checks below first."}
            </p>
            <ul className="divide-y divide-border">
              {testReadiness.checks.map((check) => (
                <li key={check.key} className="flex items-start gap-3 py-3">
                  {check.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{check.label}</p>
                    <p className="text-xs text-muted-foreground">{check.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Members without an active account"
        description="Activate manually only when payment was confirmed outside the platform. Every action is audited."
      >
        {(data?.unactivated ?? []).length === 0 ? (
          <EmptyState title="Every member is activated" />
        ) : (
          <ul className="divide-y divide-border">
            {(data?.unactivated ?? []).map((row) => (
              <li
                key={row.user_id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {row.full_name || "Member"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.email} · joined {formatDateTime(row.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setManualUser({
                      user_id: row.user_id,
                      full_name: row.full_name,
                      email: row.email,
                    })
                  }
                >
                  <ShieldCheck className="size-4" aria-hidden />
                  Activate
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Provider events"
        description="Webhook and reconciliation deliveries received from TchokoPay."
      >
        {(data?.events ?? []).length === 0 ? (
          <EmptyState title="No provider events logged yet" />
        ) : (
          <ul className="divide-y divide-border">
            {(data?.events ?? []).map((event) => (
              <li
                key={event.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {event.source} · {event.outcome}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {event.reference ?? "—"} · {formatDateTime(event.created_at)}
                    {event.signature_verified ? " · signature verified" : ""}
                  </p>
                </div>
                <StatusBadge status={event.status ?? "PENDING"} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Audit trail" description="Immutable log of administrative actions.">
        {(audit ?? []).length === 0 ? (
          <EmptyState title="No administrative actions yet" />
        ) : (
          <ul className="divide-y divide-border">
            {(audit ?? []).map((entry) => (
              <li key={entry.id} className="py-3">
                <p className="text-sm font-semibold text-foreground">
                  {entry.action.replace(/_/g, " ")} ·{" "}
                  {entry.profile?.full_name || entry.target_user_id || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.actor} · {formatDateTime(entry.created_at)}
                </p>
                {entry.reason ? (
                  <p className="mt-1 text-xs text-muted-foreground">Reason: {entry.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Payment details</SheetTitle>
            <SheetDescription>
              Verified against the payment provider before anything is credited.
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="space-y-4 px-4 pb-8">
              <Detail label="Member" value={selected.profile?.full_name || "Unknown"} />
              <Detail label="Email" value={selected.profile?.email || "—"} />
              <Detail label="Phone" value={selected.profile?.phone || "—"} />
              <Detail label="Account status" value={selected.profile?.account_status || "—"} />
              <Detail label="Amount" value={formatXAF(selected.amount)} />
              <Detail label="Status" value={selected.status} />
              <Detail label="Reference" value={selected.payment_reference} />
              <Detail label="Provider txn" value={selected.provider_transaction_id || "—"} />
              <Detail label="Created" value={formatDateTime(selected.created_at)} />
              <Detail label="Paid" value={formatDateTime(selected.paid_at)} />

              <Button
                className="w-full"
                disabled={busy || selected.status === "PAID"}
                onClick={() => void runVerify(selected.payment_reference)}
              >
                <RotateCw className={cn("size-4", busy && "animate-spin")} aria-hidden />
                Re-check with provider
              </Button>
              {selected.profile?.account_status !== "ACTIVE" ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setManualUser({
                      user_id: selected.user_id,
                      full_name: selected.profile?.full_name ?? "",
                      email: selected.profile?.email ?? "",
                    });
                    setSelected(null);
                  }}
                >
                  <ShieldCheck className="size-4" aria-hidden />
                  Activate manually
                </Button>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={manualUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setManualUser(null);
            setReason("");
          }
        }}
      >
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Manual activation</SheetTitle>
            <SheetDescription>
              {manualUser?.full_name || "This member"} will be marked ACTIVE. No payment record is
              created and referral commissions are not paid for manual activations.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-8">
            <div className="space-y-2">
              <Label htmlFor="manual-reason">Reason (required, stored in the audit log)</Label>
              <Textarea
                id="manual-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Paid 5,000 XAF by MoMo to the company line on 12 Aug, receipt #123"
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={busy || reason.trim().length < 5}
              onClick={runManualActivate}
            >
              Activate account
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-base font-bold text-foreground">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border-b border-border pb-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="truncate text-right text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
