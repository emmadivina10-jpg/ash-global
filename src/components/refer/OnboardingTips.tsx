import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const KEY = "ash-tips-v1";

type Step = { tour: string; en: string; fr: string };

const STEPS: Step[] = [
  { tour: "market", en: "Discover and search services, deals and people here.", fr: "Découvrez et recherchez services, bons plans et personnes ici." },
  { tour: "create", en: "Create a post, service, deal or event here.", fr: "Créez une publication, un service, un bon plan ou un événement ici." },
  { tour: "messages", en: "Start a conversation here.", fr: "Démarrez une conversation ici." },
  { tour: "wallet", en: "Your balance and payments live here.", fr: "Votre solde et vos paiements sont ici." },
  { tour: "profile", en: "Manage your profile and notifications here.", fr: "Gérez votre profil et vos notifications ici." },
];

type Box = { top: number; left: number; width: number; height: number };

/**
 * Lightweight first-run coach marks. Each step points at an element tagged
 * with `data-tour="…"`; steps whose target isn't on screen are skipped, so the
 * same tour works on mobile tabs and the desktop sidebar.
 */
export function OnboardingTips({ enabled }: { enabled: boolean }) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (window.localStorage.getItem(KEY) === "1") return;
    } catch {
      return;
    }
    const id = window.setTimeout(() => setActive(true), 600);
    return () => window.clearTimeout(id);
  }, [enabled]);

  useEffect(() => {
    if (!active) return;
    let next = index;
    let el: HTMLElement | null = null;
    while (next < STEPS.length) {
      const step = STEPS[next];
      el = step ? (document.querySelector(`[data-tour="${step.tour}"]`) as HTMLElement | null) : null;
      if (el && el.getBoundingClientRect().width > 0) break;
      next += 1;
    }
    if (next >= STEPS.length) {
      finish();
      return;
    }
    if (next !== index) {
      setIndex(next);
      return;
    }
    const r = el!.getBoundingClientRect();
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [active, index]);

  function finish() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setActive(false);
  }

  if (!active || !box) return null;
  const step = STEPS[index]!;
  const below = box.top < 200;
  const top = below ? box.top + box.height + 12 : box.top - 12;
  // Keep the bubble fully on screen, with a 16px gutter on both sides.
  const width = Math.min(260, window.innerWidth - 32);
  const half = width / 2;
  const left = Math.min(Math.max(box.left + box.width / 2, half + 16), window.innerWidth - half - 16);

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-label="ASH tour">
      <button
        type="button"
        aria-label={fr ? "Fermer le guide" : "Close the tour"}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
        onClick={finish}
      />
      <span
        className="pointer-events-none absolute rounded-2xl ring-2 ring-primary"
        style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }}
        aria-hidden
      />
      <div
        className="absolute w-[260px] -translate-x-1/2 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
        style={{ top, left, transform: `translate(-50%, ${below ? "0" : "-100%"})` }}
      >
        <p className="text-sm font-semibold text-foreground">{fr ? step.fr : step.en}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={finish}>
            {fr ? "Passer" : "Skip"}
          </Button>
          <Button
            size="sm"
            onClick={() => (index + 1 >= STEPS.length ? finish() : setIndex(index + 1))}
          >
            {index + 1 >= STEPS.length ? (fr ? "Terminer" : "Done") : fr ? "Suivant" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
