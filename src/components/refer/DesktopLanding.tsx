import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowDownToLine, ArrowUpRight, ChevronLeft, ChevronRight, Expand, ShieldCheck, Smartphone, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  { asset: feed, name: "Feed", fr: "Fil", title: "A world worth sharing.", titleFr: "Un monde à partager.", body: "Moments, Stories and Spotlights. Stay close to the people and businesses that make your world yours.", bodyFr: "Moments, Stories et Spotlights. Restez proche des personnes et des entreprises qui font partie de votre monde." },
  { asset: market, name: "Market", fr: "Marché", title: "Discover. Connect. Trade.", titleFr: "Découvrez. Échangez. Achetez.", body: "Explore the marketplace, meet providers and keep the conversation connected to your booking.", bodyFr: "Explorez le marché, rencontrez des prestataires et gardez votre conversation liée à votre réservation." },
  { asset: track, name: "Compass", fr: "Compass", title: "Stay connected along the way.", titleFr: "Restez connecté à chaque étape.", body: "Follow your booking and access Map and Wallet together through ASH Compass. Location sharing is optional.", bodyFr: "Suivez votre réservation et retrouvez Carte et Portefeuille dans ASH Compass. Le partage de position est facultatif." },
  { asset: chat, name: "Messages", fr: "Messages", title: "Make it a conversation.", titleFr: "Tout commence par un échange.", body: "Friends, family and marketplace conversations, with text and voice messages in one place.", bodyFr: "Amis, famille et conversations du marché, avec messages écrits et vocaux au même endroit." },
  { asset: friends, name: "Friends", fr: "Amis", title: "Your people, closer.", titleFr: "Vos proches, plus près.", body: "Find connections, add friends and build your community on ASH.", bodyFr: "Faites des rencontres, ajoutez des amis et développez votre communauté sur ASH." },
  { asset: wallet, name: "Wallet", fr: "Portefeuille", title: "Your wallet. A clearer view.", titleFr: "Votre portefeuille, en toute clarté.", body: "View your balances and eligible withdrawal options. Mobile card and bank features are coming soon.", bodyFr: "Consultez vos soldes et les retraits disponibles. Carte et banque sur mobile : bientôt disponibles." },
  { asset: referral, name: "Referrals", fr: "Parrainage", title: "Connections that go further.", titleFr: "Des liens qui vont plus loin.", body: "See your referral network across L1, L2 and L3. Referral earnings are available only to eligible members in Cameroon and Nigeria.", bodyFr: "Retrouvez votre réseau de parrainage L1, L2 et L3. Les gains sont réservés aux membres éligibles au Cameroun et au Nigeria." },
  { asset: join, name: "Your moments", fr: "Vos moments", title: "A place for your perspective.", titleFr: "Une place pour votre regard.", body: "Share what matters to you and be part of the everyday conversation.", bodyFr: "Partagez ce qui compte pour vous et prenez part aux échanges du quotidien." },
] as const;

