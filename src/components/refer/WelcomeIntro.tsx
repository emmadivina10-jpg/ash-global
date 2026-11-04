import { useEffect, useLayoutEffect, useState } from "react";

/** Kept as a compatibility component; app entry now opens directly into guest browsing. */
export function WelcomeIntro({ onDone }: { onDone?: () => void }) {
  const [done, setDone] = useState(false);
  const useIsoLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;
  useIsoLayoutEffect(() => {
    setDone(true);
    onDone?.();
  }, [onDone]);
  return done ? null : null;
}

export function welcomeSeen(): boolean {
  return true;
}
