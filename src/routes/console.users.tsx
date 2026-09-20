import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { creditUserWallet, getConsoleUsers } from "@/lib/console.functions";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, formatXAF } from "@/lib/format";
import { toast } from "sonner";
import { getMemberStatement } from "@/lib/ops.functions";
import { MessageMemberDialog, type MessageTarget } from "@/components/console/MessageMemberDialog";
import { StatementDialog } from "@/components/refer/StatementDialog";

export const Route = createFileRoute("/console/users")({
  component: ConsoleUsers,
});

type SelectedUser = {
  user_id: string;
  full_name: string;
  balance: number;
};

function ConsoleUsers() {
  const fetchUsers = useServerFn(getConsoleUsers);
  const creditWallet = useServerFn(creditUserWallet);

  const [term, setTerm] = useState("");

  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [crediting, setCrediting] = useState(false);
  const [messageTarget, setMessageTarget] = useState<MessageTarget>(null);
  const [statementUser, setStatementUser] = useState<{ userId: string; name: string } | null>(null);

  const loadStatement = useServerFn(getMemberStatement);

  const statement = useQuery({
    queryKey: ["console", "statement", statementUser?.userId],
    queryFn: () =>
      loadStatement({
        data: {
          userId: statementUser?.userId ?? "",
        },
      }),
    enabled: Boolean(statementUser),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "users"],
    queryFn: fetchUsers,
  });

  const q = term.trim().toLowerCase();

  const rows = (data ?? []).filter(
    (u) =>
      q === "" ||
      String(u.full_name ?? "")
        .toLowerCase()
        .includes(q) ||
      String(u.email ?? "")
        .toLowerCase()
        .includes(q) ||
      String(u.phone ?? "").includes(q) ||
      String(u.referral_code ?? "")
        .toLowerCase()
        .includes(q),
  );

  function openCredit(user: (typeof rows)[number]) {
    setSelectedUser({
      user_id: user.user_id,
      full_name: user.full_name || "Member",
      balance: Number(user.balance ?? 0),
    });

    setAmount("");
    setReason("");
  }

  function closeCredit() {
    if (crediting) {
      return;
    }

    setSelectedUser(null);
    setAmount("");
    setReason("");
  }

  async function submitCredit() {
    if (!selectedUser) {
      return;
    }

    const numericAmount = Number(amount);
    const trimmedReason = reason.trim();

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid credit amount.");
      return;
    }

    if (numericAmount !== Math.round(numericAmount)) {
      toast.error("Enter a whole XAF amount.");
      return;
    }

    if (trimmedReason.length < 5) {
      toast.error("Please provide a reason for this credit.");
      return;
    }

    setCrediting(true);

    try {
      console.log("[ConsoleUsers] Starting wallet credit:", {
        userId: selectedUser.user_id,
        amount: numericAmount,
        reason: trimmedReason,
      });

      const result = await creditWallet({
        data: {
          userId: selectedUser.user_id,
          amount: numericAmount,
          reason: trimmedReason,
        },
      });

      console.log("[ConsoleUsers] Wallet credit response:", result);

      if (!result.ok) {
        const diagnosticResult = result as {
          ok: false;
          error?: string;
          detail?: string | null;
          code?: string | null;
          details?: string | null;
          hint?: string | null;
        };

        const errorCode = diagnosticResult.error ?? "UNKNOWN_ERROR";

        const detail = diagnosticResult.detail;
        const code = diagnosticResult.code;
        const details = diagnosticResult.details;
        const hint = diagnosticResult.hint;

        console.error("[ConsoleUsers] Wallet credit failed:", {
          error: errorCode,
          detail,
          code,
          details,
          hint,
        });

        const messages: Record<string, string> = {
          INVALID_USER: "The selected user is invalid.",

          USER_NOT_FOUND: "User not found.",

          WALLET_NOT_FOUND: "This user does not have a wallet.",

          INVALID_AMOUNT: "Enter a valid credit amount.",

          REASON_REQUIRED: "A reason is required for every wallet credit.",

          FORBIDDEN: "You are not authorized to credit wallets.",

          UNAUTHENTICATED: "Your admin session has expired. Please sign in again.",

          SUPABASE_ADMIN_CLIENT_FAILED: "The server could not create the Supabase admin client.",

          WALLET_CREDIT_RPC_EXCEPTION: "The wallet credit RPC threw a server error.",

          WALLET_CREDIT_RPC_FAILED: "The wallet credit database RPC failed.",

          WALLET_CREDIT_FAILED: "The wallet credit operation failed.",
        };

        const baseMessage = messages[errorCode] ?? `Wallet credit failed (${errorCode}).`;

        const diagnostic = detail || details || hint || code ? ` ${detail ?? details ?? hint ?? code ?? ""}` : "";

        toast.error(`${baseMessage}${diagnostic}`.trim());

        return;
      }

      console.log("[ConsoleUsers] Wallet credited successfully:", {
        userId: selectedUser.user_id,
        amount: result.amount,
        reference: result.reference,
        newBalance: result.newBalance,
      });

      toast.success(`${formatXAF(result.amount)} credited successfully.`);

      closeCredit();

      await refetch();
    } catch (error) {
      console.error("[ConsoleUsers] Wallet credit request threw an exception:", error);

      const message = error instanceof Error ? error.message : String(error);

      toast.error(`Wallet credit request failed: ${message}`);
    } finally {
      setCrediting(false);
    }
  }

  return (
    <>
      <SectionCard title="Members" description="All ASH Glo accounts, balances and roles.">
        <div className="mb-4">
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search name, email, phone or referral code"
          />
        </div>

        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="No members found" />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((u) => (
              <li key={u.user_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {u.full_name || "—"}

                    {u.roles.includes("admin") ? (
                      <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        admin
                      </span>
                    ) : null}
                  </p>

                  <p className="truncate text-xs text-muted-foreground">
                    {u.email} · {u.phone || "no phone"}
                  </p>

                  <p className="truncate text-xs text-muted-foreground">
                    {u.referral_code} · joined {formatDate(u.created_at)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 text-right">
                  <StatusBadge status={u.account_status} />

                  <div>
                    <p className="tabular text-xs font-semibold text-foreground">{formatXAF(u.balance)}</p>

                    <p className="tabular text-[11px] text-muted-foreground">earned {formatXAF(u.earned)}</p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setStatementUser({
                          userId: u.user_id,
                          name: u.full_name || "Member",
                        })
                      }
                    >
                      Statement
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setMessageTarget({
                          userId: u.user_id,
                          name: u.full_name || "Member",
                        })
                      }
                    >
                      Message
                    </Button>

                    <Button type="button" size="sm" variant="outline" onClick={() => openCredit(u)}>
                      Credit Wallet
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {selectedUser ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credit-wallet-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-background p-5 shadow-2xl">
            <div className="mb-5">
              <h2 id="credit-wallet-title" className="text-lg font-bold text-foreground">
                Credit Wallet
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Add withdrawable funds directly to this member's ASH wallet.
              </p>
            </div>

            <div className="mb-5 rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Member</p>

              <p className="mt-1 font-semibold text-foreground">{selectedUser.full_name}</p>

              <p className="mt-2 text-xs text-muted-foreground">Current available balance</p>

              <p className="tabular mt-0.5 text-lg font-bold text-foreground">{formatXAF(selectedUser.balance)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="credit-amount" className="mb-1.5 block text-sm font-medium text-foreground">
                  Amount (XAF)
                </label>

                <Input
                  id="credit-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="10,000"
                  disabled={crediting}
                />
              </div>

              <div>
                <label htmlFor="credit-reason" className="mb-1.5 block text-sm font-medium text-foreground">
                  Reason
                </label>

                <textarea
                  id="credit-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Compensation, correction, promotional credit..."
                  disabled={crediting}
                  rows={4}
                  maxLength={500}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                />

                <p className="mt-1 text-right text-[11px] text-muted-foreground">{reason.length}/500</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeCredit} disabled={crediting}>
                Cancel
              </Button>

              <Button
                type="button"
                className="flex-1 relative z-[9999]"
                onPointerDown={() => {
                  console.log("CREDIT POINTER DOWN");
                  toast.info("Pointer received");
                }}
                onClick={() => {
                  console.log("CREDIT CLICK");
                  toast.info("Click received");
                  void submitCredit();
                }}
                disabled={crediting}
              >
                {crediting ? "Crediting..." : "Credit Wallet"}
              </Button>
            </div>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              This action creates a permanent financial ledger entry and makes the credited amount withdrawable.
            </p>
          </div>
        </div>
      ) : null}

      <MessageMemberDialog
        open={Boolean(messageTarget)}
        target={messageTarget}
        onClose={() => setMessageTarget(null)}
      />

      <StatementDialog
        open={Boolean(statementUser) && Boolean(statement.data)}
        onClose={() => setStatementUser(null)}
        holder={{
          name: statement.data?.profile?.full_name ?? statementUser?.name ?? "Member",
          email: statement.data?.profile?.email,
          phone: statement.data?.profile?.phone,
          reference: statement.data?.profile?.referral_code,
        }}
        transactions={statement.data?.transactions ?? []}
      />
    </>
  );
}