export function DesktopLanding() {
  const { tx } = useI18n();
  const [selected, setSelected] = useState(0);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const active = screens[selected] ?? screens[0];
  const move = (direction: number) => setSelected((index) => (index + direction + screens.length) % screens.length);

  return (
    <div className="desktop-landing">
      <header className="landing-header landing-width">
        <Link to="/" className="landing-brand" aria-label="ASH Global Technologies">
          <img src={logo.url} alt="" width="44" height="44" />
          <span><strong>ASH</strong><small>Global Technologies</small></span>
        </Link>
        <nav className="flex items-center gap-6" aria-label={tx("Main navigation", "Navigation principale")}>
          <a href="#experience" className="landing-nav-link">{tx("The ASH experience", "L’expérience ASH")}</a>
          <Link to="/support" className="landing-nav-link">{tx("Support", "Assistance")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher /><ThemeToggle />
          <Button asChild variant="ghost" className="landing-signin"><Link to="/login">{tx("Sign in", "Connexion")}<ArrowUpRight /></Link></Button>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <span className="landing-watermark" aria-hidden>ASH</span>
          <div className="landing-width landing-hero-copy">
            <p className="landing-kicker"><span />{tx("YOUR WORLD, CONNECTED", "VOTRE MONDE, CONNECTÉ")}</p>
            <h1 id="landing-title">ASH Global<br /><em>Technologies</em><span className="landing-period">.</span></h1>
            <p className="landing-intro">{tx("People. Possibilities. One connected world.", "Des personnes. Des possibilités. Un monde connecté.")}</p>
            <p className="landing-description">{tx("Share your moments, discover the marketplace and keep your conversations close. Welcome to ASH.", "Partagez vos moments, découvrez le marché et restez proche de vos conversations. Bienvenue sur ASH.")}</p>
            <div className="flex flex-wrap justify-center gap-3 mt-7">
              <Button asChild size="lg" className="landing-primary"><Link to="/register">{tx("Join ASH", "Rejoindre ASH")}<ArrowUpRight /></Link></Button>
              <Button size="lg" variant="outline" className="landing-secondary" onClick={() => setDownloadOpen(true)}><ArrowDownToLine />{tx("Get the app", "Obtenir l’application")}</Button>
            </div>
          </div>
          <div className="landing-panorama" aria-label={tx("ASH app previews", "Aperçus de l’application ASH")}>
            {[screens[3], screens[0], screens[1]].map((screen, index) => (
              <a href="#experience" key={screen.name} className={`landing-preview landing-preview-${index}`} onClick={() => setSelected(screens.indexOf(screen))}>
                <img src={screen.asset.url} alt={tx(`${screen.name} on ASH`, `${screen.fr} sur ASH`)} fetchPriority={index === 1 ? "high" : "auto"} />
              </a>
            ))}
          </div>
          <a href="#experience" className="landing-scroll"><ArrowDown className="size-4" />{tx("Explore the ASH experience", "Découvrez l’expérience ASH")}</a>
        </section>

        <section id="experience" className="landing-experience landing-width">
          <div className="landing-section-heading">
            <div><p className="landing-kicker">{tx("THE ASH EXPERIENCE", "L’EXPÉRIENCE ASH")}</p><h2>{tx("Life, more connected.", "La vie, plus connectée.")}</h2></div>
            <p>{tx("Your everyday world, brought together.", "Votre univers quotidien, enfin réuni.")}</p>
          </div>
          <div className="landing-tabs" role="tablist" aria-label={tx("Explore ASH", "Découvrir ASH")}>
            {screens.map((screen, index) => <Button variant="ghost" role="tab" aria-selected={index === selected} aria-controls="ash-screen-panel" id={`ash-screen-tab-${index}`} key={screen.name} className="landing-tab" onClick={() => setSelected(index)}>{tx(screen.name, screen.fr)}</Button>)}
          </div>
          <div className="landing-gallery" role="tabpanel" id="ash-screen-panel" aria-labelledby={`ash-screen-tab-${selected}`}>
            <div className="landing-gallery-image">
              <img key={active.asset.url} src={active.asset.url} alt={tx(`${active.name} on ASH — supplied app screenshot`, `${active.fr} sur ASH — capture de l’application`)} loading="lazy" />
              <Button size="icon" variant="outline" onClick={() => setImageOpen(true)} className="landing-expand" aria-label={tx("Enlarge screenshot", "Agrandir la capture")} title={tx("Enlarge screenshot", "Agrandir la capture")}><Expand /></Button>
            </div>
            <div className="landing-gallery-copy">
              <span className="landing-counter">0{selected + 1} <span>/ 08</span></span>
              <h3>{tx(active.title, active.titleFr)}</h3>
              <p>{tx(active.body, active.bodyFr)}</p>
              <Button asChild variant="link" className="landing-text-link"><Link to="/register">{tx("Discover ASH", "Découvrir ASH")}<ArrowUpRight /></Link></Button>
              <div className="flex items-center gap-3 mt-10">
                <Button size="icon" variant="outline" aria-label={tx("Previous screenshot", "Capture précédente")} onClick={() => move(-1)}><ChevronLeft /></Button>
                <Button size="icon" variant="outline" aria-label={tx("Next screenshot", "Capture suivante")} onClick={() => move(1)}><ChevronRight /></Button>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-payments">
          <div className="landing-width landing-payment-layout">
            <div><ShieldCheck className="size-7 mb-5 text-chat-emerald" /><p className="landing-kicker">{tx("PAYMENTS ON ASH", "PAIEMENTS SUR ASH")}</p><h2>{tx("Clarity at every step.", "La clarté à chaque étape.")}</h2><p className="landing-payment-description">{tx("Available methods are shown at checkout, based on your country and eligibility. ASH never asks for your Mobile Money PIN.", "Les moyens disponibles s’affichent au paiement selon votre pays et votre éligibilité. ASH ne demande jamais votre code PIN Mobile Money.")}</p></div>
            <div className="landing-payment-details">
              <div><Smartphone /><div><h3>{tx("Mobile Money", "Mobile Money")}</h3><p>MTN MoMo · Orange Money</p><small>{tx("Via TchokoPay, where eligible", "Via TchokoPay, selon éligibilité")}</small></div></div>
              <div><CreditCard /><div><h3>{tx("Card & bank on mobile", "Carte et banque sur mobile")}</h3><p className="text-chat-emerald">{tx("Coming soon", "Bientôt disponibles")}</p><small>{tx("Website card payments use Stripe where available. Website methods depend on country and checkout.", "Les cartes sur le site utilisent Stripe selon disponibilité. Les moyens du site dépendent du pays et du paiement.")}</small></div></div>
              <p className="landing-screenshot-note">{tx("App screens show the ASH experience; displayed card designs do not mean mobile card or bank payments are active.", "Les captures présentent l’expérience ASH ; les visuels de cartes ne signifient pas que les paiements carte ou banque sont actifs sur mobile.")}</p>
            </div>
          </div>
        </section>

        <section className="landing-invitation landing-width"><p className="landing-kicker">{tx("MAKE YOUR NEXT CONNECTION", "CRÉEZ VOTRE PROCHAIN LIEN")}</p><h2>{tx("Your world awaits.", "Votre monde vous attend.")}</h2><Button asChild size="lg" className="landing-primary"><Link to="/register">{tx("Join ASH", "Rejoindre ASH")}<ArrowUpRight /></Link></Button></section>
      </main>
      <footer className="landing-footer landing-width">
        <div className="landing-brand"><img src={logo.url} alt="ASH" width="38" height="38" /><span><strong>ASH</strong><small>Global Technologies</small></span></div>
        <div className="flex flex-wrap gap-5 text-xs"><Link to="/support">{tx("Support", "Assistance")}</Link><Link to="/privacy">{tx("Privacy", "Confidentialité")}</Link><Link to="/terms">{tx("Terms", "Conditions")}</Link><Link to="/contact">Contact</Link></div>
        <span className="text-xs text-muted-foreground">{tx("Where opportunities connect.", "Là où les opportunités se rencontrent.")}</span>
      </footer>

      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}><DialogContent className="rounded-lg"><DialogHeader><DialogTitle>{tx("ASH on your phone", "ASH sur votre téléphone")}</DialogTitle><DialogDescription>{tx("Public App Store and Google Play download links are not available yet. You can use ASH in your phone’s browser now.", "Les liens publics de téléchargement App Store et Google Play ne sont pas encore disponibles. Utilisez ASH dans le navigateur de votre téléphone dès maintenant.")}</DialogDescription></DialogHeader><Button asChild><Link to="/register">{tx("Continue with ASH", "Continuer avec ASH")}</Link></Button></DialogContent></Dialog>
      <Dialog open={imageOpen} onOpenChange={setImageOpen}><DialogContent className="landing-image-dialog"><DialogHeader><DialogTitle>{tx(active.name, active.fr)} — ASH</DialogTitle><DialogDescription className="sr-only">{tx("ASH app screenshot", "Capture de l’application ASH")}</DialogDescription></DialogHeader><img src={active.asset.url} alt={tx(`${active.name} on ASH`, `${active.fr} sur ASH`)} /><div className="flex justify-center gap-3"><Button size="icon" variant="outline" aria-label={tx("Previous screenshot", "Capture précédente")} onClick={() => move(-1)}><ChevronLeft /></Button><Button size="icon" variant="outline" aria-label={tx("Next screenshot", "Capture suivante")} onClick={() => move(1)}><ChevronRight /></Button></div></DialogContent></Dialog>
    </div>
  );
}