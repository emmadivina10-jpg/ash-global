import { useEffect, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };
export type MapMarker = LatLng & { label: string; color?: string };

declare global {
  interface Window {
    __ashMapsReady?: () => void;
    google?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

let loader: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps?.Map) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const env = import.meta.env as Record<string, string | undefined>;
    const key = env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const channel = env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] ?? "";
    if (!key) return reject(new Error("NO_KEY"));
    window.__ashMapsReady = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__ashMapsReady&channel=${channel}`;
    s.async = true;
    s.onerror = () => {
      loader = null;
      reject(new Error("LOAD_FAILED"));
    };
    document.head.appendChild(s);
  });
  return loader;
}

/** Google map with app-owned markers; tap to pick a spot when onPick is set. */
export function CleanMap({
  center,
  markers,
  route,
  onPick,
  className,
}: {
  center: LatLng;
  markers: MapMarker[];
  route?: [LatLng, LatLng] | null;
  onPick?: (p: LatLng) => void;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const pins = useRef<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const line = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadMaps()
      .then(() => {
        if (!alive || !el.current || map.current) return;
        const g = window.google.maps;
        map.current = new g.Map(el.current, {
          center,
          zoom: 14,
          clickableIcons: false,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        map.current.addListener("click", (e: { latLng: { lat: () => number; lng: () => number } }) => {
          pickRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        setReady(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    const g = window.google.maps;
    pins.current.forEach((m) => m.setMap(null));
    pins.current = markers.map(
      (m) =>
        new g.Marker({
          position: { lat: m.lat, lng: m.lng },
          map: map.current,
          label: { text: m.label, color: "#fff", fontWeight: "700", fontSize: "11px" },
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: m.color ?? "#059669",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        }),
    );
    line.current?.setMap(null);
    if (route) {
      line.current = new g.Polyline({
        path: route,
        map: map.current,
        strokeColor: "#059669",
        strokeOpacity: 0.8,
        strokeWeight: 4,
      });
    }
    if (markers.length > 1) {
      const b = new g.LatLngBounds();
      markers.forEach((m) => b.extend(m));
      map.current.fitBounds(b, 48);
    } else if (markers[0]) {
      map.current.panTo(markers[0]);
    }
  }, [ready, markers, route]);

  if (failed)
    return (
      <div className={`grid place-items-center rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground ${className ?? ""}`}>
        Map unavailable here. You can still search or type your address.
      </div>
    );
  return <div ref={el} className={`rounded-2xl bg-muted ${className ?? ""}`} />;
}
