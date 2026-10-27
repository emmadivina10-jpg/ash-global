import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../src/lib/i18n.locales";
import {
  LANGUAGE_STORAGE_KEY,
  readLanguage,
  resolveLanguage,
  saveLanguage,
} from "../src/lib/language-preference";

describe("English and French interface preferences", () => {
  it("offers only English and French", () => {
    expect(LANGUAGES.map(({ code }) => code)).toEqual(["en", "fr"]);
  });
  it("keeps either explicitly selected language over the device language", () => {
    expect(resolveLanguage("en", "fr-CA")).toBe("en");
    expect(resolveLanguage("fr", "en-US")).toBe("fr");
  });
  it("normalizes retired languages to a supported device language", () => {
    expect(resolveLanguage("ar", "fr-CA")).toBe("fr");
    expect(resolveLanguage("es", "es-ES")).toBe("en");
  });
  it("can read and save both selections for the next app opening", () => {
    let value: string | null = null;
    const storage = {
      getItem: () => value,
      setItem: (key: string, next: string) => {
        expect(key).toBe(LANGUAGE_STORAGE_KEY);
        value = next;
      },
    };
    saveLanguage(storage, "fr");
    expect(readLanguage(storage, "en")).toBe("fr");
    saveLanguage(storage, "en");
    expect(readLanguage(storage, "fr")).toBe("en");
  });
  it("does not prevent switching when storage is blocked", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readLanguage(storage, "fr-CA")).toBe("fr");
    expect(() => saveLanguage(storage, "fr")).not.toThrow();
  });
});
