import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/ash-logo.png.asset.json";
import community from "@/assets/welcome-community.jpg";
import discover from "@/assets/welcome-discover.jpg";

const SLIDES = [
  {
    image: community,
    altEn: "Friends sharing a moment at a café",
    altFr: "Des amis partagent un moment dans un café",
    kickerEn: "A little closer. A lot more connected.",
    kickerFr: "Plus proches. Toujours connectés.",
    titleEn: ["Your world,", "closer."],
    titleFr: ["Votre monde,", "plus proche."],
    bodyEn: "Your people. Your moments. Your next discovery. Find them together on ASH.",
    bodyFr: "Vos proches. Vos moments. Votre prochaine découverte. Retrouvez-les sur ASH.",
    labelEn: "People & moments",
    labelFr: "Liens et moments",
    Icon: MessageCircle,
  },
  {
    image: discover,
    altEn: "A florist and customer sharing a bouquet",
    altFr: "Une fleuriste remet un bouquet à une cliente",
    kickerEn: "Discover something worth connecting for.",
    kickerFr: "Des découvertes qui créent des liens.",
    titleEn: ["More to find.", "More to love."],
    titleFr: ["Découvrez.", "Rencontrez."],
    bodyEn:
      "Find products and book services. Pay with eligible MTN or Orange Money via TchokoPay. Card and bank — coming soon.",
    bodyFr:
      "Trouvez des produits et réservez des services. Payez avec MTN ou Orange Money via TchokoPay selon disponibilité. Carte et banque — bientôt.",
    labelEn: "Market & services",
    labelFr: "Marché et services",
    Icon: Store,
  },
] as const;

/** Phone welcome only; entry routing, sign-in and payment rails remain unchanged. */
export function MobileOnboarding() {
  const { tx } = useI18n();
  const [step, setStep] = useState(0);
  const touchStart = useRef<number | null>(null);
  const slide = SLIDES[step] ?? SLIDES[0];
  const last = step === SLIDES.length - 1;
  const Icon = slide.Icon;

  return (
    <div className="ash-entry mobile-welcome">
      <section
        className="mobile-welcome-visual"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const end = event.changedTouches[0]?.clientX;
          if (touchStart.current !== null && end !== undefined) {
            const delta = end - touchStart.current;
            if (delta < -55) setStep(Math.min(SLIDES.length - 1, step + 1));
            if (delta > 55) setStep(Math.max(0, step - 1));
          }
          touchStart.current = null;
        }}
      >
        <img
          key={slide.image}
          src={slide.image}
          alt={tx(slide.altEn, slide.altFr)}
          width={1024}
          height={1280}
          className="mobile-welcome-photo"
          draggable={false}
        />
        <header className="mobile-welcome-header">
          <div className="mobile-welcome-brand">
            <img src={logo.url} alt="" width={40} height={40} />
            <div>
              <h1>ASH Glo</h1>
              <p>Global Technologies</p>
            </div>
          </div>
          {!last && (
            <Button
              variant="ghost"
              className="mobile-welcome-skip"
              onClick={() => setStep(SLIDES.length - 1)}
            >
              {tx("Skip", "Passer")}
            </Button>
          )}
        </header>
        <div className="mobile-welcome-caption">
          <Icon className="size-4" />
          <span>{tx(slide.labelEn, slide.labelFr)}</span>
          <span className="mobile-welcome-count">0{step + 1} / 02</span>
        </div>
      </section>

      <main className="mobile-welcome-content">
        <div key={step} className="mobile-welcome-copy" aria-live="polite" aria-atomic="true">
          <p className="mobile-welcome-kicker">{tx(slide.kickerEn, slide.kickerFr)}</p>
          <h2>
            {tx(slide.titleEn[0], slide.titleFr[0])}
            <span>{tx(slide.titleEn[1], slide.titleFr[1])}</span>
          </h2>
          <p className="mobile-welcome-description">{tx(slide.bodyEn, slide.bodyFr)}</p>
        </div>
        <footer className="mobile-welcome-footer">
          <div
            className="mobile-welcome-progress"
            role="group"
            aria-label={tx("Welcome screens", "Écrans de bienvenue")}
          >
            {SLIDES.map((item, index) => (
              <Button
                key={item.image}
                variant="ghost"
                size="icon"
                className="mobile-welcome-dot"
                aria-label={tx(`Welcome screen ${index + 1}`, `Écran de bienvenue ${index + 1}`)}
                aria-pressed={step === index}
                onClick={() => setStep(index)}
              >
                <span />
              </Button>
            ))}
          </div>
          {last ? (
            <Button asChild className="mobile-welcome-primary">
              <Link to="/register">
                {tx("Join ASH", "Rejoindre ASH")}
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <Button className="mobile-welcome-primary" onClick={() => setStep(1)}>
              {tx("Discover ASH", "Découvrir ASH")}
              <ArrowRight />
            </Button>
          )}
          <p className="mobile-welcome-login">
            {tx("Already part of ASH?", "Déjà sur ASH ?")}{" "}
            <Button asChild variant="link">
              <Link to="/login">{tx("Log in", "Se connecter")}</Link>
            </Button>
          </p>
        </footer>
      </main>
    </div>
  );
}
