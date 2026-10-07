import { Link } from "@tanstack/react-router";
import { ArrowLeft, Clock3, ShieldCheck, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type ComingSoonFeature = { icon: LucideIcon; en: string; fr: string };

/**
 * Shared bilingual "Coming soon" screen used to block features that are not
 * live yet (Deals, Events, Freelance, Jobs, Inventory, FX Analytics...).
 * The guarded routes keep their original page code; point the route's
 * `component` back at it to re-enable the feature.
 */
export function ComingSoon({
  icon,
  eyebrow,
  titleEn,
  titleFr,
  bodyEn,
  bodyFr,
  features = [],
  backTo = "/menu",
  backLabelEn = "Back",
  backLabelFr = "Retour",
}: {
  icon: LucideIcon;
  eyebrow: string;
  titleEn: string;
  titleFr: string;
  bodyEn: string;
  bodyFr: string;
  features?: ComingSoonFeature[];
  backTo?: string;
  backLabelEn?: string;
  backLabelFr?: string;
}) {
  const { lang } = useI18n();
  const fr = lang === "fr";

  return (
    <div className="mx-auto w-full max-w-4xl pb-10">
      <Link
        to={backTo}
        className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {fr ? backLabelFr : backLabelEn}
      </Link>

      <section className="tile mt-5 overflow-hidden p-0">
        <div className="relative p-6 text-center sm:p-10">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto grid size-20 place-items-center rounded-[26px] bg-primary/10 ring-1 ring-primary/20 shadow-sm">
              <icon.type className="size-10 text-primary" aria-hidden />
            </div>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {fr ? titleFr : titleEn}
            </h1>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Clock3 className="size-3.5" aria-hidden />
              {fr ? "Bientôt disponible" : "Coming soon"}
            </p>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground">{fr ? bodyFr : bodyEn}</p>

            {features.length > 0 ? (
              <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature.en} className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <feature.icon className="size-4.5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{fr ? feature.fr : feature.en}</p>
                        <p className="text-[11px] text-muted-foreground">{fr ? "Bientôt disponible" : "Coming soon"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-left">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {fr
                  ? "Cette section n'est pas encore active sur ASH. Rien ne peut être réservé, réclamé ou acheté ici pour le moment."
                  : "This section is not live on ASH yet. Nothing can be booked, claimed or purchased here for now."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
