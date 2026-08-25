import { useCallback, useEffect, useState } from "react";

const KEY = "ash.location";
const ASKED_KEY = "ash.location.asked";

export type SavedLocation = { lat: number; lng: number; label?: string; savedAt: number };

/** Major Cameroonian cities, used to turn raw coordinates into a usable city label. */
const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Douala", lat: 4.0511, lng: 9.7679 },
  { name: "Yaoundé", lat: 3.848, lng: 11.5021 },
  { name: "Bafoussam", lat: 5.4781, lng: 10.4176 },
  { name: "Bamenda", lat: 5.9631, lng: 10.1591 },
  { name: "Garoua", lat: 9.3017, lng: 13.3921 },
  { name: "Maroua", lat: 10.591, lng: 14.3159 },
  { name: "Ngaoundéré", lat: 7.3167, lng: 13.5833 },
  { name: "Bertoua", lat: 4.5772, lng: 13.6846 },
  { name: "Buea", lat: 4.1527, lng: 9.241 },
  { name: "Limbe", lat: 4.0228, lng: 9.1954 },
  { name: "Kribi", lat: 2.9373, lng: 9.9099 },
  { name: "Ebolowa", lat: 2.9, lng: 11.15 },
  { name: "Dschang", lat: 5.4468, lng: 10.0537 },
  { name: "Kumba", lat: 4.6363, lng: 9.4469 },
  { name: "Edéa", lat: 3.8, lng: 10.1333 },
  { name: "Bafang", lat: 5.1547, lng: 10.1786 },
];

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Closest known city to the given coordinates, or null when nothing is within 150 km. */
export function nearestCity(lat: number, lng: number): string | null {
  let best: { name: string; km: number } | null = null;
  for (const city of CITIES) {
    const km = distanceKm(lat, lng, city.lat, city.lng);
    if (!best || km < best.km) best = { name: city.name, km };
  }
  return best && best.km <= 150 ? best.name : null;
}

function read(): SavedLocation | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedLocation) : null;
  } catch {
    return null;
  }
}

/**
 * Stores the member's coordinates locally once. Discovery uses it to sort
 * "Nearby" first; we never ask twice unless the member opens the prompt again.
 */
export function useLocation() {
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [asked, setAsked] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocation(read());
    setAsked(localStorage.getItem(ASKED_KEY) === "1");
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(ASKED_KEY, "1");
    setAsked(true);
  }, []);

  const request = useCallback(async () => {
    localStorage.setItem(ASKED_KEY, "1");
    setAsked(true);
    if (typeof navigator === "undefined" || !navigator.geolocation) return null;
    setBusy(true);
    return new Promise<SavedLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const label = nearestCity(lat, lng);
          const value: SavedLocation = {
            lat,
            lng,
            ...(label ? { label } : {}),
            savedAt: Date.now(),
          };
          localStorage.setItem(KEY, JSON.stringify(value));
          setLocation(value);
          setBusy(false);
          resolve(value);
        },
        () => {
          setBusy(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
      );
    });
  }, []);

  return { location, asked, busy, request, dismiss };
}
