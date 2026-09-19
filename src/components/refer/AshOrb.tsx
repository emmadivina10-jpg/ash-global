import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CreditCard, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/queries";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useOrbVisible } from "@/lib/orb-visibility";

export function AshOrb() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { visible } = useOrbVisible();
  const { data: wallet, isLoading } = useWallet();
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number; moved: boolean } | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ash-wallet-launcher-offset");
      if (saved) {
        const value = JSON.parse(saved) as { x?: number; y?: number };
        if (typeof value.x === "number" && typeof value.y === "number") setOffset({ x: value.x, y: value.y });
      }
    } catch { /* Keep the default position. */ }
  }, []);

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    drag.current = { px: event.clientX, py: event.clientY, ox: offset.x, oy: offset.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.px;
    const dy = event.clientY - start.py;
    if (!start.moved && Math.hypot(dx, dy) < 6) return;
    start.moved = true;
    setOffset({
      x: Math.min(0, Math.max(-(window.innerWidth - 112), start.ox + dx)),
      y: Math.min(0, Math.max(-(window.innerHeight - 190), start.oy + dy)),
    });
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (start?.moved) {
      try { window.localStorage.setItem("ash-wallet-launcher-offset", JSON.stringify(offset)); } catch { /* Ignore unavailable storage. */ }
      return;
    }
    setOpen(true);
  }

  if (!visible) return null;
  return (
    <>
      <div style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }} className="fixed bottom-24 right-4 z-40 touch-none lg:bottom-8 lg:right-8">
        <button
          type="button"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => { drag.current = null; }}
          aria-label={fr ? "Ouvrir le portefeuille" : "Open wallet"}
          className="group relative h-14 w-[5.75rem] overflow-hidden rounded-[10px] border border-primary/35 bg-primary text-primary-foreground shadow-[var(--shadow-raised)] transition-transform hover:scale-[1.03]"
        >
          <span className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/80" aria-hidden />
          <span className="relative flex h-full flex-col items-start justify-center px-3 text-left">
            <Wallet className="size-4" aria-hidden />
            <span className="mt-0.5 text-[11px] font-extrabold uppercase">{fr ? "Portefeuille" : "Wallet"}</span>
          </span>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/65 backdrop-blur-md sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0" aria-label="Close" onClick={() => setOpen(false)} />
          <section role="dialog" aria-modal="true" aria-label="Wallet balance" className="ash-rise relative w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-[var(--shadow-raised)] sm:rounded-3xl">
            <Button size="icon" variant="ghost" className="absolute right-3 top-3" onClick={() => setOpen(false)} aria-label="Close"><X className="size-4" /></Button>
            <div className="virtual-card grain relative overflow-hidden p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-extrabold uppercase tracking-wide opacity-70">Cool ASH Card</span><CreditCard className="size-5" /></div>
              <p className="mt-7 text-xs opacity-65">{fr ? "Solde disponible" : "Available balance"}</p>
              <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{isLoading ? "…" : formatXAF(wallet?.available_balance ?? 0)}</p>
              <div className="mt-6 flex items-center justify-between border-t border-primary-foreground/15 pt-3 text-xs"><span className="opacity-65">{fr ? "En attente" : "Pending"}</span><strong>{isLoading ? "…" : formatXAF(wallet?.pending_balance ?? 0)}</strong></div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{fr ? "Ces montants proviennent directement de votre portefeuille ASH Glo." : "These amounts come directly from your ASH Glo wallet."}</p>
            <Button asChild className="mt-5 w-full"><Link to="/wallet" onClick={() => setOpen(false)}>{fr ? "Ouvrir le portefeuille complet" : "Open Full Wallet"}</Link></Button>
          </section>
        </div>
      ) : null}
    </>
  );
}