import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import feedPhone from "@/assets/welcome-phone-feed.png";
import messagesPhone from "@/assets/welcome-phone-messages.png";
import flightsPhone from "@/assets/welcome-phone-flights.png";
import "./website-app-showcase.css";

const SCREENS = [
  {
    images: [{ src: feedPhone, alt: "ASH Feed app screenshot" }],
    kickerEn: "Inside ASH",
    kickerFr: "Dans ASH",
    en: "Share your moments",
    fr: "Partagez vos moments",
    bodyEn: "Post photos, updates and stories with friends and your community.",
    bodyFr: "Publiez des photos, des nouveautés et des stories avec vos amis et votre communauté.",
  },
  {
    images: [
      { src: messagesPhone, alt: "ASH Messages app screenshot" },
      { src: flightsPhone, alt: "ASH Flights app screenshot — coming soon" },
    ],
    kickerEn: "Inside ASH",
    kickerFr: "Dans ASH",
    en: "Stay close. Go further.",
    fr: "Restez proches. Allez plus loin.",
    bodyEn: "Message friends and family instantly — with travel on the way.",
    bodyFr: "Messagez vos proches instantanément — avec les voyages à venir.",
  },
  {
    images: [{ src: messagesPhone, alt: "ASH Messages app screenshot" }],
    kickerEn: "Inside ASH",
    kickerFr: "Dans ASH",
    en: "Chat with friends and family",
    fr: "Discutez avec vos amis et votre famille",
    bodyEn: "Send messages and quick replies and keep every chat in one place.",
    bodyFr:
      "Envoyez des messages et des réponses rapides, et gardez chaque discussion au même endroit.",
  },
  {
    images: [{ src: flightsPhone, alt: "ASH Flights app screenshot — coming soon" }],
    kickerEn: "Inside ASH",
    kickerFr: "Dans ASH",
    en: "Travel with ASH · coming soon",
    fr: "Voyagez avec ASH · bientôt",
    bodyEn: "Flight search and booking are coming to ASH.",
    bodyFr: "La recherche et la réservation de vols arrivent sur ASH.",
  },
] as const;

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
    <section
      aria-label={tx("Inside the ASH app", "Dans l’application ASH")}
      aria-roledescription="carousel"
      className="website-app-showcase"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false);
      }}
    >
      <div className="website-app-stage">
        {SCREENS.map((screen, slideIndex) => (
          <div
            key={screen.en}
            className={`website-app-scene ${slideIndex === index ? "is-active" : ""} ${screen.images.length > 1 ? "is-paired" : ""}`}
            aria-hidden={slideIndex !== index}
          >
            {screen.images.map((image) => (
              <img
                key={image.alt}
                src={image.src}
                alt={image.alt}
                className="website-app-image"
                loading="eager"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="website-app-copy">
        <p className="text-xs font-semibold text-muted-foreground">
          {tx(active.kickerEn, active.kickerFr)} · {String(index + 1).padStart(2, "0")} / 04
        </p>
        <h2
          className="website-app-headline font-display text-3xl font-extrabold leading-tight lg:text-4xl"
          aria-live={paused ? "polite" : "off"}
        >
          {tx(active.en, active.fr)}
        </h2>
        <div className="my-6 h-px w-16 gold-gradient" aria-hidden />
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {tx(active.bodyEn, active.bodyFr)}
        </p>
        <div
          className="mt-8 flex items-center gap-2"
          aria-label={`${index + 1} / ${SCREENS.length}`}
        >
          {SCREENS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={String(i + 1)}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? "w-10 gold-gradient" : "w-3 bg-border"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={tx("Previous screen", "Écran précédent")}
            aria-label={tx("Previous screen", "Écran précédent")}
            onClick={() => setIndex((value) => (value + SCREENS.length - 1) % SCREENS.length)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={tx(
              paused || reduced ? "Play slideshow" : "Pause slideshow",
              paused || reduced ? "Lancer le diaporama" : "Mettre en pause",
            )}
            aria-label={tx(
              paused || reduced ? "Play slideshow" : "Pause slideshow",
              paused || reduced ? "Lancer le diaporama" : "Mettre en pause",
            )}
            onClick={() => {
              setPaused(!(paused || reduced));
              setReduced(false);
            }}
          >
            {paused || reduced ? <Play className="size-4" /> : <Pause className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={tx("Next screen", "Écran suivant")}
            aria-label={tx("Next screen", "Écran suivant")}
            onClick={() => setIndex((value) => (value + 1) % SCREENS.length)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
