import { useEffect, useRef } from "react";

type Ripple = {
  x: number;
  y: number;
  born: number;
  strength: number;
};

/**
 * Calm, professional water surface. Soft colour fields drift slowly; pointer or
 * touch movement drops clean expanding rings that fade out — never crowded.
 */
export function WaterBackdrop({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ripples: Ripple[] = [];
    let lastDrop = 0;
    let raf = 0;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function drop(x: number, y: number, strength: number) {
      const now = performance.now();
      // Keep it clean: at most one ring every 110ms, max 6 alive.
      if (now - lastDrop < 110) return;
      lastDrop = now;
      ripples.push({ x, y, born: now, strength });
      if (ripples.length > 6) ripples.shift();
    }

    function onPointerMove(event: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      drop(event.clientX - rect.left, event.clientY - rect.top, 0.55);
    }
    function onPointerDown(event: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      lastDrop = 0;
      drop(event.clientX - rect.left, event.clientY - rect.top, 1);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    const LIFE = 1800;

    function frame(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Slow drifting light fields — the "water".
      const t = reduce ? 0 : now / 9000;
      const fields = [
        { x: 0.22 + Math.sin(t) * 0.05, y: 0.28 + Math.cos(t * 0.8) * 0.05, r: 0.55, c: "155, 92, 255" },
        { x: 0.72 + Math.cos(t * 0.7) * 0.06, y: 0.62 + Math.sin(t * 0.9) * 0.05, r: 0.6, c: "228, 48, 107" },
        { x: 0.5 + Math.sin(t * 0.5) * 0.08, y: 0.9, r: 0.5, c: "70, 40, 140" },
      ];
      const base = Math.max(width, height);
      for (const f of fields) {
        const g = ctx.createRadialGradient(f.x * width, f.y * height, 0, f.x * width, f.y * height, f.r * base);
        g.addColorStop(0, `rgba(${f.c}, 0.28)`);
        g.addColorStop(1, `rgba(${f.c}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }

      // Ripple rings.
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const r = ripples[i]!;
        const age = (now - r.born) / LIFE;
        if (age >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        const eased = 1 - Math.pow(1 - age, 3);
        const radius = 18 + eased * 220 * r.strength;
        const alpha = (1 - age) * 0.32 * r.strength;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(r.x, r.y, radius * 0.66, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(228, 48, 107, ${alpha * 0.7})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    />
  );
}
