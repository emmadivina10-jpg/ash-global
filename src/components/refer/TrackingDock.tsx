import { useState, type ReactNode } from "react";
import { Map, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletSummary } from "./WalletSummary";
import { useI18n } from "@/lib/i18n";

/** Viewport-owned tracking surface: not clipped by the page's scroll pane. */
export function TrackingDock({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"map" | "wallet">("map");
  return <>
    {open && <section aria-label={fr ? "Suivi et portefeuille" : "Tracking and wallet"} className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-3 z-40 flex max-h-[calc(100dvh-11rem)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-raised)] sm:right-6 sm:w-[28rem] lg:bottom-28">
      <div className="flex shrink-0 items-center gap-2 border-b border-border p-3">
        <div className="flex flex-1 gap-1" role="tablist" aria-label={fr ? "Suivi" : "Tracking"}>
          <Button role="tab" aria-selected={tab === "map"} aria-controls="tracking-map-panel" variant={tab === "map" ? "default" : "ghost"} onClick={() => setTab("map")} className="rounded-full"><Map className="size-4" />{fr ? "Carte" : "Map"}</Button>
          <Button role="tab" aria-selected={tab === "wallet"} aria-controls="tracking-wallet-panel" variant={tab === "wallet" ? "default" : "ghost"} onClick={() => setTab("wallet")} className="rounded-full"><Wallet className="size-4" />{fr ? "Portefeuille" : "Wallet"}</Button>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setOpen(false)} aria-label={fr ? "Réduire la carte" : "Minimize tracking"}><X className="size-4" /></Button>
      </div>
      <div className="min-h-0 overflow-y-auto" role="tabpanel" id={tab === "map" ? "tracking-map-panel" : "tracking-wallet-panel"}>
        {tab === "map" ? children : <WalletSummary onClose={() => setOpen(false)} />}
      </div>
    </section>}
    <Button onClick={() => { setTab("map"); setOpen(!open); }} aria-expanded={open} aria-label={fr ? "Ouvrir le suivi" : "Open tracking map"} className="wallet-orb fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 size-16 rounded-full p-0 text-foreground lg:bottom-8 lg:right-8">
      <span className="flex flex-col items-center gap-0.5"><Map className="size-6" /><span className="text-[10px] font-bold">{fr ? "Carte" : "Map"}</span></span>
    </Button>
  </>;
}