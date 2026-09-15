import { Check, Globe, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/i18n.locales";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const label = theme === "dark" ? t("shell.theme.light") : t("shell.theme.dark");

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className={className}
    >
      {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </Button>
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("shell.language")}
      className={cn("inline-flex items-center rounded-full border border-border p-0.5", className)}
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
            lang === l.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
