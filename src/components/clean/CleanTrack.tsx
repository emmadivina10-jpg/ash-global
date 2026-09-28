import { useEffect, useRef, useState } from "react";
import { Bike, Footprints, Home, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ASH Clean custom tracker — a stylised route (not a real map).
 * The rider moves along the path as their live distance shrinks,
 * and lands on the customer's pin once the job is marked ARRIVED.
 */
export function CleanTrack({
  km,
  arrived,
  method,
  storageKey,
  fr,
  className,
}: {
  km: number | null;
  arrived: boolean;
  method: "STAFF" | "RIDER";
  storageKey: string;
  fr: boolean;
  className?: string;
}) {
  // Remember the first distance we saw as the start of the trip.
  const [startKm, setStartKm] = useState<number | null>(null);
  useEffect(() => {
    const k = `ash-clean-track:${storageKey}`;
    const saved = Number(localStorage.getItem(k));
    if (saved > 0) setStartKm(saved);
    else if (km != null && km > 0) {
      localStorage.setItem(k, String(km));
      setStartKm(km);
    }
  }, [km, storageKey]);

  const raw = arrived ? 1 : km != null && startKm ? 1 - km / Math.max(startKm, km) : 0;
  const progress = Math.min(1, Math.max(0, raw));

  const pathRef = useRef<SVGPathElement>(null);
  const [pos, setPos] = useState({ x: 30, y: 150 });
  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const pt = p.getPointAtLength(p.getTotalLength() * progress);
    setPos({ x: pt.x, y: pt.y });
  }, [progress]);

  const Icon = method === "STAFF" ? Footprints : Bike;
  const d = "M30 150 C 90 150, 90 60, 160 70 S 230 140, 290 40";

  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10", className)}>
      <svg viewBox="0 0 320 190" className="h-full w-full">
        <defs>
          <pattern id="ash-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" className="stroke-border" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="320" height="190" fill="url(#ash-grid)" />
        <path d={d} fill="none" className="stroke-muted-foreground/30" strokeWidth="10" strokeLinecap="round" />
        <path d={d} fill="none" className="stroke-muted-foreground/60" strokeWidth="1.5" strokeDasharray="6 6" />
        <path
          ref={pathRef}
          d={d}
          fill="none"
          className="stroke-primary"
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
          style={{ transition: "stroke-dashoffset 1.2s ease" }}
        />
      </svg>
      <span className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-secondary text-secondary-foreground shadow" style={{ left: `${(30 / 320) * 100}%`, top: `${(150 / 190) * 100}%` }}>
        <MapPin className="size-4" aria-hidden />
      </span>
      <span className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg" style={{ left: `${(290 / 320) * 100}%`, top: `${(40 / 190) * 100}%` }}>
        {arrived ? <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" /> : null}
        <Home className="relative size-4" aria-hidden />
      </span>
      <span
        className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-background shadow-xl"
        style={{ left: `${(pos.x / 320) * 100}%`, top: `${(pos.y / 190) * 100}%`, transition: "left 1.2s ease, top 1.2s ease" }}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="absolute bottom-2 left-3 rounded-full bg-background/80 px-2.5 py-1 text-xs font-bold text-foreground backdrop-blur">
        {arrived
          ? fr ? "Arrivé chez vous" : "Arrived at your door"
          : km == null ? (fr ? "En attente de position…" : "Waiting for position…") : `${Math.round(progress * 100)}% ${fr ? "du trajet" : "of the way"}`}
      </p>
    </div>
  );
}
