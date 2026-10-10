import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { PROMOTION_PLANS, startPromotion, verifyCommerceCharge } from "@/lib/commerce.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MomoCharge } from "./MomoCharge";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PlanKey = keyof typeof PROMOTION_PLANS;

const PLAN_KEYS: PlanKey[] = ["DAY_1", "DAY_7", "DAY_30"];

/**
 * ASH Promote — buy a visibility slot for a storefront, deal, event or project.
 * The slot only goes live once the mobile money collection is verified as paid.
 */
export function PromoteDialog({
  targetType,
  targetId,
  defaultHeadline,
  city,
  category,
  trigger,
}: {
  targetType: "PROVIDER" | "DEAL" | "EVENT" | "PROJECT" | "FREELANCER" | "PROPERTY";
  targetId: string;
  defaultHeadline?: string;
  city?: string | null;
  category?: string | null;
  trigger?: React.ReactNode;
}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const start = useServerFn(startPromotion);
  const verify = useServerFn(verifyCommerceCharge);

  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanKey>("DAY_7");
  const [headline, setHeadline] = useState(defaultHeadline ?? "");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  async function charge(provider: string, phone: string) {
    setBusy(true);
    try {
      const result = await start({
        data: { targetType, targetId, headline, plan, city: city ?? undefined, category: category ?? undefined, provider, phone },
      });
      if (!result.ok) {
        toast.error(result.message ?? (tx("The payment could not start.", "Le paiement n'a pas démarré.")));
        return;
      }
      setReference(result.reference);
      toast.success(tx("Approve the prompt on your phone.", "Validez la demande sur votre téléphone."));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!reference) return;
    setBusy(true);
    try {
      const result = await verify({ data: { reference } });
      if (result.ok) {
        toast.success(tx("Promotion is live!", "Promotion active !"));
        setOpen(false);
        setReference(null);
      } else {
        toast.error(tx("Payment not confirmed yet.", "Paiement pas encore confirmé."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Megaphone className="size-4" aria-hidden />
            {tx("Promote", "Promouvoir")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tx("ASH Promote", "ASH Promote")}</DialogTitle>
          <DialogDescription>
            {tx("Put this at the top of search and the home feed for the period you choose.", "Placez ceci en tête des résultats et de l'accueil pendant la durée choisie.")}
          </DialogDescription>
        </DialogHeader>

        {reference ? (
          <div className="space-y-4">
            <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              {tx("Approve the mobile money prompt on your phone, then confirm here.", "Validez la demande Mobile Money sur votre téléphone, puis confirmez ici.")}
            </p>
            <Button className="w-full" disabled={busy} onClick={() => void confirm()}>
              {tx("I have paid", "J'ai payé")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promo-headline">{tx("Headline", "Accroche")}</Label>
              <Input
                id="promo-headline"
                value={headline}
                maxLength={120}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder={tx("20% off today at Mama's Kitchen", "20% aujourd'hui chez Mama's Kitchen")}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PLAN_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={plan === key}
                  onClick={() => setPlan(key)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    plan === key ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {PROMOTION_PLANS[key].days} {tx("day(s)", "jour(s)")}
                  </p>
                  <p className="mt-1 font-display text-base font-extrabold text-foreground">
                    {formatXAF(PROMOTION_PLANS[key].amount)}
                  </p>
                </button>
              ))}
            </div>

            <MomoCharge
              country="CM"
              busy={busy || headline.trim().length < 4}
              fr={fr}
              submitLabel={`${tx("Pay", "Payer")} ${formatXAF(PROMOTION_PLANS[plan].amount)}`}
              onCharge={charge}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
