/**
 * Branded ASH Glo outreach scripts. Client-safe: the console renders these
 * into the editor, the agent tweaks them, then sends by email or WhatsApp.
 * Variables use {{name}} style tokens filled from the contact record.
 */

export type OutreachLang = "en" | "fr";

export type OutreachScript = {
  key: string;
  label: string;
  group: "Support" | "Growth" | "Sales" | "Trust" | "Marketplace";
  subject: Record<OutreachLang, string>;
  body: Record<OutreachLang, string>;
};

export const OUTREACH_SCRIPTS: OutreachScript[] = [
  {
    key: "welcome",
    label: "Welcome / account activated",
    group: "Support",
    subject: { en: "Welcome to ASH Glo, {{name}}", fr: "Bienvenue sur ASH Glo, {{name}}" },
    body: {
      en: "Hi {{name}},\n\nWelcome to ASH Glo. Your account is active and you can now book trusted providers, sell your own services and earn through referrals.\n\nIf you need anything at all, reply to this message and a real person from our team will help you.\n\nWarm regards,\nASH Glo Support",
      fr: "Bonjour {{name}},\n\nBienvenue sur ASH Glo. Votre compte est actif : vous pouvez réserver des prestataires de confiance, vendre vos services et gagner grâce aux parrainages.\n\nRépondez simplement à ce message si vous avez besoin d'aide, une personne de notre équipe vous répondra.\n\nCordialement,\nSupport ASH Glo",
    },
  },
  {
    key: "payment-issue",
    label: "Payment issue — being investigated",
    group: "Support",
    subject: { en: "We are on your payment, {{name}}", fr: "Nous traitons votre paiement, {{name}}" },
    body: {
      en: "Hi {{name}},\n\nThank you for flagging the payment of {{amount}}. Our payments team is checking it with the operator right now and we will come back to you as soon as it clears.\n\nNothing is lost: every transaction is traced with a reference on our side.\n\nASH Glo Support",
      fr: "Bonjour {{name}},\n\nMerci d'avoir signalé le paiement de {{amount}}. Notre équipe vérifie actuellement avec l'opérateur et nous revenons vers vous dès que c'est réglé.\n\nRien n'est perdu : chaque transaction est tracée avec une référence de notre côté.\n\nSupport ASH Glo",
    },
  },
  {
    key: "withdrawal-approved",
    label: "Withdrawal approved",
    group: "Support",
    subject: { en: "Your withdrawal is on the way", fr: "Votre retrait est en route" },
    body: {
      en: "Hi {{name}},\n\nGood news — your withdrawal of {{amount}} has been approved and sent to your mobile money number. It usually lands within a few minutes.\n\nThanks for growing with ASH Glo.\n\nASH Glo Support",
      fr: "Bonjour {{name}},\n\nBonne nouvelle : votre retrait de {{amount}} a été approuvé et envoyé sur votre numéro mobile money. Il arrive généralement en quelques minutes.\n\nMerci de grandir avec ASH Glo.\n\nSupport ASH Glo",
    },
  },
  {
    key: "booking-dispute",
    label: "Booking dispute follow-up",
    group: "Support",
    subject: { en: "About your booking {{booking}}", fr: "À propos de votre réservation {{booking}}" },
    body: {
      en: "Hi {{name}},\n\nWe are reviewing your booking {{booking}} with {{provider}}. Could you confirm what happened in a few lines so we can settle it fairly for both sides?\n\nYour money stays protected until the case is closed.\n\nASH Glo Support",
      fr: "Bonjour {{name}},\n\nNous examinons votre réservation {{booking}} avec {{provider}}. Pouvez-vous nous décrire en quelques lignes ce qui s'est passé afin de trancher équitablement ?\n\nVotre argent reste protégé jusqu'à la clôture du dossier.\n\nSupport ASH Glo",
    },
  },
  {
    key: "verification-approved",
    label: "Provider verified",
    group: "Trust",
    subject: { en: "You are now ASH verified", fr: "Vous êtes désormais vérifié ASH" },
    body: {
      en: "Hi {{name}},\n\nCongratulations — {{provider}} is now ASH verified. Your storefront carries the verified badge, which puts you higher in search and builds instant trust with clients.\n\nKeep your portfolio fresh to convert even more bookings.\n\nASH Glo Trust & Verification",
      fr: "Bonjour {{name}},\n\nFélicitations — {{provider}} est maintenant vérifié ASH. Votre vitrine affiche le badge vérifié, ce qui améliore votre classement et rassure immédiatement les clients.\n\nGardez votre portfolio à jour pour convertir encore plus de réservations.\n\nÉquipe Confiance ASH Glo",
    },
  },
  {
    key: "verification-more-info",
    label: "Verification — more info needed",
    group: "Trust",
    subject: { en: "One more step to get verified", fr: "Une dernière étape pour être vérifié" },
    body: {
      en: "Hi {{name}},\n\nWe started reviewing {{provider}} for the ASH verified badge. To finish, please add a clear profile photo, at least three portfolio pictures and a short description of your services.\n\nSend them over and we will verify you within 24 hours.\n\nASH Glo Trust & Verification",
      fr: "Bonjour {{name}},\n\nNous avons commencé la vérification de {{provider}}. Pour finaliser, ajoutez une photo de profil nette, au moins trois photos de portfolio et une courte description de vos services.\n\nEnvoyez-les et nous vous vérifions sous 24 heures.\n\nÉquipe Confiance ASH Glo",
    },
  },
  {
    key: "provider-inactive",
    label: "Provider inactivity nudge",
    group: "Marketplace",
    subject: { en: "Your ASH storefront is quiet", fr: "Votre vitrine ASH est calme" },
    body: {
      en: "Hi {{name}},\n\nClients are searching your category on ASH every day, but {{provider}} has not been active lately. Adding two or three new photos and keeping your prices up to date typically doubles booking requests.\n\nWant help? Reply and we will set it up with you.\n\nASH Glo Marketplace Team",
      fr: "Bonjour {{name}},\n\nDes clients recherchent votre catégorie chaque jour sur ASH, mais {{provider}} est peu actif ces derniers temps. Ajouter deux ou trois photos et mettre à jour vos prix double généralement les demandes.\n\nBesoin d'aide ? Répondez et nous le faisons avec vous.\n\nÉquipe Marketplace ASH Glo",
    },
  },
  {
    key: "provider-recruit",
    label: "Recruit a provider",
    group: "Growth",
    subject: { en: "Get more clients with ASH Glo", fr: "Plus de clients avec ASH Glo" },
    body: {
      en: "Hello {{name}},\n\nThis is {{agent}} from ASH Glo. We connect clients around you with trusted professionals — braiders, barbers, electricians, plumbers, chefs, tech and more.\n\nListing your business is free. You only pay 1% when you actually get paid through the platform. Clients can see your photos, reviews and chat with you directly.\n\nCan I send you the registration link?\n\n{{agent}} — ASH Glo",
      fr: "Bonjour {{name}},\n\nIci {{agent}} d'ASH Glo. Nous connectons les clients autour de vous à des professionnels de confiance — coiffure, barbier, électricien, plomberie, cuisine, tech et plus.\n\nL'inscription est gratuite. Vous payez seulement 1% lorsque vous êtes payé via la plateforme. Les clients voient vos photos, vos avis et discutent directement avec vous.\n\nJe vous envoie le lien d'inscription ?\n\n{{agent}} — ASH Glo",
    },
  },
  {
    key: "business-sales",
    label: "Sell ASH to a business",
    group: "Sales",
    subject: { en: "Bring {{name}} online with ASH Glo", fr: "Mettez {{name}} en ligne avec ASH Glo" },
    body: {
      en: "Hello,\n\nI am {{agent}} from ASH Glo. We help businesses like {{name}} in {{city}} receive orders, take mobile money payments and be found by customers nearby.\n\nSetup takes 10 minutes and there is no monthly fee — just 1% on completed transactions.\n\nWould you like a quick demo today?\n\n{{agent}} — ASH Glo",
      fr: "Bonjour,\n\nJe suis {{agent}} d'ASH Glo. Nous aidons les entreprises comme {{name}} à {{city}} à recevoir des commandes, encaisser par mobile money et être trouvées par les clients à proximité.\n\nLa configuration prend 10 minutes, sans abonnement — seulement 1% sur les transactions abouties.\n\nSouhaitez-vous une démonstration aujourd'hui ?\n\n{{agent}} — ASH Glo",
    },
  },
  {
    key: "advertising",
    label: "Advertising package pitch",
    group: "Sales",
    subject: { en: "Promote {{name}} to people around you", fr: "Faites la promotion de {{name}} autour de vous" },
    body: {
      en: "Hello,\n\n{{agent}} from ASH Glo here. We can put {{name}} in front of thousands of people in {{city}} through promoted listings on ASH.\n\nStarter $5/day · Business $15/day · Premium $30/day (homepage + featured provider).\n\nWhich one should I set up for you?\n\n{{agent}} — ASH Glo Advertising",
      fr: "Bonjour,\n\n{{agent}} d'ASH Glo. Nous pouvons présenter {{name}} à des milliers de personnes à {{city}} via des annonces sponsorisées sur ASH.\n\nStarter 5$/jour · Business 15$/jour · Premium 30$/jour (page d'accueil + prestataire en vedette).\n\nLaquelle je prépare pour vous ?\n\n{{agent}} — Publicité ASH Glo",
    },
  },
  {
    key: "partnership",
    label: "Partnership proposal",
    group: "Sales",
    subject: { en: "ASH Glo partnership with {{name}}", fr: "Partenariat ASH Glo avec {{name}}" },
    body: {
      en: "Dear {{name}} team,\n\nASH Glo is a digital marketplace connecting people with verified professionals and businesses. We would love to explore a partnership: onboarding your members, staff or vendors with dedicated support and preferential terms.\n\nCould we schedule a short meeting this week?\n\n{{agent}} — ASH Glo Partnerships",
      fr: "Chère équipe {{name}},\n\nASH Glo est une place de marché numérique qui connecte les personnes à des professionnels et entreprises vérifiés. Nous aimerions étudier un partenariat : intégration de vos membres, employés ou fournisseurs avec un accompagnement dédié et des conditions préférentielles.\n\nPouvons-nous convenir d'une courte rencontre cette semaine ?\n\n{{agent}} — Partenariats ASH Glo",
    },
  },
  {
    key: "creator",
    label: "Creator invitation",
    group: "Growth",
    subject: { en: "Create with ASH Glo", fr: "Créez avec ASH Glo" },
    body: {
      en: "Hey {{name}},\n\nLove your content. I am {{agent}} from ASH Glo — we are building the marketplace where people in {{city}} find services, shops and creators.\n\nWe are onboarding a first group of creators with promotion on our platform and paid campaigns from partner businesses.\n\nInterested? I will send the details.\n\n{{agent}} — ASH Glo",
      fr: "Salut {{name}},\n\nJ'adore ton contenu. Je suis {{agent}} d'ASH Glo — nous construisons la place de marché où les gens à {{city}} trouvent services, boutiques et créateurs.\n\nNous intégrons un premier groupe de créateurs avec de la promotion sur notre plateforme et des campagnes rémunérées de nos partenaires.\n\nÇa t'intéresse ? Je t'envoie les détails.\n\n{{agent}} — ASH Glo",
    },
  },
  {
    key: "general",
    label: "General reply",
    group: "Support",
    subject: { en: "ASH Glo Support", fr: "Support ASH Glo" },
    body: {
      en: "Hi {{name}},\n\n\n\nASH Glo Support",
      fr: "Bonjour {{name}},\n\n\n\nSupport ASH Glo",
    },
  },
];

export function fillScript(text: string, values: Record<string, string | undefined>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? `{{${key}}}`);
}

export function scriptsFor(group: OutreachScript["group"] | "ALL") {
  return group === "ALL" ? OUTREACH_SCRIPTS : OUTREACH_SCRIPTS.filter((s) => s.group === group);
}
