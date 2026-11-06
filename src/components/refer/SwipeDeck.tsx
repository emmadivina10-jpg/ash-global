import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { playTabSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const THRESHOLD = 90;

/** Tinder-style looping swipe deck; only the top card is mounted so one video plays at a time. */
export function SwipeDeck<T>({
  items,
  getKey,
  renderItem,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  const { tx } = useI18n();
  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const [flying, setFlying] = useState<1 | -1 | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);
  const count = items.length;
  if (!count) return null;
  const current = items[((index % count) + count) % count]!;
  const next = count > 1 ? items[(index + 1) % count]! : null;

  const commit = (dir: 1 | -1) => {
    if (count < 2) {
      setDx(0);
      return;
    }
    playTabSound();
    setFlying(dir);
    window.setTimeout(() => {
      setIndex((i) => (dir === 1 ? i + 1 : i - 1 + count));
      setFlying(null);
      setDx(0);
    }, 220);
  };

  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    if (flying || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("input[type=range]")) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false };
  };
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const moveX = event.clientX - d.x;
    if (!d.active) {
      if (Math.abs(moveX) < 10 || Math.abs(moveX) < Math.abs(event.clientY - d.y)) return;
      d.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDx(moveX);
  };
  const onUp = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    if (Math.abs(dx) > THRESHOLD) commit(dx < 0 ? 1 : -1);
    else setDx(0);
  };

  const offset = flying ? -flying * 520 : dx;
  const dragging = drag.current?.active === true;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={tx("Video swipe deck", "Pile de vidéos")}
      className="mx-auto w-full max-w-md"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") commit(1);
        if (event.key === "ArrowLeft") commit(-1);
      }}
    >
      <div className="relative">
        {next ? (
          <div
            aria-hidden
            className="absolute inset-x-3 top-3 -z-10 h-full scale-[0.96] rounded-3xl border border-border bg-card opacity-70"
          />
        ) : null}
        <div
          key={getKey(current)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClickCapture={(event) => {
            if (suppressClick.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          style={{
            transform: `translateX(${offset}px) rotate(${offset / 24}deg)`,
            opacity: flying ? 0 : 1 - Math.min(0.4, Math.abs(dx) / 600),
            touchAction: "pan-y",
          }}
          className={cn(
            "overflow-hidden rounded-3xl border border-border bg-background shadow-lg",
            !dragging && "transition-[transform,opacity] duration-200 ease-out",
          )}
        >
          {renderItem(current)}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => commit(-1)}
          disabled={count < 2}
          aria-label={tx("Previous video", "Vidéo précédente")}
          className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground disabled:opacity-40"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <span className="min-w-12 text-center text-xs font-semibold text-muted-foreground">
          {(((index % count) + count) % count) + 1} / {count}
        </span>
        <button
          type="button"
          onClick={() => commit(1)}
          disabled={count < 2}
          aria-label={tx("Next video", "Vidéo suivante")}
          className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground disabled:opacity-40"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
