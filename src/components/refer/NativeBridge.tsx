import { useEffect } from "react";
import { initNativeShell } from "@/lib/native";

/**
 * Mounts native-only behaviour (status bar, splash, Android back button).
 * Renders nothing and is inert on the web build.
 */
export function NativeBridge() {
  useEffect(() => {
    let dispose: (() => void) | undefined;
    void initNativeShell().then((fn) => {
      dispose = fn;
    });
    return () => dispose?.();
  }, []);

  // Keep the app frame exactly as tall as the *visible* area. Without this the
  // WebView's layout viewport can be taller than the screen, which leaves an
  // empty band under the tab bar on some phones.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const sync = () => {
      const height = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--ash-vh", `${Math.round(height)}px`);
    };
    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return null;
}
