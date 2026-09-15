import { useEffect, useState } from "react";

/** Remembers whether the floating round ASH button is shown. */
export const ORB_KEY = "ash.orb.hidden";
const EVENT = "ash-orb-visibility";

export function isOrbHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ORB_KEY) === "1";
  } catch {
    return false;
  }
}

export function setOrbHidden(hidden: boolean) {
  try {
    window.localStorage.setItem(ORB_KEY, hidden ? "1" : "0");
  } catch {
    /* ignore unwritable storage */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useOrbVisible() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sync = () => setVisible(!isOrbHidden());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { visible, setVisible: (value: boolean) => setOrbHidden(!value) };
}
