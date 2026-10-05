import { useSyncExternalStore } from "react";

export type ServicesMode = "services" | "market";
const KEY = "ash.services.mode";
const EVENT = "ash-services-mode";
function snapshot(): ServicesMode {
  try { return localStorage.getItem(KEY) === "market" ? "market" : "services"; }
  catch { return "services"; }
}
function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
export function setServicesMode(mode: ServicesMode) {
  try { localStorage.setItem(KEY, mode); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
}
export function useServicesMode() {
  return useSyncExternalStore(subscribe, snapshot, (): ServicesMode => "services");
}