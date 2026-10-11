import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useProfile,
  useTransactions,
  useWallet,
  useWithdrawals,
} from "@/lib/queries";
import { disburseWithdrawal } from "@/lib/tchokopay.functions";
import { useRegion } from "@/lib/region-context";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { ConfirmationModal } from "@/components/refer/ConfirmationModal";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CM_PHONE_REGEX,
  MIN_WITHDRAWAL,
  PAYMENT_METHOD_LABEL,
  formatDateTime,
  formatXAF,
  normalizePhone,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const ERRORS: Record<string, string> = {
  ACCOUNT_NOT_ACTIVE:
    "Activate your account before requesting a withdrawal.",
  INVALID_METHOD:
    "Choose a valid mobile money provider.",
  INVALID_PHONE:
    "Enter a valid Cameroon mobile money number.",
  MIN_AMOUNT_1000:
    `The minimum withdrawal is ${formatXAF(MIN_WITHDRAWAL)}.`,
  INSUFFICIENT_BALANCE:
    "You do not have enough available balance.",
  PENDING_WITHDRAWAL_EXISTS:
    "You already have a withdrawal being processed.",
  UNAUTHENTICATED:
    "Please sign in again.",
  BANK_NOT_CONNECTED:
    "Connect and verify your bank account before requesting a bank payout.",
  BANK_PAYOUTS_NOT_READY:
    "Connect your Stripe payout account first. Open your Wallet and finish the bank/card payout setup.",
  PAYMENT_PROVIDER_NOT_CONFIGURED:
    "Mobile-money payouts are temporarily unavailable.",
  PROVIDER_UNREACHABLE:
    "We could not reach the payout provider. Your withdrawal remains pending and will not be charged twice.",
  INVALID_REQUEST:
    "The payout information is invalid. Please check your details and try again.",
};

type Method =
  | "MTN_MOMO"
  | "ORANGE_MONEY"
  | "STRIPE_BANK";

const METHOD_LABEL: Record<Method, string> = {
  MTN_MOMO: "MTN Mobile Money",
  ORANGE_MONEY: "Orange Money",
  STRIPE_BANK: "Card / Bank (Stripe)",
};

export const Route = createFileRoute(
  "/_authenticated/withdraw",
)({
  head: () => ({
    meta: [
      { title: "Withdraw — ASH Glo" },
      {
        name: "description",
        content:
          "Withdraw your ASH Glo earnings to MTN Mobile Money or Orange Money.",
      },
    ],
  }),
  component: WithdrawPage,
});

