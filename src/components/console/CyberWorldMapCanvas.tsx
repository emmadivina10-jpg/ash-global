import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import airports from "@/lib/geo/airports.json";
import type { MapDevice, MapProvider, MapTrip } from "@/lib/cyber-map.functions";

export type Layers = { providers: boolean; devices: boolean; trips: boolean; airports: boolean };

type Props = {
  providers: MapProvider[];
  devices: MapDevice[];
  trips: MapTrip[];
  layers: Layers;
  onProvider: (p: MapProvider) => void;
  onDevice: (d: MapDevice) => void;
  onTrip: (t: MapTrip) => void;
};

function token(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Browser-only Leaflet world map for the Cyber desk. */
export default function CyberWorldMapCanvas(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<{ L: typeof import("leaflet"); map: import("leaflet").Map; groups: Record<keyof Layers, import("leaflet").LayerGroup> } | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      (window as unknown as { L: typeof L }).L = L;
      await import("leaflet.markercluster");
      if (cancelled || !el.current || state.current) return;
      const map = L.map(el.current, { worldCopyJump: true, minZoom: 2, zoomControl: true }).setView([18, 10], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      const cluster = (opts?: object) => (L as unknown as { markerClusterGroup: (o?: object) => import("leaflet").LayerGroup }).markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50, ...opts });
      state.current = {
        L, map,
        groups: { providers: cluster(), devices: cluster(), trips: L.layerGroup(), airports: cluster({ disableClusteringAtZoom: 7 }) },
      };
      draw();
    })();
    return () => { cancelled = true; state.current?.map.remove(); state.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const s = state.current;
    if (!s) return;
    const { L, map, groups } = s;
    const p = latest.current;
    const primary = token("--primary", "#e11d48");
    const danger = token("--destructive", "#dc2626");
    const gold = token("--gold", "#7c3aed");
    const muted = token("--muted-foreground", "#64748b");
    Object.values(groups).forEach((g) => g.clearLayers());

    for (const pr of p.providers) {
      const initials = esc(pr.name.slice(0, 2).toUpperCase());
      const img = pr.avatar ? `<img src="${esc(pr.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px"/>` : `<span style="font:700 12px system-ui">${initials}</span>`;
      const ring = pr.precision === "live" ? primary : gold;
      const icon = L.divIcon({
        className: "",
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        html: `<div style="width:38px;height:38px;border-radius:9999px;border:3px solid ${ring};background:var(--card);display:grid;place-items:center;overflow:hidden;box-shadow:0 4px 12px rgb(0 0 0 / .3)">${img}</div>`,
      });
      L.marker([pr.lat, pr.lng], { icon, title: pr.name }).on("click", () => latest.current.onProvider(pr)).addTo(groups.providers);
    }
    for (const d of p.devices) {
      L.circleMarker([d.lat, d.lng], { radius: d.suspicious ? 8 : 6, color: d.suspicious ? danger : muted, weight: 2, fillOpacity: 0.7 })
        .bindTooltip(`${esc(d.name)} · ${esc(d.ip)}${d.city ? ` · ${esc(d.city)}` : ""}`)
        .on("click", () => latest.current.onDevice(d))
        .addTo(groups.devices);
    }
    for (const t of p.trips) {
      const pts = t.points.map((x) => L.latLng(x.lat, x.lng));
      t.points.forEach((x) => {
        L.circleMarker([x.lat, x.lng], { radius: 9, color: x.party.toUpperCase() === "PROVIDER" ? primary : gold, weight: 3, fillOpacity: 0.9 })
          .bindTooltip(`${esc(t.title)} · ${esc(x.party.toLowerCase())}`)
          .on("click", () => latest.current.onTrip(t))
          .addTo(groups.trips);
      });
      if (pts.length === 2) L.polyline(pts, { color: primary, dashArray: "6 8", weight: 3 }).on("click", () => latest.current.onTrip(t)).addTo(groups.trips);
    }
    if (groups.airports.getLayers().length === 0) {
      for (const a of airports as unknown as [string, string, number, number, string, string][]) {
        L.circleMarker([a[2], a[3]], { radius: a[5] === "l" ? 4 : 3, color: gold, weight: 1, fillOpacity: 0.6 })
          .bindTooltip(`✈ ${esc(a[0])} · ${esc(a[1])} (${esc(a[4])})`)
          .addTo(groups.airports);
      }
    }
    (Object.keys(groups) as (keyof Layers)[]).forEach((k) => {
      if (p.layers[k]) groups[k].addTo(map);
      else groups[k].remove();
    });
  }

  useEffect(() => { draw(); });

  return (
    <div className="relative h-full w-full">
      <div ref={el} className="h-full w-full" />
      <CompassRose />
    </div>
  );
}

function CompassRose() {
  return (
    <div aria-label="Compass: north is up" className="pointer-events-none absolute right-3 top-3 z-[500] size-24 rounded-full border border-border bg-card/85 shadow-lg backdrop-blur">
      <svg viewBox="0 0 100 100" className="size-full">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeOpacity=".2" />
        <polygon points="50,10 56,50 50,46 44,50" className="fill-primary" />
        <polygon points="50,90 56,50 50,54 44,50" className="fill-muted-foreground" />
        <polygon points="10,50 50,44 46,50 50,56" className="fill-muted-foreground/60" />
        <polygon points="90,50 50,44 54,50 50,56" className="fill-muted-foreground/60" />
        <circle cx="50" cy="50" r="3" className="fill-foreground" />
        <text x="50" y="9" textAnchor="middle" className="fill-primary" style={{ font: "700 10px system-ui" }}>N</text>
        <text x="50" y="99" textAnchor="middle" className="fill-foreground" style={{ font: "700 10px system-ui" }}>S</text>
        <text x="96" y="54" textAnchor="middle" className="fill-foreground" style={{ font: "700 10px system-ui" }}>E</text>
        <text x="4" y="54" textAnchor="middle" className="fill-foreground" style={{ font: "700 10px system-ui" }}>W</text>
      </svg>
    </div>
  );
}
