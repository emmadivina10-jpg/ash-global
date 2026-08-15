import { useEffect, useRef, useState } from "react";
import { CreditCard, X } from "lucide-react";
import { useProfile } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const POS_KEY = "refer.card.pos";
const SIZE = 52;

type Pos = { x: number; y: number };

function clamp(pos: Pos): Pos {
  const maxX = Math.max(8, window.innerWidth - SIZE - 8);
  const maxY = Math.max(8, window.innerHeight - SIZE - 8);
  return { x: Math.min(Math.max(8, pos.x), maxX), y: Math.min(Math.max(8, pos.y), maxY) };
}

export function AshCardBubble() {
  const { t } = useI18n();
  const { data: profile } = useProfile();
  const [pos, setPos] = useState<Pos | null>(null);
  const [open, setOpen] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => {
    let start: Pos = { x: window.innerWidth - SIZE - 20, y: window.innerHeight - SIZE - 176 };
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) start = JSON.parse(raw) as Pos;
    } catch {
      /* ignore */
    }
    setPos(clamp(start));
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) drag.moved = true;
    setPos(clamp({ x: e.clientX - drag.dx, y: e.clientY - drag.dy }));
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (pos) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(pos));
      } catch {
        /* ignore */
      }
    }
    if (!drag.moved) setOpen((v) => !v);
  }

  if (!pos) return null;

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t("card.title")}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="eyebrow text-muted-foreground">{t("card.soon")}</p>
                <h2 className="mt-1 font-display text-xl font-extrabold text-foreground">{t("card.title")}</h2>
              </div>
              <Button size="icon" variant="ghost" aria-label={t("card.close")} onClick={() => setOpen(false)}>
                <X className="size-4" aria-hidden />
              </Button>
            </div>

            <div className="virtual-card grain relative mt-4 p-5">
              <div
                className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-gold/25 blur-3xl"
                aria-hidden
              />
              <span className="hairline-gold absolute right-4 top-4 rounded-full bg-[oklch(0_0_0_/_0.35)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-gold-soft)]">
                {t("card.soon")}
              </span>

              <p className="gold-text font-display text-lg font-extrabold tracking-[0.22em]">ASH</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">
                {t("card.tagline")}
              </p>

              <div className="relative mt-8 flex items-center gap-3">
                <span className="card-chip block h-7 w-10 rounded-[6px]" aria-hidden />
                <svg viewBox="0 0 24 24" className="size-5 opacity-70" fill="none" aria-hidden>
                  <path
                    d="M6 8a8 8 0 0 1 0 8M10.5 5.5a12 12 0 0 1 0 13M15 3a16 16 0 0 1 0 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <p className="tabular relative mt-4 text-lg font-semibold tracking-[0.22em]">•••• •••• •••• ASH</p>

              <div className="relative mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">Card holder</p>
                  <p className="truncate text-sm font-semibold uppercase tracking-wide">
                    {profile?.full_name || "ASH Member"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">Valid thru</p>
                  <p className="tabular text-sm font-semibold">—</p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">{t("card.desc")}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-foreground">
              {(["card.f1", "card.f2", "card.f3"] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                  {t(k)}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">{t("card.notify")}</p>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label={t("card.open")}
        title={t("card.open")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE }}
        className="fixed z-50 flex touch-none items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-gold))] text-white shadow-[var(--shadow-gold)] ring-2 ring-gold/50 transition-transform active:scale-95"
      >
        <CreditCard className="size-5" aria-hidden />
      </button>
    </>
  );
}
