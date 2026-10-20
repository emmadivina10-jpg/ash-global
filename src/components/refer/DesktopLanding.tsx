import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUpRight,
  Users,
  MessageCircle,
  Store,
  BriefcaseBusiness,
  Camera,
  Compass,
  Network,
  Wallet,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Expand,
  ShieldCheck,
  Smartphone,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LanguageSwitcher, ThemeToggle } from "@/components/refer/Preferences";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/ash-logo.png.asset.json";
import feed from "@/assets/landing/feed.png.asset.json";
import market from "@/assets/landing/market.png.asset.json";
import track from "@/assets/landing/track.png.asset.json";
import chat from "@/assets/landing/chat.png.asset.json";
import friends from "@/assets/landing/friends.png.asset.json";
import wallet from "@/assets/landing/wallet.png.asset.json";
import referral from "@/assets/landing/referral.png.asset.json";
import join from "@/assets/landing/join.png.asset.json";

const screens = [
  {
    asset: feed,
    name: "Feed",
    fr: "Fil",
    title: "A world worth sharing.",
    titleFr: "Un monde à partager.",
    body: "Moments, Stories and Spotlights. Stay close to the people and businesses that make your world yours.",
    bodyFr:
      "Moments, Stories et Spotlights. Restez proche des personnes et des entreprises qui font partie de votre monde.",
  },
  {
    asset: market,
    name: "Market",
    fr: "Marché",
    title: "Discover. Connect. Trade.",
    titleFr: "Découvrez. Échangez. Achetez.",
    body: "Explore the marketplace, meet providers and keep the conversation connected to your booking.",
    bodyFr:
      "Explorez le marché, rencontrez des prestataires et gardez votre conversation liée à votre réservation.",
  },
  {
    asset: track,
    name: "Compass",
    fr: "Compass",
    title: "Stay connected along the way.",
    titleFr: "Restez connecté à chaque étape.",
    body: "Follow your booking and access Map and Wallet together through ASH Compass. Location sharing is optional.",
    bodyFr:
      "Suivez votre réservation et retrouvez Carte et Portefeuille dans ASH Compass. Le partage de position est facultatif.",
  },
  {
    asset: chat,
    name: "Messages",
    fr: "Messages",
    title: "Make it a conversation.",
    titleFr: "Tout commence par un échange.",
    body: "Friends, family and marketplace conversations, with text and voice messages in one place.",
    bodyFr:
      "Amis, famille et conversations du marché, avec messages écrits et vocaux au même endroit.",
  },
  {
    asset: friends,
    name: "Friends",
    fr: "Amis",
    title: "Your people, closer.",
    titleFr: "Vos proches, plus près.",
    body: "Find connections, add friends and build your community on ASH.",
    bodyFr: "Faites des rencontres, ajoutez des amis et développez votre communauté sur ASH.",
  },
  {
    asset: wallet,
    name: "Wallet",
    fr: "Portefeuille",
    title: "Your wallet. A clearer view.",
    titleFr: "Votre portefeuille, en toute clarté.",
    body: "View your balances and eligible withdrawal options. Mobile card and bank features are coming soon.",
    bodyFr:
      "Consultez vos soldes et les retraits disponibles. Carte et banque sur mobile : bientôt disponibles.",
  },
  {
    asset: referral,
    name: "Referrals",
    fr: "Parrainage",
    title: "Connections that go further.",
    titleFr: "Des liens qui vont plus loin.",
    body: "See your referral network across L1, L2 and L3. Referral earnings are available only to eligible members in Cameroon and Nigeria.",
    bodyFr:
      "Retrouvez votre réseau de parrainage L1, L2 et L3. Les gains sont réservés aux membres éligibles au Cameroun et au Nigeria.",
  },
  {
    asset: join,
    name: "Your moments",
    fr: "Vos moments",
    title: "A place for your perspective.",
    titleFr: "Une place pour votre regard.",
    body: "Share what matters to you and be part of the everyday conversation.",
    bodyFr: "Partagez ce qui compte pour vous et prenez part aux échanges du quotidien.",
  },
] as const;

