import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const KEY = "refer.theme";

/** Dark is the default until the member picks light. */
const DEFAULT_THEME: Theme = "dark";

/** Runs before hydration so the first paint already uses the saved (or default) theme. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");document.documentElement.classList.toggle("dark",t!=="light")}catch(e){document.documentElement.classList.add("dark")}`;

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      setTheme(stored === "light" || stored === "dark" ? stored : DEFAULT_THEME);
    } catch {
      setTheme(DEFAULT_THEME);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* The switch still works for this session without storage. */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
