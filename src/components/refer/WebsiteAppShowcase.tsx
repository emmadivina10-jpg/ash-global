import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import feed from "@/assets/welcome-app-feed.png.asset.json";
import messages from "@/assets/welcome-app-messages.png.asset.json";
import flights from "@/assets/welcome-app-flights.png.asset.json";
import "./website-app-showcase.css";

const SCREENS = [
  { images: [feed], en: "Share your moments", fr: "Partagez vos moments", alts: ["ASH Feed app screenshot"] },
  { images: [messages, flights], en: "Stay close. Go further.", fr: "Restez proches. Allez plus loin.", alts: ["ASH Messages app screenshot", "ASH Flights app screenshot — coming soon"] },
  { images: [messages], en: "Chat with friends and family", fr: "Discutez avec vos amis et votre famille", alts: ["ASH Messages app screenshot"] },
  { images: [flights], en: "Travel with ASH · coming soon", fr: "Voyagez avec ASH · bientôt", alts: ["ASH Flights app screenshot — coming soon"] },
];

export function WebsiteAppShowcase() {
  const { tx } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || reduced || hovered) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % SCREENS.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, reduced, hovered]);
  const active = SCREENS[index];
  if (!active) return null;

  return (
    <section aria-label={tx("Inside the ASH app", "Dans l’application ASH")} aria-roledescription="carousel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setHovered(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}>
      <div className="website-app-stage">
        {SCREENS.map((screen, slideIndex) => (
          <div key={screen.en} className={`website-app-scene ${slideIndex === index ? "is-active" : ""} ${screen.images.length > 1 ? "is-paired" : ""}`} aria-hidden={slideIndex !== index}>
            {screen.images.map((image, imageIndex) => <img key={image.asset_id} src={image.url} alt={screen.alts[imageIndex] ?? "ASH app screenshot"} className="website-app-image" loading="eager" />)}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-5 flex max-w-3xl items-center justify-between gap-4 border-t border-border pt-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{tx("Inside ASH", "Dans ASH")} · {String(index + 1).padStart(2, "0")} / 04</p>
          <p className="mt-1 text-sm font-semibold text-foreground" aria-live={paused ? "polite" : "off"}>{tx(active.en, active.fr)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" title={tx("Previous screen", "Écran précédent")} aria-label={tx("Previous screen", "Écran précédent")} onClick={() => setIndex((value) => (value + SCREENS.length - 1) % SCREENS.length)}><ChevronLeft className="size-4" /></Button>
          <Button variant="ghost" size="icon" title={tx(paused || reduced ? "Play slideshow" : "Pause slideshow", paused || reduced ? "Lancer le diaporama" : "Mettre en pause")} aria-label={tx(paused || reduced ? "Play slideshow" : "Pause slideshow", paused || reduced ? "Lancer le diaporama" : "Mettre en pause")} onClick={() => { setPaused(!(paused || reduced)); setReduced(false); }}>{paused || reduced ? <Play className="size-4" /> : <Pause className="size-4" />}</Button>
          <Button variant="ghost" size="icon" title={tx("Next screen", "Écran suivant")} aria-label={tx("Next screen", "Écran suivant")} onClick={() => setIndex((value) => (value + 1) % SCREENS.length)}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
    </section>
  );
}