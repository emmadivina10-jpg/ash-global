import { useCallback, useEffect, useState } from "react";

const KEY = "ash.location";
const ASKED_KEY = "ash.location.asked";

export type SavedLocation = { lat: number; lng: number; label?: string; savedAt: number };

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
          const value: SavedLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
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
