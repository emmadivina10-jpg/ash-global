import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bike, ChevronRight, Footprints, Scale, Shirt, Sparkles, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { amICleanWorker } from "@/lib/clean.functions";
import { cleanStatusLabel, fcfa } from "@/lib/clean";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { SupportChatPanel } from "@/components/refer/SupportChatPanel";

export const Route = createFileRoute("/_authenticated/clean/")({
  head: () => ({
    meta: [
      { title: "ASH Clean — Laundry pickup & delivery in Buea" },
      { name: "description", content: "Book a laundry pickup. We weigh it, you approve the price, we wash, iron and deliver." },
      { property: "og:title", content: "ASH Clean — Laundry pickup & delivery" },
      { property: "og:description", content: "Pickup, washing, ironing and delivery with transparent weighed pricing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CleanHome,
});

function CleanHome() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const workerFn = useServerFn(amICleanWorker);
  const { data: worker } = useQuery({ queryKey: ["clean", "worker"], queryFn: () => workerFn() });
  const { data: orders } = useQuery({
    queryKey: ["clean", "my-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clean_orders")
        .select("id, order_no, status, total, payment_status, created_at, pickup_method")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });
  const { data: settings } = useQuery({
    queryKey: ["clean", "settings"],
    queryFn: async () => (await supabase.rpc("get_clean_public_settings").single()).data,
  });

  const steps = [
    { icon: Truck, en: "We pick up", fr: "On collecte" },
    { icon: Scale, en: "We weigh it", fr: "On pèse" },
    { icon: Sparkles, en: "You approve & pay", fr: "Vous validez et payez" },
    { icon: Shirt, en: "Washed, ironed, delivered", fr: "Lavé, repassé, livré" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-10">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground shadow-[var(--shadow-card)]">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">ASH Clean</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight">
          {fr ? "Votre linge, collecté et livré." : "Your laundry, picked up and delivered."}
        </h1>
        <p className="mt-2 text-sm opacity-90">
          {fr
            ? `Pas besoin de connaître le poids. On pèse chez ASH Clean — ${fcfa(settings?.price_per_kg ?? 1500)}/kg — et vous validez le prix avant le lavage.`
            : `No need to know the weight. We weigh it at ASH Clean — ${fcfa(settings?.price_per_kg ?? 1500)}/kg — and you approve the price before washing.`}
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-4 rounded-full font-bold">
          <Link to="/clean/book">{fr ? "Réserver une collecte" : "Book a pickup"}</Link>
        </Button>
      </section>

      <section className="overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-bold text-foreground">{fr ? "Discuter avec ASH Clean" : "Chat with ASH Clean"}</p>
          <Link to="/messages" search={{ c: "ash-support" } as never} className="text-xs font-bold text-primary">
            {fr ? "Plein écran" : "Open in Messages"}
          </Link>
        </div>
        <div className="flex h-80 flex-col">
          <SupportChatPanel topic="clean" />
        </div>
      </section>

      <div className="grid grid-cols-4 gap-2">
        {steps.map((s) => (
          <div key={s.en} className="flex flex-col items-center gap-1.5 rounded-2xl bg-card p-3 text-center shadow-[var(--shadow-card)]">
            <s.icon className="size-5 text-primary" aria-hidden />
            <span className="text-[11px] font-semibold leading-tight text-foreground">{fr ? s.fr : s.en}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)]">
          <Footprints className="size-5 text-primary" aria-hidden />
          <span>{fr ? "Près de chez nous : collecte gratuite par ASH Staff" : "Nearby: free ASH Staff pickup"}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)]">
          <Bike className="size-5 text-primary" aria-hidden />
          <span>{fr ? "Plus loin : ASH Rider, frais affichés à l'avance" : "Further: ASH Rider, fee shown upfront"}</span>
        </div>
      </div>

      {worker?.worker ? (
        <Link to="/clean/jobs" className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4 font-semibold text-foreground">
          {fr ? "Mes courses ASH Clean (staff / rider)" : "My ASH Clean jobs (staff / rider)"}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}

      <section>
        <h2 className="mb-2 font-display text-lg font-extrabold text-foreground">{fr ? "Mes commandes" : "My orders"}</h2>
        {orders && orders.length ? (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  to="/clean/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-sm font-bold text-foreground">{o.order_no}</span>
                    <span className="block text-xs text-muted-foreground">{formatDateTime(o.created_at)}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-xs font-bold text-primary">{cleanStatusLabel(o.status, fr)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {o.total ? fcfa(o.total) : fr ? "Prix après pesée" : "Priced after weighing"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            {fr ? "Aucune commande pour l'instant." : "No orders yet."}
          </p>
        )}
      </section>

      {settings ? (
        <p className="text-center text-xs text-muted-foreground">
          ASH Clean · {settings.facility_address} · {settings.facility_hours}
        </p>
      ) : null}
    </div>
  );
}
