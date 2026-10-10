import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = { lat: number; lng: number; label: string; kind: "me" | "other" };

/** Live OpenStreetMap map (works worldwide). Imported only in the browser. */
export default function LiveTripMap({ points }: { points: MapPoint[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const layer = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !el.current || map.current) return;
      map.current = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([20, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
      draw(L);
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw(L: typeof import("leaflet")) {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const latlngs = points.map((p) => L.latLng(p.lat, p.lng));
    points.forEach((p) => {
      L.circleMarker([p.lat, p.lng], {
        radius: 10, weight: 3, color: p.kind === "me" ? "#10b981" : "#d946ef", fillOpacity: 0.85,
      }).bindTooltip(p.label, { permanent: true, direction: "top" }).addTo(layer.current!);
    });
    if (latlngs.length === 2) L.polyline(latlngs, { color: "#10b981", dashArray: "6 8", weight: 3 }).addTo(layer.current);
    if (latlngs.length >= 2) map.current.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 15 });
    else if (latlngs.length === 1) map.current.setView(latlngs[0]!, 14);
  }

  useEffect(() => {
    void import("leaflet").then((L) => draw(L));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);

  return <div ref={el} className="h-[min(22rem,42dvh)] min-h-56 w-full" aria-label="Live map" />;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
