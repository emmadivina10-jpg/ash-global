import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { getPayoutSetupVisibility } from "@/lib/payouts.functions";
import { useCardBankAvailable } from "./PaymentMethodPicker";
import {
  PAYOUT_REMINDER_DELAY,
  parsePayoutReminder,
  shouldShowPayoutReminder,
} from "@/lib/payout-reminder";

export function PayoutSetupReminder({ userId, connected }: { userId: string; connected: boolean }) {
  const { tx } = useI18n();
  const cardBank = useCardBankAvailable();
  const visibility = useServerFn(getPayoutSetupVisibility);
  // Option A: the reminder is only for approved providers; customers see nothing.
  const { data: gate } = useQuery({
    queryKey: ["payout-setup-visibility"],
    queryFn: () => visibility({ data: undefined as never }),
    enabled: cardBank,
    staleTime: 60_000,
  });
  const canSetUpBank = cardBank && gate?.canSetUpBank === true;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [visible, setVisible] = useState(false);
  const storageKey = `ash.payout-reminder.v1.${userId}`;
  useEffect(() => {
    setVisible(false);
    if (!canSetUpBank) return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const preference = parsePayoutReminder(localStorage.getItem(storageKey));
        if (!shouldShowPayoutReminder(preference, Date.now(), connected)) return;
        localStorage.setItem(
          storageKey,
          JSON.stringify({ disabled: false, lastShown: Date.now() }),
        );
        setVisible(true);
      } catch {
        /* Avoid repeated prompts when preferences cannot be saved. */
      }
    };
    const timer = window.setTimeout(check, PAYOUT_REMINDER_DELAY);
    const interval = window.setInterval(check, PAYOUT_REMINDER_DELAY);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [storageKey, connected, canSetUpBank]);

  function dismiss(permanent: boolean) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ disabled: permanent, lastShown: Date.now() }),
      );
    } catch {
      /* Private mode. */
    }
    setVisible(false);
  }
  if (
    !cardBank ||
    !visible ||
    connected ||
    pathname === "/messages" ||
    pathname.startsWith("/post/") ||
    pathname.includes("/tracking")
  )
    return null;
  return (
    <aside
      aria-label={tx("Payout setup reminder", "Rappel de configuration des versements")}
      className="border-b border-primary/20 bg-primary/5 px-4 py-3 sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
        <CreditCard className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {tx(
              "Review your card or bank payout options",
              "Consultez vos options de versement par carte ou banque",
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {tx(
              "Setup availability is shown in your Wallet.",
              "La disponibilité est indiquée dans votre portefeuille.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link to="/wallet" hash="payout-setup" onClick={() => dismiss(false)}>
              {tx("View setup", "Voir la configuration")}
            </Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dismiss(false)}>
            {tx("Later", "Plus tard")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dismiss(true)}>
            {tx("Don’t remind me again", "Ne plus me rappeler")}
          </Button>
        </div>
      </div>
    </aside>
  );
}
