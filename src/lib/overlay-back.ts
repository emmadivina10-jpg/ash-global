import { useEffect, useRef } from "react";

/**
 * Full-screen viewers (Stories, Spotlights, photos) register here while open so
 * the phone's back button closes the top viewer instead of leaving the page.
 */
const stack: Array<{ close: () => void }> = [];

export function closeTopOverlay(): boolean {
  const top = stack.pop();
  if (!top) return false;
  top.close();
  return true;
}

export function useOverlayBack(open: boolean, close: () => void) {
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => {
    if (!open) return;
    const entry = { close: () => latest.current() };
    stack.push(entry);
    return () => {
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
    };
  }, [open]);
}
