import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

const EDGE = 32; // how close to the left edge the finger must start
const DISTANCE = 70; // how far it must travel before we go back

/**
 * Lets members swipe from the left edge of any screen to return to the
 * previous one, the way native apps behave. Silent on desktop pointers.
 */
export function SwipeBack() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    function onStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      tracking = touch.clientX <= EDGE;
      startX = touch.clientX;
      startY = touch.clientY;
    }

    function onEnd(event: TouchEvent) {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (dx < DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if (window.history.length > 1) router.history.back();
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [router]);

  return null;
}
