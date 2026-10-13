import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { InvestorMapPoint } from "@/lib/investor-map.functions";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Read-only world map of provider counts for the Investor Center. Browser-only. */
export default function InvestorWorldMap({ points }: { points: InvestorMapPoint[] }) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<{
    L: typeof import("leaflet");
    map: import("leaflet").Map;
    group: import("leaflet").LayerGroup;
  } | null>(null);
  const latest = useRef(points);
  latest.current = points;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || state.current) return;
      const map = L.map(el.current, { worldCopyJump: true, minZoom: 2, zoomControl: true }).setView(
        [18, 10],
        2,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      state.current = { L, map, group: L.layerGroup().addTo(map) };
      draw();
    })();
    return () => {
      cancelled = true;
      state.current?.map.remove();
      state.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const s = state.current;
    if (!s) return;
    const { L, group } = s;
    group.clearLayers();
    const primary =
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#e11d48";
    for (const p of latest.current) {
      const radius = Math.min(6 + Math.sqrt(p.count) * 4, 26);
      const label = `${p.city ? `${esc(p.city)}, ` : ""}${esc(p.country)} — ${p.count} provider${p.count === 1 ? "" : "s"}`;
      L.circleMarker([p.lat, p.lng], {
        radius,
        color: primary,
        weight: 2,
        fillColor: primary,
        fillOpacity: 0.45,
      })
        .bindTooltip(label)
        .addTo(group);
    }
  }

  useEffect(() => {
    draw();
  });

  return (
    <div
      ref={el}
      className="h-[46vh] min-h-72 w-full rounded-xl"
      aria-label="World map of providers"
    />
  );
}
