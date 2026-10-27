import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Lock, Sparkles, Target, Users, Wallet } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { useNetwork, useProfile, useWallet } from "@/lib/queries";
import { useRegion } from "@/lib/region-context";
import { useI18n } from "@/lib/i18n";
import { askAssistant } from "@/lib/assistant.functions";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/referral-rewards")({
  head: () => ({
    meta: [
      { title: "Referral rewards — ASH Glo" },
      { name: "description", content: "Your ASH referral rewards, target and personal guidance from ASH Intelligence." },
      { property: "og:title", content: "Referral rewards — ASH Glo" },
      { property: "og:description", content: "Track referral rewards and get guidance from ASH Intelligence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferralRewardsPage,
});

const ACTIVATION_FEE = 5000;
const LEVEL1 = 1500;
/** First milestone: enough direct activations to earn back the activation fee. */
const FIRST_TARGET = Math.ceil(ACTIVATION_FEE / LEVEL1);

function ReferralRewardsPage() {
  const { tx, lang } = useI18n();
  const region = useRegion();
  const { data: profile } = useProfile();
  const { data: wallet } = useWallet();
  const { data: network } = useNetwork();
  const active = profile?.account_status === "ACTIVE";
  const direct = network?.levels?.[0]?.active ?? 0;
  const earned = Number(network?.earnedTotal ?? 0);
  const progress = Math.min(100, Math.round((direct / FIRST_TARGET) * 100));

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <header className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-gold/15 text-gold">
          <Gift className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-bold text-foreground">{tx("Referral rewards", "Récompenses de parrainage")}</h1>
          <p className="text-xs text-muted-foreground">
            {active ? tx("Your account is active", "Votre compte est actif") : tx("Account not activated yet", "Compte pas encore activé")}
          </p>
        </div>
      </header>

      {!region.referralEnabled ? (
        <section className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {tx(
            "Referral rewards are currently available in Cameroon and Nigeria only.",
            "Les récompenses de parrainage sont disponibles uniquement au Cameroun et au Nigeria.",
          )}
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Target className="size-4 text-primary" aria-hidden />
              {tx("Your first target", "Votre premier objectif")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tx(
                `Bring ${FIRST_TARGET} friends who activate their account. At ${formatXAF(LEVEL1)} each, that earns back your ${formatXAF(ACTIVATION_FEE)} activation.`,
                `Invitez ${FIRST_TARGET} amis qui activent leur compte. À ${formatXAF(LEVEL1)} chacun, vous récupérez votre activation de ${formatXAF(ACTIVATION_FEE)}.`,
              )}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {direct}/{FIRST_TARGET} {tx("activated friends", "amis activés")}
            </p>
          </section>

          {active ? (
            <section className="grid grid-cols-2 gap-3">
              <Stat icon={Wallet} label={tx("Available", "Disponible")} value={formatXAF(Number(wallet?.available_balance ?? 0))} />
              <Stat icon={Gift} label={tx("Referral earnings", "Gains de parrainage")} value={formatXAF(earned)} />
              <Stat icon={Users} label={tx("Network", "Réseau")} value={String(network?.total ?? 0)} />
              <Stat icon={Users} label={tx("Direct friends", "Amis directs")} value={String(network?.direct ?? 0)} />
              <Button asChild className="col-span-2 rounded-full">
                <Link to="/dashboard">{tx("Open my referral space", "Ouvrir mon espace parrainage")}</Link>
              </Button>
            </section>
          ) : (
            <section className="space-y-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Lock className="size-4 text-gold" aria-hidden />
                {tx("Activate to start earning", "Activez pour commencer à gagner")}
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>{tx(`Pay the one-time ${formatXAF(ACTIVATION_FEE)} activation with MTN or Orange Money.`, `Payez l'activation unique de ${formatXAF(ACTIVATION_FEE)} avec MTN ou Orange Money.`)}</li>
                <li>{tx("Share your referral link with friends.", "Partagez votre lien de parrainage avec vos amis.")}</li>
                <li>{tx("Earn 1,500 XAF (level 1), 750 XAF (level 2) and 250 XAF (level 3) for each activation in your network.", "Gagnez 1 500 XAF (niveau 1), 750 XAF (niveau 2) et 250 XAF (niveau 3) pour chaque activation dans votre réseau.")}</li>
              </ol>
              <Button asChild className="w-full rounded-full">
                <Link to="/activate">{tx("Activate my account", "Activer mon compte")}</Link>
              </Button>
            </section>
          )}

          <AshIntelligence lang={lang} active={active} />
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Gift; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <Icon className="size-4 text-primary" aria-hidden />
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

/** ASH Intelligence reads the member's real figures and writes advice as they arrive. */
function AshIntelligence({ lang, active }: { lang: string; active: boolean }) {
  const { tx } = useI18n();
  const ask = useServerFn(askAssistant);
  const [full, setFull] = useState("");
  const [shown, setShown] = useState("");
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const prompt = active
      ? "Analyse my referral rewards using only my real figures: network, earnings, wallet. Tell me how close I am to my next target and 3 concrete steps to grow my referral earnings this week."
      : "My account is not activated. Explain simply what I need to do to activate, what it costs, what my first referral target should be, and 3 concrete steps to reach it.";
    ask({ data: { messages: [{ role: "user", content: prompt }], lang } })
      .then((res) => (res.ok && res.reply ? setFull(res.reply) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [ask, active, lang]);

  useEffect(() => {
    if (!full) return;
    let i = 0;
    const timer = window.setInterval(() => {
      i += 3;
      setShown(full.slice(0, i));
      if (i >= full.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [full]);

  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-primary">
        <Sparkles className="size-4" aria-hidden />
        ASH Intelligence
      </p>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground" aria-live="polite">
        {failed
          ? tx("ASH Intelligence is unavailable right now. Please try again later.", "ASH Intelligence est indisponible pour le moment. Réessayez plus tard.")
          : shown || (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                {tx("Analysing your rewards", "Analyse de vos récompenses")}
                <span className="animate-pulse">…</span>
              </span>
            )}
      </div>
    </section>
  );
}
