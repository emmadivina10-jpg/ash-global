/**
 * Native (Capacitor) runtime helpers.
 *
 * Everything here is browser-only and no-ops on the web build, so the same
 * codebase serves the website and the iOS / Android apps.
 */
import { Capacitor } from "@capacitor/core";

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform(): "ios" | "android" | "web" {
  try {
    const platform = Capacitor.getPlatform();
    return platform === "ios" || platform === "android" ? platform : "web";
  } catch {
    return "web";
  }
}

/**
 * Boots native-only chrome: status bar tint, splash dismissal, hardware back
 * button handling and a `native`/`ios`/`android` class on <html> for styling.
 * Safe to call unconditionally from a client effect.
 */
export async function initNativeShell(onBack?: () => boolean): Promise<() => void> {
  if (typeof window === "undefined" || !isNativeApp()) return () => {};

  const platform = nativePlatform();
  document.documentElement.classList.add("native", platform);

  const cleanups: Array<() => void> = [
    () => document.documentElement.classList.remove("native", platform),
  ];

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    const dark = document.documentElement.classList.contains("dark");
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    if (platform === "android") {
      await StatusBar.setBackgroundColor({ color: dark ? "#080812" : "#ffffff" });
    }
  } catch {
    /* status bar unavailable — ignore */
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    /* splash already hidden */
  }

  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("backButton", ({ canGoBack }) => {
      // Let the app decide first (close sheets/dialogs), then fall back.
      if (onBack?.()) return;
      if (canGoBack || window.history.length > 1) {
        window.history.back();
      } else {
        void App.exitApp();
      }
    });
    cleanups.push(() => void handle.remove());
  } catch {
    /* app plugin unavailable */
  }

  return () => cleanups.forEach((fn) => fn());
}

/** Opens an external link in the in-app browser on native, a new tab on web. */
export async function openExternal(url: string): Promise<void> {
  if (!isNativeApp()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}
