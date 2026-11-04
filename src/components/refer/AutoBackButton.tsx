import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const OWN_BACK = 'a[aria-label*="back" i], button[aria-label*="back" i], a[aria-label*="retour" i], button[aria-label*="retour" i]';

/**
 * A Back control for every non-tab screen. It hides itself when the page
 * already renders its own Back button, so there is never a duplicate.
 */
export function AutoBackButton({ home }: { home: string }) {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ref = useRef<HTMLDivElement>(null);
  const [pageHasBack, setPageHasBack] = useState(false);

  useEffect(() => {
    const main = ref.current?.parentElement;
    if (!main) return;
    const check = () => {
      const mine = (el: Element) => Boolean(ref.current?.contains(el));
      const found =
        Array.from(main.querySelectorAll(OWN_BACK)).some((el) => !mine(el)) ||
        Array.from(main.querySelectorAll("a, button")).some(
          (el) => !mine(el) && /^(←\s*)?(back|retour)$/i.test(el.textContent?.trim() ?? ""),
        );
      setPageHasBack(found);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else void navigate({ to: home });
  };

  return (
    <div ref={ref} className={pageHasBack ? "hidden" : "mb-3"}>
      <button
        type="button"
        onClick={goBack}
        data-auto-back
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
      >
        <ArrowLeft className="size-4" aria-hidden />
        <span>{tx("Back", "Retour")}</span>
      </button>
    </div>
  );
}
