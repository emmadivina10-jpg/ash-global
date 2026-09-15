import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, X } from "lucide-react";
import { useLocation } from "@/lib/location";
import { useI18n } from "@/lib/i18n";

const SNOOZE_KEY = "ash.location.nudge";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Gentle, occasional reminder to save a location in Settings. It only appears
 * when nothing is saved yet and stays away for three days after a dismissal.
 */
export function LocationNudge() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { location } = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (location) return;
    const last = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (Date.now() - last < SNOOZE_MS) return;
    const timer = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(timer);
  }, [location]);

  if (!show || location) return null;

  function dismiss() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setShow(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-24 z-30 lg:bottom-6 lg:left-auto lg:right-6 lg:w-80">
      <div className="ash-glass flex items-start gap-3 rounded-2xl border border-border p-3 shadow-[var(--shadow-card)]">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <MapPin className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {fr ? "Ajoutez votre position" : "Add your location"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fr
              ? "Voyez d'abord ce qui se passe près de vous."
              : "See what's happening near you first."}
          </p>
          <Link
            to="/settings"
            onClick={dismiss}
            className="mt-2 inline-block text-xs font-bold text-primary underline-offset-4 hover:underline"
          >
            {fr ? "Ouvrir les paramètres" : "Open settings"}
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={fr ? "Fermer" : "Dismiss"}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
