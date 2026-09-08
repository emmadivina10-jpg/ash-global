import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Landmark,
  Loader2,
  Smartphone,
  XCircle,
} from "lucide-react";

import {
  getConsolePayouts,
  requestConsolePayout,
} from "@/lib/console.functions";

import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
} from "@/components/refer/states";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { formatDateTime, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/console/payout")({
  component: ConsolePayout,
});

type Provider = "mtn_cm" | "orange_cm";

function providerLabel(provider: string | null | undefined) {
  if (provider === "mtn_cm") {
    return "MTN Mobile Money";
  }

  if (provider === "orange_cm") {
    return "Orange Money";
  }

  return "—";
}

function providerShortLabel(provider: Provider) {
  return provider === "mtn_cm"
    ? "MTN Mobile Money"
    : "Orange Money";
}

function payoutStatusIcon(status: string | null | undefined) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="size-4 text-primary" />;

    case "PROCESSING":
      return <Clock3 className="size-4 text-yellow-500" />;

    case "FAILED":
    case "CANCELLED":
      return <XCircle className="size-4 text-destructive" />;

    default:
      return <Clock3 className="size-4 text-muted-foreground" />;
  }
}

function ConsolePayout() {
  const queryClient = useQueryClient();

  const fetchPayouts = useServerFn(getConsolePayouts);
  const requestPayout = useServerFn(requestConsolePayout);

  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [provider, setProvider] = useState<Provider>("mtn_cm");
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "payouts"],
    queryFn: fetchPayouts,
    refetchInterval: 5000,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const value = Math.round(Number(amount));

    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid payout amount");
      return;
    }

    if (value > Number(data?.available ?? 0)) {
      toast.error(
        `Amount exceeds available balance (${formatXAF(
          Number(data?.available ?? 0),
        )})`,
      );
      return;
    }

    if (!destination.trim()) {
      toast.error("Enter the recipient's mobile-money number");
      return;
    }

    setBusy(true);

    try {
      const result = await requestPayout({
        data: {
          amount: value,
          destination: destination.trim(),
          provider,
          ...(note.trim()
            ? {
                note: note.trim(),
              }
            : {}),
        },
      });

      if (!result.ok) {
        toast.error(
          result.error === "EXCEEDS_AVAILABLE"
            ? `Amount exceeds available balance (${formatXAF(
                Number(result.available ?? data?.available ?? 0),
              )})`
            : `Payout failed: ${result.error}`,
        );

        return;
      }

      if (result.status === "COMPLETED") {
        toast.success(
          "Platform payout completed successfully",
        );
      } else {
        toast.success(
          `Payout sent to TchokoPay and is now ${
            result.status ?? "PROCESSING"
          }`,
        );
      }

      setAmount("");
      setDestination("");
      setNote("");

      await queryClient.invalidateQueries({
        queryKey: ["console", "payouts"],
      });

      await refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to process payout",
      );
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <SkeletonRows rows={5} />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        onRetry={() => void refetch()}
      />
    );
  }

  const f = data.financials;
  const bookingRows = data.bookings;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Platform payout"
        description="Withdraw the platform's own revenue through MTN Mobile Money or Orange Money."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">
              Platform revenue
            </p>

            <p className="mt-1 font-display text-lg font-bold text-foreground">
              {formatXAF(
                Number(f?.platform_revenue ?? 0),
              )}
            </p>
          </div>

          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">
              1% booking commission
            </p>

            <p className="mt-1 font-display text-lg font-bold text-foreground">
              {formatXAF(
                Number(f?.commission_revenue ?? 0),
              )}
            </p>
          </div>

          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">
              Already paid out
            </p>

            <p className="mt-1 font-display text-lg font-bold text-foreground">
              {formatXAF(Number(data.taken ?? 0))}
            </p>
          </div>

          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              Available to withdraw
            </p>

            <p className="mt-1 font-display text-lg font-bold text-primary">
              {formatXAF(
                Number(data.available ?? 0),
              )}
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="mt-4 space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="payout-amount">
                Amount (XAF)
              </Label>

              <Input
                id="payout-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                placeholder="50000"
                min={1}
                required
                disabled={busy}
              />
            </div>

            {/* Provider */}
            <div className="space-y-1.5">
              <Label htmlFor="payout-provider">
                Mobile Money provider
              </Label>

              <select
                id="payout-provider"
                value={provider}
                onChange={(e) =>
                  setProvider(
                    e.target.value as Provider,
                  )
                }
                disabled={busy}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="mtn_cm">
                  MTN Mobile Money
                </option>

                <option value="orange_cm">
                  Orange Money
                </option>
              </select>
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <Label htmlFor="payout-dest">
                Mobile Money number
              </Label>

              <Input
                id="payout-dest"
                value={destination}
                onChange={(e) =>
                  setDestination(e.target.value)
                }
                placeholder="6XX XXX XXX"
                inputMode="tel"
                autoComplete="tel"
                required
                disabled={busy}
              />

              <p className="text-[11px] text-muted-foreground">
                Cameroon number, for example 670123456
              </p>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="payout-note">
                Note (optional)
              </Label>

              <Input
                id="payout-note"
                value={note}
                onChange={(e) =>
                  setNote(e.target.value)
                }
                placeholder="Platform withdrawal"
                disabled={busy}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <Smartphone className="size-5 text-primary" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {providerShortLabel(provider)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {destination.trim() ||
                      "Recipient number not entered"}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground">
                  Payout amount
                </p>

                <p className="font-display text-lg font-bold text-foreground">
                  {formatXAF(
                    Number(amount) || 0,
                  )}
                </p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={
              busy ||
              Number(data.available ?? 0) <= 0
            }
            className="w-full sm:w-auto"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing payout…
              </>
            ) : (
              <>
                <Banknote className="size-4" />
                Send platform payout
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            The payout is sent through TchokoPay. It will remain
            processing until TchokoPay confirms that the recipient
            has been credited.
          </p>
        </form>
      </SectionCard>

      <SectionCard
        title="Payout history"
        description="Every platform payout and its current payment-provider status."
      >
        {data.payouts.length === 0 ? (
          <EmptyState title="No payouts yet" />
        ) : (
          <ul className="divide-y divide-border">
            {data.payouts.map((p) => (
              <li
                key={p.id}
                className="py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {p.provider ? (
                        <Smartphone className="size-4 text-muted-foreground" />
                      ) : (
                        <Landmark className="size-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {p.destination}
                        </p>

                        <span className="text-xs text-muted-foreground">
                          {providerLabel(p.provider)}
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(
                          p.created_at,
                        )}
                        {p.reference
                          ? ` — ${p.reference}`
                          : ""}
                      </p>

                      {p.provider_reference ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          TchokoPay ref:{" "}
                          <span className="font-medium text-foreground">
                            {p.provider_reference}
                          </span>
                        </p>
                      ) : null}

                      {p.failure_reason ? (
                        <p className="mt-1 text-xs text-destructive">
                          {p.failure_reason}
                        </p>
                      ) : null}

                      {p.note ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {p.note}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-1.5">
                      {payoutStatusIcon(
                        p.status,
                      )}

                      <StatusBadge
                        status={
                          p.status ?? "PENDING"
                        }
                      />
                    </div>

                    <p className="text-sm font-bold text-foreground">
                      {formatXAF(
                        Number(p.amount),
                      )}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Booking revenue"
        description="Each booking's status, price and the 1% platform fee it generated."
      >
        {bookingRows.length === 0 ? (
          <EmptyState title="No bookings yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">
                    Service
                  </th>

                  <th className="py-2 pr-3 font-medium">
                    Provider
                  </th>

                  <th className="py-2 pr-3 font-medium">
                    Status
                  </th>

                  <th className="py-2 pr-3 text-right font-medium">
                    Price
                  </th>

                  <th className="py-2 pr-3 text-right font-medium">
                    1% fee
                  </th>

                  <th className="py-2 font-medium">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody>
                {bookingRows.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="max-w-40 truncate py-2 pr-3 font-medium text-foreground">
                      {b.service_title}
                    </td>

                    <td className="max-w-32 truncate py-2 pr-3 text-muted-foreground">
                      {b.providerName}
                    </td>

                    <td className="py-2 pr-3">
                      <StatusBadge
                        status={b.status}
                      />
                    </td>

                    <td className="py-2 pr-3 text-right text-foreground">
                      {formatXAF(
                        Number(b.price),
                      )}
                    </td>

                    <td className="py-2 pr-3 text-right font-semibold text-primary">
                      {formatXAF(b.fee)}
                    </td>

                    <td className="py-2 text-xs text-muted-foreground">
                      {formatDateTime(
                        b.created_at,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