function WithdrawPage() {
  const queryClient = useQueryClient();
  const disburse =
    useServerFn(disburseWithdrawal);

  const { data: wallet } = useWallet();
  const { data: profile } = useProfile();
  const {
    data: withdrawals,
    isLoading,
  } = useWithdrawals();
  const { data: transactions } =
    useTransactions(300);
  const {
    country,
    mobileMoneyEnabled,
  } = useRegion();

  const [amount, setAmount] =
    useState("");
  const [method, setMethod] =
    useState<Method>("MTN_MOMO");
  const [phone, setPhone] =
    useState(profile?.phone ?? "");

  const [error, setError] =
    useState<string | null>(null);

  const [confirming, setConfirming] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);


  const available = Number(
    wallet?.available_balance ?? 0,
  );

  const pending = Number(
    wallet?.pending_balance ?? 0,
  );

  /*
   * Show where the user's withdrawable money came from.
   */
  const split = (
    transactions ?? []
  ).reduce(
    (acc, row) => {
      if (
        row.status !== "SUCCESS" &&
        row.status !== "COMPLETED"
      ) {
        return acc;
      }

      const value = Number(
        row.amount ?? 0,
      );

      if (value <= 0) {
        return acc;
      }

      if (
        row.type === "COMMISSION" ||
        row.type ===
          "REFERRAL_COMMISSION"
      ) {
        acc.referral += value;
      } else if (
        row.type ===
          "SERVICE_EARNING" ||
        row.type ===
          "BOOKING_EARNING"
      ) {
        acc.service += value;
      }

      return acc;
    },
    {
      referral: 0,
      service: 0,
    },
  );

  const isBank =
    method === "STRIPE_BANK";

  const momoAvailable =
    mobileMoneyEnabled;

  // Card/bank payouts run through the member's connected Stripe payout
  // account. The server rejects the request when that account is not ready,
  // so the option is always visible and the error explains the next step.
  const methodOptions: Method[] = [
    "MTN_MOMO",
    "ORANGE_MONEY",
    "STRIPE_BANK",
  ];

  useEffect(() => {
    if (
      !methodOptions.includes(method)
    ) {
      setMethod("MTN_MOMO");
    }
  }, [method, momoAvailable]);

  function review(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    const value = Number(amount);

    if (
      !Number.isFinite(value) ||
      value < MIN_WITHDRAWAL
    ) {
      setError(
        ERRORS["MIN_AMOUNT_1000"] ??
          null,
      );
      return;
    }

    if (value > available) {
      setError(
        ERRORS["INSUFFICIENT_BALANCE"] ??
          null,
      );
      return;
    }

    if (
      !isBank &&
      !CM_PHONE_REGEX.test(
        normalizePhone(phone),
      )
    ) {
      setError(
        ERRORS["INVALID_PHONE"] ??
          null,
      );
      return;
    }

    setError(null);
    setConfirming(true);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      /*
       * STEP 1
       * Create the user's withdrawal and reserve the money.
       *
       * request_withdrawal() moves:
       *
       * available_balance
       *        ↓
       * pending_balance
       */
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "request_withdrawal",
        {
          _amount: Number(amount),
          _method: method,
          _phone: isBank
            ? "BANK"
            : normalizePhone(phone),
        },
      );

      const result = data as
        | {
            ok?: boolean;
            error?: string;
            reference?: string;
          }
        | null;

      if (
        rpcError ||
        !result?.ok
      ) {
        const key =
          result?.error ?? "";

        setSubmitting(false);
        setConfirming(false);

        setError(
          ERRORS[key] ??
            "We could not submit your withdrawal. Please try again.",
        );

        toast.error(
          "Withdrawal request failed",
        );

        return;
      }

      /*
       * STEP 2
       *
       * Bank payouts continue through the existing Stripe flow.
       *
       * MTN Mobile Money and Orange Money are sent automatically
       * to TchokoPay immediately after the withdrawal is created.
       *
       * There is NO admin approval step here.
       */
      if (
        !isBank &&
        result.reference
      ) {
        const payout =
          await disburse({
            data: {
              amount: Number(amount),
              method,
              phone: normalizePhone(
                phone,
              ),
              reference:
                result.reference,
            },
          });

        /*
         * The withdrawal already exists and its funds are reserved.
         *
         * Do NOT create another withdrawal.
         *
         * If TchokoPay is unreachable, the existing withdrawal
         * remains pending so the same reference/idempotency key
         * can safely be retried.
         */
        if (!payout.ok) {
          setSubmitting(false);
          setConfirming(false);

          if (
            payout.error ===
            "PAYMENT_PROVIDER_NOT_CONFIGURED"
          ) {
            setError(
              ERRORS[
                "PAYMENT_PROVIDER_NOT_CONFIGURED"
              ] ??
                "Mobile-money payouts are temporarily unavailable.",
            );
          } else if (
            payout.error ===
            "PROVIDER_UNREACHABLE"
          ) {
            setError(
              ERRORS[
                "PROVIDER_UNREACHABLE"
              ] ??
                "The payout provider could not be reached.",
            );
          } else {
            setError(
              payout.message ??
                ERRORS[
                  payout.error ?? ""
                ] ??
                "We could not start the mobile-money payout.",
            );
          }

          toast.error(
            "Payout could not be started",
          );

          await queryClient.invalidateQueries();

          return;
        }
      }

      setSubmitting(false);
      setConfirming(false);

      toast.success(
        isBank
          ? "Withdrawal request submitted successfully."
          : "Withdrawal submitted. Your mobile-money payout is now being processed automatically.",
      );

      setAmount("");
      setError(null);

      await queryClient.invalidateQueries();
    } catch (error) {
      setSubmitting(false);
      setConfirming(false);

      const message =
        error instanceof Error
          ? error.message
          : "We could not process your withdrawal.";

      setError(message);

      toast.error(
        "Withdrawal request failed",
      );
    }
  }


  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Withdraw Funds
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Available balance:{" "}
          <span className="tabular font-semibold text-foreground">
            {formatXAF(available)}
          </span>
        </p>
      </header>

      <SectionCard title="Where your money came from">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label:
                "Ready to withdraw",
              value: available,
              tone:
                "text-primary",
            },
            {
              label:
                "Pending clearance",
              value: pending,
              tone:
                "text-foreground",
            },
            {
              label:
                "Service earnings",
              value:
                split.service,
              tone:
                "text-foreground",
            },
            {
              label:
                "Referral commissions",
              value:
                split.referral,
              tone:
                "text-foreground",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border p-3"
            >
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </dt>

              <dd
                className={`tabular mt-1 text-base font-bold ${item.tone}`}
              >
                {formatXAF(
                  item.value,
                )}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 text-xs text-muted-foreground">
          Only the “ready to withdraw”
          balance can be paid out.
          Pending amounts clear once
          bookings are completed.
        </p>
      </SectionCard>

      <SectionCard
        title="Withdraw funds"
        description="Choose your destination and amount. You control the withdrawal yourself; mobile-money payouts are processed automatically by TchokoPay."
      >
        <form
          onSubmit={review}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount (XAF)
            </Label>

            <Input
              id="amount"
              inputMode="numeric"
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value.replace(
                    /[^\d]/g,
                    "",
                  ),
                )
              }
              placeholder={String(
                MIN_WITHDRAWAL,
              )}
              className="h-12 text-lg"
            />

            <p className="text-xs text-muted-foreground">
              Minimum{" "}
              {formatXAF(
                MIN_WITHDRAWAL,
              )}
              .
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Payout destination
            </legend>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {methodOptions.map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setMethod(
                        option,
                      )
                    }
                    className={cn(
                      "min-h-14 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                      method === option
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {
                      METHOD_LABEL[
                        option
                      ]
                    }
                  </button>
                ),
              )}
            </div>
          </fieldset>

          {isBank ? (
            <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              Funds are sent through
              Stripe to the card or bank
              account you connected in
              your Wallet payout setup.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="phone">
                Mobile money number
              </Label>

              <Input
                id="phone"
                inputMode="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target
                      .value,
                  )
                }
                placeholder="6XX XXX XXX"
                className="h-12"
              />
            </div>
          )}

          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full"
          >
            Withdraw
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Withdrawal history">
        {isLoading ? (
          <SkeletonRows rows={3} />
        ) : (
          (withdrawals ?? []).length ===
          0 ? (
            <EmptyState
              title="No withdrawals yet"
              description="Your payout requests will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {(withdrawals ?? []).map(
                (item) => (
                  <li
                    key={item.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="tabular text-sm font-bold text-foreground">
                        {formatXAF(
                          item.amount,
                        )}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {
                          METHOD_LABEL[
                            item
                              .payment_method as Method
                          ]
                        }
                        {item.payment_method ===
                        "STRIPE_BANK"
                          ? ""
                          : ` · ${item.phone_number}`}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateTime(
                          item.requested_at,
                        )}{" "}
                        ·{" "}
                        {item.reference}
                      </p>

                      {item.provider_reference ? (
                        <p className="truncate text-[11px] font-medium text-primary/80">
                          TchokoPay ref:{" "}
                          {
                            item.provider_reference
                          }
                        </p>
                      ) : null}
                    </div>

                    <StatusBadge
                      status={
                        item.status
                      }
                    />
                  </li>
                ),
              )}
            </ul>
          )
        )}
      </SectionCard>

      <ConfirmationModal
        open={confirming}
        onOpenChange={(open) => {
          if (!submitting) {
            setConfirming(
              open,
            );
          }
        }}
        title="Confirm withdrawal"
        description={
          isBank
            ? "Confirm the amount and bank destination. Your withdrawal request will be submitted immediately."
            : "Confirm the amount and mobile-money number. Your withdrawal will be submitted immediately and TchokoPay will process the payout automatically."
        }
        loading={submitting}
        confirmLabel={
          submitting
            ? "Withdrawing..."
            : "Withdraw"
        }
        onConfirm={submit}
        details={
          <dl className="space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                Amount
              </dt>

              <dd className="tabular font-bold">
                {formatXAF(
                  Number(
                    amount || 0,
                  ),
                )}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                Destination
              </dt>

              <dd className="font-semibold text-right">
                {
                  METHOD_LABEL[
                    method
                  ]
                }
              </dd>
            </div>

            {isBank ? null : (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  Number
                </dt>

                <dd className="font-semibold">
                  {normalizePhone(
                    phone,
                  )}
                </dd>
              </div>
            )}

            {!isBank ? (
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary">
                  Automatic payout
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  No administrator approval
                  is required. TchokoPay will
                  process the mobile-money payout
                  automatically.
                </p>
              </div>
            ) : null}
          </dl>
        }
      />
    </div>
  );
}