export function DesktopLanding() {
  const { tx } = useI18n();
  const [selected, setSelected] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const active = screens[selected] ?? screens[0];
  const move = (direction: number) =>
    setSelected((index) => (index + direction + screens.length) % screens.length);

  return (
    <div className="desktop-landing">
      <header className="landing-header landing-width">
        <Link to="/" className="landing-brand" aria-label="ASH Global Technologies">
          <img src={logo.url} alt="" width="44" height="44" />
          <span>
            <strong>ASH Glo</strong>
            <small>Global Technologies</small>
          </span>
        </Link>
        <nav
          className="landing-desktop-nav"
          aria-label={tx("Main navigation", "Navigation principale")}
        >
          <Link to="/" className="landing-nav-link">
            {tx("Home", "Accueil")}
          </Link>
          <Link to="/login" search={{ next: "/feed" }} className="landing-nav-link">
            {tx("Discover", "Découvrir")}
          </Link>
          <Link to="/login" search={{ next: "/services" }} className="landing-nav-link">
            {tx("Marketplace", "Marché")}
          </Link>
          <Link to="/login" search={{ next: "/services" }} className="landing-nav-link">
            {tx("Services", "Services")}
          </Link>
          <Link to="/contact" className="landing-nav-link">
            {tx("Contact", "Contact")}
          </Link>
        </nav>
        <div className="landing-header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild variant="ghost" className="landing-signin">
            <Link to="/login">{tx("Log In", "Connexion")}</Link>
          </Button>
          <Button asChild className="landing-header-join">
            <Link to="/register">
              {tx("Join ASH", "Rejoindre ASH")}
              <ArrowUpRight />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="landing-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={tx("Navigation menu", "Menu de navigation")}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen && (
          <nav
            id="landing-mobile-menu"
            className="landing-mobile-menu"
            aria-label={tx("Navigation", "Navigation")}
          >
            <Link to="/login" search={{ next: "/feed" }}>
              {tx("Discover", "Découvrir")}
            </Link>
            <Link to="/login" search={{ next: "/services" }}>
              {tx("Marketplace & Services", "Marché et services")}
            </Link>
            <Link to="/contact">{tx("Contact", "Contact")}</Link>
            <Link to="/login">{tx("Log In", "Connexion")}</Link>
          </nav>
        )}
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <span className="landing-watermark" aria-hidden>
            ASH
          </span>
          <div className="landing-width landing-hero-copy">
            <p className="landing-kicker">
              <span />
              {tx("CONNECT. CREATE. DISCOVER.", "CONNECTEZ. CRÉEZ. DÉCOUVREZ.")}
            </p>
            <h1 id="landing-title">
              ASH Global Technologies<span className="landing-period">.</span>
            </h1>
            <p className="landing-intro">
              {tx(
                "Your world. Your people. Your opportunities.",
                "Votre monde. Vos proches. Vos opportunités.",
              )}
            </p>
            <p className="landing-description">
              {tx(
                "Share your moments, connect with people, discover businesses and explore new opportunities. Your digital community, brought together on ASH Glo.",
                "Partagez vos moments, échangez avec vos proches, découvrez des entreprises et de nouvelles opportunités. Votre communauté numérique, réunie sur ASH Glo.",
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-7">
              <Button asChild size="lg" className="landing-primary">
                <Link to="/register">
                  {tx("Join ASH", "Rejoindre ASH")}
                  <ArrowUpRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="landing-secondary">
                <a href="#experience">
                  {tx("Explore ASH", "Découvrir ASH")}
                  <ArrowDown />
                </a>
              </Button>
            </div>
            <p className="landing-supporting">
              {tx(
                "One platform. More connections. More possibilities.",
                "Une plateforme. Plus de liens. Plus de possibilités.",
              )}
            </p>
          </div>
          <div
            className="landing-panorama"
            aria-label={tx("ASH app previews", "Aperçus de l’application ASH")}
          >
            {[screens[3], screens[0], screens[1]].map((screen, index) => (
              <a
                href="#experience"
                key={screen.name}
                className={`landing-preview landing-preview-${index}`}
                onClick={() => setSelected(screens.indexOf(screen))}
              >
                <img
                  src={screen.asset.url}
                  alt={tx(`${screen.name} on ASH`, `${screen.fr} sur ASH`)}
                  fetchPriority={index === 1 ? "high" : "auto"}
                />
              </a>
            ))}
          </div>
          <a href="#experience" className="landing-scroll">
            <ArrowDown className="size-4" />
            {tx("Explore the ASH experience", "Découvrez l’expérience ASH")}
          </a>
        </section>

        <div className="landing-benefits landing-width">
          {[
            [Users, "Connect with People", "Connectez-vous"],
            [Camera, "Share Your Moments", "Partagez vos moments"],
            [Store, "Discover Products & Services", "Découvrez produits et services"],
            [Compass, "Explore Opportunities", "Explorez les opportunités"],
          ].map(([Icon, en, fr]) => {
            const BenefitIcon = Icon as typeof Users;
            return (
              <div key={String(en)}>
                <BenefitIcon aria-hidden />
                <span>{tx(String(en), String(fr))}</span>
              </div>
            );
          })}
        </div>
        <section className="landing-ecosystem landing-width">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker">
                {tx("YOUR DIGITAL COMMUNITY", "VOTRE COMMUNAUTÉ NUMÉRIQUE")}
              </p>
              <h2>
                {tx("More ways to connect on ASH.", "Plus de façons de se connecter sur ASH.")}
              </h2>
            </div>
            <p>
              {tx(
                "Conversations. Moments. New discoveries.",
                "Conversations. Moments. Découvertes.",
              )}
            </p>
          </div>
          <div className="landing-feature-grid">
            {[
              {
                icon: Camera,
                title: "Share Your World",
                fr: "Partagez votre monde",
                body: "Share updates, photos, videos and moments with your community.",
                bodyFr: "Partagez des nouvelles, photos, vidéos et moments avec votre communauté.",
                cta: "Explore the Feed",
                ctaFr: "Découvrir le Fil",
                to: "/feed" as const,
              },
              {
                icon: MessageCircle,
                title: "Stay Connected",
                fr: "Restez connecté",
                body: "Connect with friends and keep your conversations close.",
                bodyFr: "Échangez avec vos amis et gardez vos conversations à portée de main.",
                cta: "Start Connecting",
                ctaFr: "Commencer à échanger",
                to: "/messages" as const,
              },
              {
                icon: Store,
                title: "Buy & Sell",
                fr: "Achetez et vendez",
                body: "Explore marketplace listings and connect directly with sellers.",
                bodyFr:
                  "Explorez les annonces du marché et échangez directement avec les vendeurs.",
                cta: "Explore Marketplace",
                ctaFr: "Découvrir le Marché",
                to: "/services" as const,
              },
              {
                icon: BriefcaseBusiness,
                title: "Find Services",
                fr: "Trouvez des services",
                body: "Discover providers and explore available booking options.",
                bodyFr: "Découvrez des prestataires et les réservations disponibles.",
                cta: "Explore Services",
                ctaFr: "Découvrir les services",
                to: "/services" as const,
              },
            ].map((item) => (
              <article className="landing-feature" key={item.title}>
                <item.icon aria-hidden />
                <h3>{tx(item.title, item.fr)}</h3>
                <p>{tx(item.body, item.bodyFr)}</p>
                <Button asChild variant="link">
                  <Link to="/login" search={{ next: item.to }}>
                    {tx(item.cta, item.ctaFr)}
                    <ArrowUpRight />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </section>
        <section id="experience" className="landing-experience landing-width">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker">{tx("THE ASH EXPERIENCE", "L’EXPÉRIENCE ASH")}</p>
              <h2>{tx("Life, more connected.", "La vie, plus connectée.")}</h2>
            </div>
            <p>
              {tx(
                "Your everyday world, brought together.",
                "Votre univers quotidien, enfin réuni.",
              )}
            </p>
          </div>
          <div
            className="landing-tabs"
            role="tablist"
            aria-label={tx("Explore ASH", "Découvrir ASH")}
          >
            {screens.map((screen, index) => (
              <Button
                variant="ghost"
                role="tab"
                aria-selected={index === selected}
                aria-controls="ash-screen-panel"
                id={`ash-screen-tab-${index}`}
                key={screen.name}
                className="landing-tab"
                onClick={() => setSelected(index)}
              >
                {tx(screen.name, screen.fr)}
              </Button>
            ))}
          </div>
          <div
            className="landing-gallery"
            role="tabpanel"
            id="ash-screen-panel"
            aria-labelledby={`ash-screen-tab-${selected}`}
          >
            <div className="landing-gallery-image">
              <img
                key={active.asset.url}
                src={active.asset.url}
                alt={tx(
                  `${active.name} on ASH — supplied app screenshot`,
                  `${active.fr} sur ASH — capture de l’application`,
                )}
                loading="lazy"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setImageOpen(true)}
                className="landing-expand"
                aria-label={tx("Enlarge screenshot", "Agrandir la capture")}
                title={tx("Enlarge screenshot", "Agrandir la capture")}
              >
                <Expand />
              </Button>
            </div>
            <div className="landing-gallery-copy">
              <span className="landing-counter">
                0{selected + 1} <span>/ 08</span>
              </span>
              <h3>{tx(active.title, active.titleFr)}</h3>
              <p>{tx(active.body, active.bodyFr)}</p>
              <Button asChild variant="link" className="landing-text-link">
                <Link to="/register">
                  {tx("Discover ASH", "Découvrir ASH")}
                  <ArrowUpRight />
                </Link>
              </Button>
              <div className="flex items-center gap-3 mt-10">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={tx("Previous screenshot", "Capture précédente")}
                  onClick={() => move(-1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={tx("Next screenshot", "Capture suivante")}
                  onClick={() => move(1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-steps-band">
          <div className="landing-width">
            <p className="landing-kicker">{tx("HOW ASH WORKS", "COMMENT FONCTIONNE ASH")}</p>
            <h2>{tx("It starts with a connection.", "Tout commence par un lien.")}</h2>
            <div className="landing-steps">
              {(
                [
                  [
                    "01",
                    "Join the Community",
                    "Rejoignez la communauté",
                    "Create your account and start building connections.",
                    "Créez votre compte et commencez à tisser des liens.",
                  ],
                  [
                    "02",
                    "Explore and Engage",
                    "Explorez et échangez",
                    "Share content, discover people and explore products and services.",
                    "Partagez du contenu, faites des rencontres et explorez produits et services.",
                  ],
                  [
                    "03",
                    "Discover More Opportunities",
                    "Découvrez les opportunités",
                    "Connect with businesses, book services and explore eligible referral opportunities.",
                    "Échangez avec des entreprises, réservez des services et explorez le parrainage selon votre éligibilité.",
                  ],
                ] as const
              ).map(([number, title, fr, body, bodyFr]) => (
                <div key={number}>
                  <span>{number}</span>
                  <h3>{tx(title, fr)}</h3>
                  <p>{tx(body, bodyFr)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="landing-commerce landing-width">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker">
                {tx("PEOPLE MEET POSSIBILITIES", "DES RENCONTRES, DES POSSIBILITÉS")}
              </p>
              <h2>{tx("Discover more than social.", "Découvrez plus qu’un réseau social.")}</h2>
            </div>
            <p>
              {tx(
                "Meet sellers. Find providers. Stay connected.",
                "Rencontrez des vendeurs et prestataires. Restez connecté.",
              )}
            </p>
          </div>
          <div className="landing-commerce-grid">
            {[
              {
                asset: market,
                title: "Marketplace discovery",
                fr: "Découvrez le Marché",
                body: "Explore listings and connect with sellers in one place.",
                bodyFr: "Explorez les annonces et échangez avec les vendeurs au même endroit.",
              },
              {
                asset: track,
                title: "Services, connected",
                fr: "Des services connectés",
                body: "Discover providers, book services and follow your booking through Compass.",
                bodyFr:
                  "Découvrez des prestataires, réservez et suivez votre réservation avec Compass.",
              },
            ].map((item) => (
              <article key={item.title}>
                <img src={item.asset.url} alt={tx(item.title, item.fr)} loading="lazy" />
                <div>
                  <h3>{tx(item.title, item.fr)}</h3>
                  <p>{tx(item.body, item.bodyFr)}</p>
                  <Button asChild variant="link">
                    <Link to="/login" search={{ next: "/services" }}>
                      {tx("Discover more", "En savoir plus")}
                      <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-opportunities landing-width">
          <div className="landing-opportunity">
            <Network aria-hidden />
            <p className="landing-kicker">{tx("REFERRALS", "PARRAINAGE")}</p>
            <h2>
              {tx(
                "Grow your network. Explore rewards.",
                "Développez votre réseau. Explorez les récompenses.",
              )}
            </h2>
            <p>
              {tx(
                "Invite people to join ASH and explore available referral opportunities. Earnings are limited to eligible members in Cameroon and Nigeria; rewards are not guaranteed.",
                "Invitez vos proches sur ASH et découvrez le parrainage. Les gains sont réservés aux membres éligibles au Cameroun et au Nigeria ; les récompenses ne sont pas garanties.",
              )}
            </p>
            <Button asChild variant="link">
              <Link to="/login" search={{ next: "/network" }}>
                {tx("Discover Referrals", "Découvrir le parrainage")}
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <div className="landing-opportunity">
            <Wallet aria-hidden />
            <p className="landing-kicker">{tx("WALLET", "PORTEFEUILLE")}</p>
            <h2>{tx("Your activity, more accessible.", "Votre activité, plus accessible.")}</h2>
            <p>
              {tx(
                "Review your platform activity, balances and eligible wallet options. Available actions depend on your country, currency and account. Card and bank on mobile are coming soon.",
                "Consultez votre activité, vos soldes et les options disponibles selon votre pays, devise et compte. Carte et banque sur mobile : bientôt disponibles.",
              )}
            </p>
            <Button asChild variant="link">
              <Link to="/login" search={{ next: "/wallet" }}>
                {tx("Explore Wallet", "Découvrir le portefeuille")}
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </section>
        <section className="landing-payments">
          <div className="landing-width landing-payment-layout">
            <div>
              <ShieldCheck className="size-7 mb-5 text-chat-emerald" />
              <p className="landing-kicker">{tx("PAYMENTS ON ASH", "PAIEMENTS SUR ASH")}</p>
              <h2>{tx("Clarity at every step.", "La clarté à chaque étape.")}</h2>
              <p className="landing-payment-description">
                {tx(
                  "Available methods are shown at checkout, based on your country and eligibility. ASH never asks for your Mobile Money PIN.",
                  "Les moyens disponibles s’affichent au paiement selon votre pays et votre éligibilité. ASH ne demande jamais votre code PIN Mobile Money.",
                )}
              </p>
            </div>
            <div className="landing-payment-details">
              <div>
                <Smartphone />
                <div>
                  <h3>{tx("Mobile Money", "Mobile Money")}</h3>
                  <p>MTN MoMo · Orange Money</p>
                  <small>
                    {tx("Via TchokoPay, where eligible", "Via TchokoPay, selon éligibilité")}
                  </small>
                </div>
              </div>
              <div>
                <CreditCard />
                <div>
                  <h3>{tx("Card & bank on mobile", "Carte et banque sur mobile")}</h3>
                  <p className="text-chat-emerald">{tx("Coming soon", "Bientôt disponibles")}</p>
                  <small>
                    {tx(
                      "Website card payments use Stripe where available. Website methods depend on country and checkout.",
                      "Les cartes sur le site utilisent Stripe selon disponibilité. Les moyens du site dépendent du pays et du paiement.",
                    )}
                  </small>
                </div>
              </div>
              <p className="landing-screenshot-note">
                {tx(
                  "App screens show the ASH experience; displayed card designs do not mean mobile card or bank payments are active.",
                  "Les captures présentent l’expérience ASH ; les visuels de cartes ne signifient pas que les paiements carte ou banque sont actifs sur mobile.",
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="landing-invitation">
          <div className="landing-width">
            <p className="landing-kicker">ASH GLO</p>
            <h2>{tx("Your next connection starts here.", "Votre prochain lien commence ici.")}</h2>
            <p>
              {tx(
                "Join the ASH Glo community. Connect, share and explore.",
                "Rejoignez la communauté ASH Glo. Échangez, partagez et explorez.",
              )}
            </p>
            <Button asChild size="lg" className="landing-primary">
              <Link to="/register">
                {tx("Join ASH Today", "Rejoindre ASH aujourd’hui")}
                <ArrowUpRight />
              </Link>
            </Button>
            <Link to="/login" className="landing-member-link">
              {tx("Already a member? Log In", "Déjà membre ? Connectez-vous")}
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer landing-width">
        <div className="landing-footer-identity">
          <div className="landing-brand">
            <img src={logo.url} alt="ASH" width="38" height="38" />
            <span>
              <strong>ASH Glo</strong>
              <small>Global Technologies</small>
            </span>
          </div>
          <p>
            {tx(
              "A connected community for your moments, conversations and everyday discoveries.",
              "Une communauté connectée pour vos moments, conversations et découvertes quotidiennes.",
            )}
          </p>
        </div>
        <div>
          <h3>{tx("Explore", "Découvrir")}</h3>
          <Link to="/login" search={{ next: "/feed" }}>
            {tx("Feed", "Fil")}
          </Link>
          <Link to="/login" search={{ next: "/services" }}>
            {tx("Marketplace", "Marché")}
          </Link>
          <Link to="/login" search={{ next: "/services" }}>
            {tx("Services", "Services")}
          </Link>
        </div>
        <div>
          <h3>{tx("Account", "Compte")}</h3>
          <Link to="/register">{tx("Join ASH", "Rejoindre ASH")}</Link>
          <Link to="/login">{tx("Log In", "Connexion")}</Link>
        </div>
        <div>
          <h3>{tx("Company", "Entreprise")}</h3>
          <Link to="/contact">{tx("Contact ASH", "Contacter ASH")}</Link>
          <Link to="/support">{tx("Support", "Assistance")}</Link>
        </div>
        <div>
          <h3>{tx("Legal", "Informations légales")}</h3>
          <Link to="/privacy">{tx("Privacy Policy", "Confidentialité")}</Link>
          <Link to="/terms">{tx("Terms of Service", "Conditions d’utilisation")}</Link>
          <Link to="/referral-wallet-terms">
            {tx("Referral & Wallet Terms", "Parrainage et portefeuille")}
          </Link>
        </div>
      </footer>

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="landing-image-dialog">
          <DialogHeader>
            <DialogTitle>{tx(active.name, active.fr)} — ASH</DialogTitle>
            <DialogDescription className="sr-only">
              {tx("ASH app screenshot", "Capture de l’application ASH")}
            </DialogDescription>
          </DialogHeader>
          <img src={active.asset.url} alt={tx(`${active.name} on ASH`, `${active.fr} sur ASH`)} />
          <div className="flex justify-center gap-3">
            <Button
              size="icon"
              variant="outline"
              aria-label={tx("Previous screenshot", "Capture précédente")}
              onClick={() => move(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label={tx("Next screenshot", "Capture suivante")}
              onClick={() => move(1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
