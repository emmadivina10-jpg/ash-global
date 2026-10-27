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
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </Button>
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((entry) => entry.code === lang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={t("shell.language")}
          title={t("shell.language")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted",
            className,
          )}
        >
          <Globe className="size-3.5 text-muted-foreground" aria-hidden />
          {current?.label ?? "EN"}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="max-h-80 w-48 overflow-y-auto">
        {LANGUAGES.map((entry) => (
          <DropdownMenuItem
            key={entry.code}
            onSelect={() => setLang(entry.code)}
            className="flex items-center justify-between gap-2"
          >
            <span className="min-w-0 truncate">{entry.native}</span>
            {entry.code === lang ? (
              <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
            ) : (
              <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
                {entry.label}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
