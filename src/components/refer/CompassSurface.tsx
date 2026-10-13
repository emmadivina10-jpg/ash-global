import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Compass, EyeOff, Map, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useOrbVisible } from "@/lib/orb-visibility";
import { WalletSummary } from "./WalletSummary";

/** One viewport-owned launcher and panel, shared by app and tracking screens. */
export function CompassSurface({
  map,
  initiallyOpen = false,
  active = false,
}: {
  map: ReactNode;
  initiallyOpen?: boolean;
  active?: boolean;
}) {
  const { tx } = useI18n();
  const { visible, setVisible } = useOrbVisible();
  const [open, setOpen] = useState(initiallyOpen);
  const [tab, setTab] = useState<"map" | "wallet">(active ? "map" : "wallet");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const launcher = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(
    null,
  );
  const moved = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("ash-compass-position") ?? "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y))
        setOffset({ x: saved.x, y: saved.y });
    } catch {
      /* Storage is optional. */
    }
  }, []);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  useEffect(() => {
    const clamp = () => {
      const bounds = launcher.current?.getBoundingClientRect();
      if (!bounds) return;
      setOffset((value) => ({
        x:
          value.x +
          (bounds.left < 12
            ? 12 - bounds.left
            : bounds.right > window.innerWidth - 12
              ? window.innerWidth - 12 - bounds.right
              : 0),
        y:
          value.y +
          (bounds.top < 48
            ? 48 - bounds.top
            : bounds.bottom > window.innerHeight - 80
              ? window.innerHeight - 80 - bounds.bottom
              : 0),
      }));
    };
    const frame = window.requestAnimationFrame(clamp);
    window.addEventListener("resize", clamp);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", clamp);
    };
  }, [visible]);

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    moved.current = false;
    drag.current = { px: event.clientX, py: event.clientY, x: offset.x, y: offset.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.px;
    const dy = event.clientY - start.py;
    if (!start.moved && Math.hypot(dx, dy) < 6) return;
    start.moved = true;
    moved.current = true;
    const bounds = event.currentTarget.getBoundingClientRect();
    const baseX = bounds.left - offset.x;
    const baseY = bounds.top - offset.y;
    setOffset({
      x: Math.max(12 - baseX, Math.min(window.innerWidth - 84 - baseX, start.x + dx)),
      y: Math.max(48 - baseY, Math.min(window.innerHeight - 152 - baseY, start.y + dy)),
    });
  }
  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.moved) {
      try {
        window.localStorage.setItem("ash-compass-position", JSON.stringify(offset));
      } catch {
        /* Storage is optional. */
      }
    }
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!visible) return null;
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          overlayClassName="bg-foreground/20 backdrop-blur-md duration-300 motion-reduce:animate-none"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            launcher.current?.focus();
          }}
          className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-border bg-card p-0 shadow-raised duration-300 motion-reduce:animate-none sm:rounded-3xl [&>button]:hidden"
        >
          <header className="compass-header flex shrink-0 items-center border-b border-border px-4 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Compass className="size-5 text-success" />
              ASH Compass
            </DialogTitle>
          </header>
          <div
            role="tablist"
            aria-label="ASH Compass"
            className="flex shrink-0 gap-2 border-b border-border p-3"
          >
            <Button
              role="tab"
              aria-selected={tab === "map"}
              aria-controls="compass-map-panel"
              id="compass-map-tab"
              variant={tab === "map" ? "secondary" : "ghost"}
              className="flex-1"
              onClick={() => setTab("map")}
            >
              <Map className="size-4 text-success" />
              {tx("Map", "Carte")}
            </Button>
            <Button
              role="tab"
              aria-selected={tab === "wallet"}
              aria-controls="compass-wallet-panel"
              id="compass-wallet-tab"
              variant={tab === "wallet" ? "secondary" : "ghost"}
              className="flex-1"
              onClick={() => setTab("wallet")}
            >
              <Wallet className="size-4 text-verified-magenta" />
              {tx("Wallet", "Portefeuille")}
            </Button>
          </div>
          <div
            className="min-h-0 overflow-y-auto"
            role="tabpanel"
            id={`compass-${tab}-panel`}
            aria-labelledby={`compass-${tab}-tab`}
          >
            {tab === "map" ? map : <WalletSummary onClose={() => setOpen(false)} />}
          </div>
          <footer className="shrink-0 border-t border-border p-2">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                setOpen(false);
                setVisible(false);
              }}
            >
              <EyeOff className="size-4" />
              {tx("Turn off ASH Compass", "Masquer ASH Compass")}
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
      <div
        style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-40 lg:bottom-8 lg:right-8"
      >
        <Button
          ref={launcher}
          data-pull-refresh-ignore
          variant="ghost"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => {
            drag.current = null;
            moved.current = true;
          }}
          onClick={() => {
            if (!moved.current) setOpen((value) => !value);
            moved.current = false;
          }}
          aria-expanded={open}
          aria-label={tx("Open ASH Compass", "Ouvrir ASH Compass")}
          title="ASH Compass"
          className="compass-orb wallet-orb relative size-[72px] touch-none rounded-full p-0 text-on-dark [&_svg]:size-7"
        >
          <span className="flex flex-col items-center gap-1">
            <Compass aria-hidden />
            <span className="text-[9px] font-bold">Compass</span>
          </span>
          {active && (
            <span className="absolute bottom-1 right-1 size-3 rounded-full border-2 border-card bg-success" />
          )}
        </Button>
      </div>
    </>
  );
}
