import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VERIFICATION_TIERS, startVerification, verifyVerificationCharge, type VerificationTier } from "@/lib/verification.functions";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { MomoCharge } from "@/components/refer/MomoCharge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verified")({
  head: () => ({
    meta: [
      { title: "ASH Verified — protect your name and photo" },
      {
        name: "description",
        content:
          "Get the blue ASH Verified badge: protect your name and profile photo from copycats, guard your content, and win client trust.",
      },
      { property: "og:title", content: "ASH Verified" },
      { property: "og:description", content: "Protect your identity on ASH with the blue verified badge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifiedPage,
});

const TIER_KEYS: VerificationTier[] = ["INDIVIDUAL", "BUSINESS", "BUSINESS_PLUS"];

const TIER_COPY: Record<VerificationTier, { en: string; fr: string; enHint: string; frHint: string }> = {
  INDIVIDUAL: {
    en: "Individual",
    fr: "Particulier",
    enHint: "For personal accounts and creators.",
    frHint: "Pour les comptes personnels et créateurs.",
  },
  BUSINESS: {
    en: "Business",
    fr: "Entreprise",
    enHint: "For storefronts, shops and service pros.",
    frHint: "Pour les boutiques et prestataires.",
  },
  BUSINESS_PLUS: {
    en: "Business+",
    fr: "Entreprise+",
    enHint: "Priority support and top placement in trust checks.",
    frHint: "Support prioritaire et meilleure visibilité de confiance.",
  },
};

function VerifiedPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();

  const start = useServerFn(startVerification);
  const verify = useServerFn(verifyVerificationCharge);

  const [tier, setTier] = useState<VerificationTier>("INDIVIDUAL");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const { data: me, isLoading } = useQuery({
    queryKey: ["verified", "me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, verified_tier, verified_until")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      return data;
    },
  });

  const active = Boolean(me?.verified_tier && (!me?.verified_until || new Date(me.verified_until) > new Date()));

  async function charge(provider: string, phone: string) {
    setBusy(true);
    try {
      const result = await start({ data: { tier, provider, phone } });
      if (!result.ok) {
        toast.error(result.message ?? (fr ? "Le paiement n'a pas démarré." : "The payment could not start."));
        return;
      }
      setReference(result.reference);
      toast.success(fr ? "Validez la demande sur votre téléphone." : "Approve the prompt on your phone.");
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
        toast.success(fr ? "Vous êtes vérifié !" : "You're verified!");
        setReference(null);
        await queryClient.invalidateQueries({ queryKey: ["verified", "me"] });
      } else {
        toast.error(fr ? "Paiement pas encore confirmé." : "Payment not confirmed yet.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <LoadingState label={tx("Loading…", "Chargement…")} />;

  const benefits = fr
    ? [
        "Badge bleu ASH Vérifié sur votre profil, vos posts et vos messages.",
        "Votre nom et votre photo sont protégés : personne ne peut ouvrir un compte identique.",
        "Vos publications ne peuvent pas être repartagées sans votre accord.",
        "Plus de confiance, donc plus de réservations et de ventes.",
      ]
    : [
        "The blue ASH Verified badge on your profile, posts and chats.",
        "Your name and photo are protected — nobody can open a look-alike account.",
        "Your posts cannot be reused by others unless you allow it.",
        "More trust, so more bookings and sales.",
      ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5">
      <header className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#1877F2]/10 text-[#1877F2]">
            <BadgeCheck className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-extrabold text-foreground">
              {tx("ASH Verified", "ASH Vérifié")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {tx("Protect your identity and earn trust.", "Protégez votre identité et gagnez la confiance.")}
            </p>
          </div>
        </div>

        {active ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-[#1877F2]/10 p-3 text-sm">
            <VerifiedBadge tier={me?.verified_tier ?? null} until={me?.verified_until ?? null} size={16} />
            <span className="font-semibold text-foreground">
              {tx("Your account is verified", "Votre compte est vérifié")}
            </span>
            {me?.verified_until ? (
              <span className="text-muted-foreground">
                · {tx("until", "jusqu'au")} {new Date(me.verified_until).toLocaleDateString(fr ? "fr-FR" : "en-GB")}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      <section className="rounded-3xl border border-border bg-card p-5">
        <p className="text-sm font-bold text-foreground">{tx("What you get", "Ce que vous obtenez")}</p>
        <ul className="mt-3 space-y-2">
          {benefits.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-[#1877F2]" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <p className="text-sm font-bold text-foreground">
          {active ? (tx("Renew or change tier", "Renouveler ou changer de niveau")) : tx("Choose a tier", "Choisissez un niveau")}
        </p>

        <div className="mt-3 grid gap-2">
          {TIER_KEYS.map((key) => {
            const plan = VERIFICATION_TIERS[key];
            const copy = TIER_COPY[key];
            const selected = tier === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTier(key)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors",
                  selected ? "border-[#1877F2] bg-[#1877F2]/5" : "border-border hover:border-primary/40",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-foreground">{fr ? copy.fr : copy.en}</span>
                  <span className="block text-xs text-muted-foreground">{fr ? copy.frHint : copy.enHint}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-extrabold text-foreground">{formatXAF(plan.amount)}</span>
                  <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                    / {plan.days} {fr ? "jours" : "days"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {reference ? (
            <div className="space-y-3">
              <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                {tx("Approve the mobile money prompt on your phone, then confirm here.", "Validez la demande Mobile Money sur votre téléphone, puis confirmez ici.")}
              </p>
              <Button className="w-full" disabled={busy} onClick={() => void confirm()}>
                {tx("I have paid", "J'ai payé")}
              </Button>
            </div>
          ) : (
            <MomoCharge
              busy={busy}
              fr={fr}
              submitLabel={tx("Pay and get verified", "Payer et être vérifié")}
              onCharge={charge}
            />
          )}
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {tx("Paid with Mobile Money (MTN & Orange). Bank transfers are coming soon.", "Paiement par Mobile Money (MTN & Orange). Les virements bancaires arrivent bientôt.")}
        </p>
      </section>
    </div>
  );
}
