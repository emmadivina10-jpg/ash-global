import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";

/** Snapshot transitions leave live fixed composers in their native viewport. */
export function ScreenSlide() {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const previousPath = useRef(pathname);

  useEffect(() => {
    const previousDefault = router.options.defaultViewTransition;
    const unsubscribe = router.subscribe("onBeforeLoad", (event) => {
      const isMemberScreen = (path: string) => router.matchRoutes(path).some(
        (match) => match.routeId === "/_authenticated" || match.routeId.startsWith("/_authenticated/"),
      );
      const enabled = Boolean(event.pathChanged && event.fromLocation &&
        isMemberScreen(event.fromLocation.pathname) && isMemberScreen(event.toLocation.pathname) &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      const fromIndex = event.fromLocation?.state.__TSR_index ?? 0;
      const toIndex = event.toLocation.state.__TSR_index ?? fromIndex;
      document.documentElement.dataset['memberSlide'] = enabled
        ? (toIndex < fromIndex ? "back" : "forward") : "off";
      router.update({ ...router.options, defaultViewTransition: enabled });
    });
    return () => {
      unsubscribe();
      router.update({ ...router.options, defaultViewTransition: previousDefault ?? false });
      delete document.documentElement.dataset['memberSlide'];
    };
  }, [router]);

  useLayoutEffect(() => {
    const changed = previousPath.current !== pathname;
    previousPath.current = pathname;
    if (!changed || typeof document.startViewTransition === "function" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pane = document.querySelector<HTMLElement>(".app-shell-scroll");
    if (!pane) return;
    const back = document.documentElement.dataset['memberSlide'] === "back";
    const animation = pane.animate(
      [{ translate: back ? "-12% 0" : "12% 0" }, { translate: "0 0" }],
      { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    return () => animation.cancel();
  }, [pathname]);

  return null;
}