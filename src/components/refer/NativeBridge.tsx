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

  return null;
}
