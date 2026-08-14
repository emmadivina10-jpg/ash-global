import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "fr";

const KEY = "refer.lang";

const DICT = {
  en: {
    "nav.home": "Home",
    "nav.network": "Network",
    "nav.wallet": "Wallet",
    "nav.profile": "Profile",
    "nav.transactions": "Transactions",
    "nav.withdraw": "Withdraw",
    "nav.admin": "Admin",
    "shell.member": "Member",
    "shell.active": "Active",
    "shell.pending": "Pending activation",
    "shell.signOut": "Sign out",
    "shell.theme.dark": "Dark mode",
    "shell.theme.light": "Light mode",
    "shell.language": "Language",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.network": "Réseau",
    "nav.wallet": "Portefeuille",
    "nav.profile": "Profil",
    "nav.transactions": "Transactions",
    "nav.withdraw": "Retrait",
    "nav.admin": "Admin",
    "shell.member": "Membre",
    "shell.active": "Actif",
    "shell.pending": "Activation en attente",
    "shell.signOut": "Déconnexion",
    "shell.theme.dark": "Mode sombre",
    "shell.theme.light": "Mode clair",
    "shell.language": "Langue",
  },
} as const;

export type TKey = keyof (typeof DICT)["en"];

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => DICT.en[k],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Lang | null;
    if (stored === "en" || stored === "fr") {
      setLangState(stored);
      return;
    }
    if (navigator.language?.toLowerCase().startsWith("fr")) setLangState("fr");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(KEY, l);
    setLangState(l);
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, t: (k: TKey) => DICT[lang][k] ?? DICT.en[k] }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
