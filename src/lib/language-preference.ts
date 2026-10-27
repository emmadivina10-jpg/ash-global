export type InterfaceLanguage = "en" | "fr";
export const LANGUAGE_STORAGE_KEY = "refer.lang";

export function resolveLanguage(stored: string | null, device = "en"): InterfaceLanguage {
  if (stored === "en" || stored === "fr") return stored;
  return device.toLowerCase().split(/[-_]/)[0] === "fr" ? "fr" : "en";
}

export function readLanguage(storage: Pick<Storage, "getItem">, device: string): InterfaceLanguage {
  try {
    return resolveLanguage(storage.getItem(LANGUAGE_STORAGE_KEY), device);
  } catch {
    return resolveLanguage(null, device);
  }
}

export function saveLanguage(storage: Pick<Storage, "setItem">, language: InterfaceLanguage): void {
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The interface still switches when a device blocks persistent storage.
  }
}
