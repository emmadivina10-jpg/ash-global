import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Store, Plane, Wallet } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/ash-logo.png.asset.json";
import community from "@/assets/welcome-texting.jpg";
import discover from "@/assets/welcome-shopping.jpg";
import travel from "@/assets/welcome-travel.jpg";
import money from "@/assets/welcome-money.jpg";

const SLIDES = [
  {
    image: community,
    altEn: "Illustration of a man and woman texting",
    altFr: "Illustration d’un homme et d’une femme échangeant des messages",
    kickerEn: "A little closer. A lot more connected.",
    kickerFr: "Plus proches. Toujours connectés.",
    titleEn: ["Your world,", "closer."],
    titleFr: ["Votre monde,", "plus proche."],
    bodyEn: "Chat with friends and family, send voice messages, and share your moments through Feed, Stories and Spotlights.",
    bodyFr: "Discutez avec vos proches, envoyez des messages vocaux et partagez vos moments dans le Fil, les Stories et les Spotlights.",
    labelEn: "People & moments",
    labelFr: "Liens et moments",
    Icon: MessageCircle,
  },
  {
    image: discover,
    altEn: "Illustration of a shopper receiving a delivery",
    altFr: "Illustration d’une cliente recevant une livraison",
    kickerEn: "Discover something worth connecting for.",
    kickerFr: "Des découvertes qui créent des liens.",
    titleEn: ["More to find.", "More to love."],
    titleFr: ["Découvrez.", "Rencontrez."],
    bodyEn: "Explore Market, chat with sellers and book services. Keep your booking in view with Compass and optional location sharing.",
    bodyFr: "Explorez le Marché, échangez avec les vendeurs et réservez des services. Suivez votre réservation avec Compass et le partage de position facultatif.",
    labelEn: "Market & services",
    labelFr: "Marché et services",
    Icon: Store,
  },
  {
    image: travel,
    altEn: "Illustration of a traveler and a flying airplane",
    altFr: "Illustration d’une voyageuse et d’un avion en vol",
    kickerEn: "A new horizon for ASH.",
    kickerFr: "Un nouvel horizon pour ASH.",
    titleEn: ["Your next", "adventure."],
    titleFr: ["Votre prochaine", "aventure."],
    bodyEn: "A place for your next journey. Flights is coming soon — flight search and booking are not available yet.",
    bodyFr: "Un espace pour votre prochain voyage. Vols arrive bientôt : la recherche et la réservation ne sont pas encore disponibles.",
    labelEn: "Flights · Coming soon",
    labelFr: "Vols · Bientôt",
    Icon: Plane,
  },
  {
    image: money,
    altEn: "Illustration of a digital wallet, phone and card",
    altFr: "Illustration d’un portefeuille numérique, d’un téléphone et d’une carte",
    kickerEn: "Your activity, in one place.",
    kickerFr: "Votre activité, au même endroit.",
    titleEn: ["Your wallet.", "Your way."],
    titleFr: ["Votre argent.", "Votre espace."],
    bodyEn: "View balances and eligible withdrawals. Mobile payments use MTN or Orange Money via TchokoPay where supported. Card and bank — coming soon.",
    bodyFr: "Consultez vos soldes et les retraits admissibles. Paiements mobiles : MTN ou Orange Money via TchokoPay selon disponibilité. Carte et banque — bientôt.",
    labelEn: "Wallet & payments",
    labelFr: "Portefeuille et paiements",
    Icon: Wallet,
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
  const reducedMotion = useReducedMotion();
  const transition = { duration: reducedMotion ? 0 : 0.35, ease: "easeOut" as const };

  return (
    <div className="ash-entry mobile-welcome">
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs><clipPath id="welcome-bent-edge" clipPathUnits="objectBoundingBox"><path d="M0 0 H1 V.84 C.72 .78 .32 1 .0 .94 Z" /></clipPath></defs>
      </svg>
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
        <div className="mobile-welcome-artwork">
          <AnimatePresence mode="wait" initial={false}>
            <motion.img key={slide.image} src={slide.image} alt={tx(slide.altEn, slide.altFr)} width={1024} height={1024} className="mobile-welcome-photo" draggable={false}
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.03 }} transition={transition} />
          </AnimatePresence>
        </div>
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
          <span className="mobile-welcome-count">0{step + 1} / 0{SLIDES.length}</span>
        </div>
      </section>

      <main className="mobile-welcome-content">
        <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} className="mobile-welcome-copy" aria-live="polite" aria-atomic="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
          <p className="mobile-welcome-kicker">{tx(slide.kickerEn, slide.kickerFr)}</p>
          <h2>
            {tx(slide.titleEn[0], slide.titleFr[0])}
            <span>{tx(slide.titleEn[1], slide.titleFr[1])}</span>
          </h2>
          <p className="mobile-welcome-description">{tx(slide.bodyEn, slide.bodyFr)}</p>
        </motion.div>
        </AnimatePresence>
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
            <Button className="mobile-welcome-primary" onClick={() => setStep(Math.min(SLIDES.length - 1, step + 1))}>
              {step === 0 ? tx("Discover ASH", "Découvrir ASH") : tx("Continue", "Continuer")}
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
