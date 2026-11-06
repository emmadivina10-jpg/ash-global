import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar } from "./AvatarUpload";
import { useI18n } from "@/lib/i18n";
import { playTabSound } from "@/lib/sound";

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduce;
}

/** Curves branch from the centre avatar. Coordinates use a 400 x 120 viewBox. */
const CURVES = [
  { id: "left", d: "M200 60 C 160 60 130 28 40 28", node: [40, 28], tone: "#ff4f9a", line: "#e4226a" },
  { id: "right", d: "M200 60 C 240 60 270 28 360 28", node: [360, 28], tone: "#c4b5fd", line: "#8b5cf6" },
  { id: "left-low", d: "M200 60 C 160 60 130 94 40 94", node: [40, 94], tone: "#ff4f9a", line: "#e4226a" },
  { id: "right-low", d: "M200 60 C 240 60 270 94 360 94", node: [360, 94], tone: "#c4b5fd", line: "#8b5cf6" },
];

/** ASH Pulse: the member's avatar at the centre, with BUY and SELL at the curve ends. */
export function AshPulse({
  avatarUrl,
  name,
}: {
  avatarUrl?: string | null;
  name?: string | null;
}) {
  const { tx } = useI18n();
  const reduce = usePrefersReducedMotion();
  return (
    <section
      aria-label={tx("ASH Pulse", "ASH Pulse")}
      className="relative -mt-2 h-28 select-none overflow-hidden"
    >
      <svg viewBox="0 0 400 120" className="absolute inset-0 size-full" aria-hidden>
        {CURVES.map((curve) => (
          <g key={curve.id}>
            <path d={curve.d} fill="none" stroke={curve.line} strokeOpacity=".35" strokeWidth="1" />
            <path
              d={curve.d}
              fill="none"
              stroke={curve.tone}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="2 10"
            >
              {reduce ? null : (
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-24"
                  dur="2s"
                  repeatCount="indefinite"
                />
              )}
            </path>
            <circle cx={curve.node[0]} cy={curve.node[1]} r="3" fill={curve.tone}>
              {reduce ? null : (
                <animate attributeName="r" values="2.5;4;2.5" dur="2.6s" repeatCount="indefinite" />
              )}
            </circle>
          </g>
        ))}
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary to-violet-500 p-[2px]">
        <Avatar path={avatarUrl} name={name} className="size-16 ring-2 ring-background" />
      </div>

      <Link
        to="/services"
        onClick={playTabSound}
        style={{ left: "10%", top: "23%" }}
        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-primary/60 bg-background px-3 py-1 text-[11px] font-bold tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        {tx("BUY", "ACHETER")}
      </Link>
      <Link
        to="/create"
        onClick={playTabSound}
        style={{ left: "90%", top: "23%" }}
        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-violet-400/60 bg-background px-3 py-1 text-[11px] font-bold tracking-widest text-violet-400 transition-colors hover:bg-violet-500 hover:text-white"
      >
        {tx("SELL", "VENDRE")}
      </Link>

    </section>
  );
}
