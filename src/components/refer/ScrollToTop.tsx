import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const SHOW_AFTER = 520;

/** A phone-only shortcut back to the top of the active scrolling surface. */
export function ScrollToTop() {
  const { lang } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [visible, setVisible] = useState(false);
  const activeScroller = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setVisible(false);
    activeScroller.current = null;

    const update = (event?: Event) => {
      const target = event?.target;
      if (target instanceof HTMLElement && target.scrollHeight > target.clientHeight) {
        activeScroller.current = target;
      }

      const pane =
        activeScroller.current ?? document.querySelector<HTMLElement>(".app-shell-scroll");
      const top = Math.max(window.scrollY, pane?.scrollTop ?? 0);
      setVisible(top > SHOW_AFTER);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    document.addEventListener("scroll", update, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [pathname]);

  function returnToTop() {
    activeScroller.current?.scrollTo({ top: 0, behavior: "smooth" });
    document
      .querySelector<HTMLElement>(".app-shell-scroll")
      ?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      onClick={returnToTop}
      aria-label={lang === "fr" ? "Revenir en haut" : "Back to top"}
      className={`fixed bottom-24 left-4 z-40 size-11 rounded-full border border-border shadow-[var(--shadow-card)] transition-all duration-200 lg:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="size-5" aria-hidden />
    </Button>
  );
}
