import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "fr";

const KEY = "refer.lang";

const EN = {
  "nav.home": "Home",
  "nav.network": "Network",
  "nav.wallet": "Wallet",
  "nav.profile": "Profile",
  "nav.transactions": "Transactions",
  "nav.withdraw": "Withdraw",
  "nav.admin": "Admin",
  "shell.member": "Member",
  "shell.active": "Active",
  "shell.pending": "Pending activation",
  "shell.signOut": "Sign out",
  "shell.theme.dark": "Dark mode",
  "shell.theme.light": "Light mode",
  "shell.language": "Language",

  // Landing
  "landing.signIn": "Sign in",
  "landing.getStarted": "Get started",
  "landing.badge": "Built for Cameroon · Paid in XAF",
  "landing.h1a": "Refer friends.",
  "landing.h1b": "Earn",
  "landing.h1c": "real money",
  "landing.hero.copy":
    "Activate your account once, share your link, and earn commissions across three levels of your network — withdrawn straight to mobile money.",
  "landing.cta.signup": "Sign up for free",
  "landing.cta.haveAccount": "I have an account",
  "landing.balance": "Available balance",
  "landing.row.l1": "Referral commission · L1",
  "landing.row.l2": "Referral commission · L2",
  "landing.row.withdrawal": "Withdrawal · MTN MoMo",
  "landing.level1.label": "Direct referrals",
  "landing.level1.copy": "Everyone who joins with your link and activates.",
  "landing.level2.label": "Second level",
  "landing.level2.copy": "The people your referrals bring in.",
  "landing.level3.label": "Third level",
  "landing.level3.copy": "Your network keeps paying, three levels deep.",
  "landing.how.eyebrow": "How it works",
  "landing.how.title": "Get started in four steps",
  "landing.how.copy":
    "A one-time activation of {fee} unlocks your earning position. After that, every activated member in your first three levels pays you a fixed commission.",
  "landing.step1.title": "Create your account",
  "landing.step1.copy": "Sign up in under a minute with your name, email and phone number.",
  "landing.step2.title": "Activate for {fee}",
  "landing.step2.copy": "A single verified mobile money payment unlocks earning.",
  "landing.step3.title": "Share your link",
  "landing.step3.copy": "Every member gets a unique referral code and shareable link.",
  "landing.step4.title": "Earn and withdraw",
  "landing.step4.copy": "Commissions land in your wallet the moment a referral activates.",
  "landing.platform.eyebrow": "The platform",
  "landing.platform.title": "Everything you need to grow a network",
  "landing.f1.title": "Mobile money native",
  "landing.f1.copy": "Pay and get paid with MTN Mobile Money or Orange Money.",
  "landing.f2.title": "Three earning levels",
  "landing.f2.copy": "Commissions from your referrals, and theirs, and theirs.",
  "landing.f3.title": "Live wallet",
  "landing.f3.copy": "Available balance, pending payouts and a full transaction ledger.",
  "landing.f4.title": "Verified payments",
  "landing.f4.copy": "Every activation is confirmed by the payment provider before rewards drop.",
  "landing.f5.title": "Network insights",
  "landing.f5.copy": "See exactly who joined, who activated and what each level earns.",
  "landing.f6.title": "Fast withdrawals",
  "landing.f6.copy": "Cash out from {min} straight to your mobile wallet.",
  "landing.final.eyebrow": "Start earning",
  "landing.final.title": "Your network is worth money",
  "landing.final.copy":
    "Join Refer today, activate your account and start earning from every person you bring on board.",
  "landing.final.cta": "Create your account",
  "landing.footer": "© {year} Refer. All amounts in XAF.",

  // Dashboard
  "dash.welcome": "Welcome back",
  "dash.availableBalance": "Available Balance",
  "dash.totalEarned": "Total earned",
  "dash.totalWithdrawn": "Total withdrawn",
  "dash.withdrawFunds": "Withdraw funds",
  "dash.activateTitle": "Activate your account",
  "dash.activateCopy": "Pay the one-time {fee} activation fee to unlock referral earnings.",
  "dash.activateCta": "Activate for {fee}",
  "dash.stat.earned": "Total Earned",
  "dash.stat.withdrawn": "Total Withdrawn",
  "dash.stat.direct": "Direct Referrals",
  "dash.stat.network": "Total Network",
  "dash.recent": "Recent activity",
  "common.viewAll": "View all",
  "common.there": "there",

  // Network
  "net.title": "Referral Network",
  "net.subtitle": "Your network across three levels. Member identities stay private.",
  "net.empty.title": "Your network is empty",
  "net.empty.copy": "Share your referral link to add your first member. Commissions are paid once they activate.",
  "net.empty.cta": "Get your referral link",
  "net.level": "Level {n}",
  "net.each": "{amount} each",
  "net.members": "Members",
  "net.activeMembers": "Active members",
  "net.commissions": "Commissions generated",

  // Wallet
  "wallet.title": "Wallet",
  "wallet.subtitle": "Balances update from your transaction ledger.",
  "wallet.withdraw": "Withdraw",
  "wallet.pending": "Pending Balance",
  "wallet.pendingHint": "Held while a withdrawal is processed",
  "wallet.history": "Transaction history",

  // Transactions
  "tx.title": "Transactions",
  "tx.subtitle": "Every financial event on your account.",
  "tx.filter.all": "All",
  "tx.filter.commissions": "Commissions",
  "tx.filter.activation": "Activation",
  "tx.filter.withdrawals": "Withdrawals",

  // Profile
  "profile.title": "Profile",
  "profile.pendingCopy": "Your account is pending activation. Pay {fee} once to start earning.",
  "profile.activateNow": "Activate now",
  "profile.accountDetails": "Account details",
  "profile.fullName": "Full name",
  "profile.email": "Email",
  "profile.phone": "Phone number",
  "profile.save": "Save changes",
  "profile.saved": "Profile updated",
  "profile.err.name": "Enter your full name.",
  "profile.err.phone": "Enter a valid Cameroon number.",
  "profile.err.save": "We could not save your changes. Please try again.",
  "profile.referralDetails": "Referral details",
  "profile.referralCode": "Referral code",
  "profile.memberSince": "Member since",

  // States / shared
  "state.emptyTx": "No transactions yet",
  "state.error": "Something went wrong",
  "state.retry": "Try again",
  "referral.title": "Your referral link",
  "referral.copy": "Copy link",
  "referral.copied": "Link copied",
  "referral.share": "Share",
} as const;

export type TKey = keyof typeof EN;

const FR: Record<TKey, string> = {
  "nav.home": "Accueil",
  "nav.network": "Réseau",
  "nav.wallet": "Portefeuille",
  "nav.profile": "Profil",
  "nav.transactions": "Transactions",
  "nav.withdraw": "Retrait",
  "nav.admin": "Admin",
  "shell.member": "Membre",
  "shell.active": "Actif",
  "shell.pending": "Activation en attente",
  "shell.signOut": "Déconnexion",
  "shell.theme.dark": "Mode sombre",
  "shell.theme.light": "Mode clair",
  "shell.language": "Langue",

  "landing.signIn": "Se connecter",
  "landing.getStarted": "Commencer",
  "landing.badge": "Conçu pour le Cameroun · Payé en XAF",
  "landing.h1a": "Parrainez vos amis.",
  "landing.h1b": "Gagnez de",
  "landing.h1c": "l'argent réel",
  "landing.hero.copy":
    "Activez votre compte une seule fois, partagez votre lien et gagnez des commissions sur trois niveaux de votre réseau — retirées directement en mobile money.",
  "landing.cta.signup": "Inscription gratuite",
  "landing.cta.haveAccount": "J'ai déjà un compte",
  "landing.balance": "Solde disponible",
  "landing.row.l1": "Commission de parrainage · N1",
  "landing.row.l2": "Commission de parrainage · N2",
  "landing.row.withdrawal": "Retrait · MTN MoMo",
  "landing.level1.label": "Filleuls directs",
  "landing.level1.copy": "Toute personne qui s'inscrit avec votre lien et active son compte.",
  "landing.level2.label": "Deuxième niveau",
  "landing.level2.copy": "Les personnes que vos filleuls font venir.",
  "landing.level3.label": "Troisième niveau",
  "landing.level3.copy": "Votre réseau continue de payer, sur trois niveaux.",
  "landing.how.eyebrow": "Comment ça marche",
  "landing.how.title": "Démarrez en quatre étapes",
  "landing.how.copy":
    "Une activation unique de {fee} débloque votre position. Ensuite, chaque membre activé dans vos trois premiers niveaux vous verse une commission fixe.",
  "landing.step1.title": "Créez votre compte",
  "landing.step1.copy": "Inscrivez-vous en moins d'une minute avec votre nom, e-mail et téléphone.",
  "landing.step2.title": "Activez pour {fee}",
  "landing.step2.copy": "Un seul paiement mobile money vérifié débloque vos gains.",
  "landing.step3.title": "Partagez votre lien",
  "landing.step3.copy": "Chaque membre reçoit un code de parrainage unique et un lien à partager.",
  "landing.step4.title": "Gagnez et retirez",
  "landing.step4.copy": "Les commissions arrivent dans votre portefeuille dès qu'un filleul active son compte.",
  "landing.platform.eyebrow": "La plateforme",
  "landing.platform.title": "Tout pour développer votre réseau",
  "landing.f1.title": "100 % mobile money",
  "landing.f1.copy": "Payez et soyez payé avec MTN Mobile Money ou Orange Money.",
  "landing.f2.title": "Trois niveaux de gains",
  "landing.f2.copy": "Des commissions de vos filleuls, des leurs, et encore des leurs.",
  "landing.f3.title": "Portefeuille en direct",
  "landing.f3.copy": "Solde disponible, paiements en attente et registre complet des transactions.",
  "landing.f4.title": "Paiements vérifiés",
  "landing.f4.copy": "Chaque activation est confirmée par le prestataire avant le versement des gains.",
  "landing.f5.title": "Vision du réseau",
  "landing.f5.copy": "Voyez qui a rejoint, qui a activé et ce que chaque niveau rapporte.",
  "landing.f6.title": "Retraits rapides",
  "landing.f6.copy": "Retirez dès {min} directement sur votre portefeuille mobile.",
  "landing.final.eyebrow": "Commencez à gagner",
  "landing.final.title": "Votre réseau a de la valeur",
  "landing.final.copy":
    "Rejoignez Refer aujourd'hui, activez votre compte et gagnez sur chaque personne que vous amenez.",
  "landing.final.cta": "Créer mon compte",
  "landing.footer": "© {year} Refer. Tous les montants en XAF.",

  "dash.welcome": "Bon retour",
  "dash.availableBalance": "Solde disponible",
  "dash.totalEarned": "Total gagné",
  "dash.totalWithdrawn": "Total retiré",
  "dash.withdrawFunds": "Retirer des fonds",
  "dash.activateTitle": "Activez votre compte",
  "dash.activateCopy": "Payez les frais d'activation uniques de {fee} pour débloquer vos gains.",
  "dash.activateCta": "Activer pour {fee}",
  "dash.stat.earned": "Total gagné",
  "dash.stat.withdrawn": "Total retiré",
  "dash.stat.direct": "Filleuls directs",
  "dash.stat.network": "Réseau total",
  "dash.recent": "Activité récente",
  "common.viewAll": "Tout voir",
  "common.there": "vous",

  "net.title": "Réseau de parrainage",
  "net.subtitle": "Votre réseau sur trois niveaux. L'identité des membres reste privée.",
  "net.empty.title": "Votre réseau est vide",
  "net.empty.copy":
    "Partagez votre lien de parrainage pour ajouter votre premier membre. Les commissions sont versées après activation.",
  "net.empty.cta": "Obtenir mon lien de parrainage",
  "net.level": "Niveau {n}",
  "net.each": "{amount} chacun",
  "net.members": "Membres",
  "net.activeMembers": "Membres actifs",
  "net.commissions": "Commissions générées",

  "wallet.title": "Portefeuille",
  "wallet.subtitle": "Les soldes proviennent de votre registre de transactions.",
  "wallet.withdraw": "Retirer",
  "wallet.pending": "Solde en attente",
  "wallet.pendingHint": "Retenu pendant le traitement d'un retrait",
  "wallet.history": "Historique des transactions",

  "tx.title": "Transactions",
  "tx.subtitle": "Chaque évènement financier de votre compte.",
  "tx.filter.all": "Tout",
  "tx.filter.commissions": "Commissions",
  "tx.filter.activation": "Activation",
  "tx.filter.withdrawals": "Retraits",

  "profile.title": "Profil",
  "profile.pendingCopy": "Votre compte est en attente d'activation. Payez {fee} une fois pour commencer à gagner.",
  "profile.activateNow": "Activer maintenant",
  "profile.accountDetails": "Détails du compte",
  "profile.fullName": "Nom complet",
  "profile.email": "E-mail",
  "profile.phone": "Numéro de téléphone",
  "profile.save": "Enregistrer",
  "profile.saved": "Profil mis à jour",
  "profile.err.name": "Entrez votre nom complet.",
  "profile.err.phone": "Entrez un numéro camerounais valide.",
  "profile.err.save": "Impossible d'enregistrer vos modifications. Réessayez.",
  "profile.referralDetails": "Détails de parrainage",
  "profile.referralCode": "Code de parrainage",
  "profile.memberSince": "Membre depuis",

  "state.emptyTx": "Aucune transaction pour le moment",
  "state.error": "Une erreur est survenue",
  "state.retry": "Réessayer",
  "referral.title": "Votre lien de parrainage",
  "referral.copy": "Copier le lien",
  "referral.copied": "Lien copié",
  "referral.share": "Partager",
};

const DICT: Record<Lang, Record<TKey, string>> = { en: EN, fr: FR };

type Vars = Record<string, string | number>;

function translate(lang: Lang, key: TKey, vars?: Vars) {
  const raw = DICT[lang][key] ?? EN[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_m, name: string) => String(vars[name] ?? `{${name}}`));
}

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey, v?: Vars) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k, v) => translate("en", k, v),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Lang | null;
    if (stored === "en" || stored === "fr") {
      setLangState(stored);
      return;
    }
    if (navigator.language?.toLowerCase().startsWith("fr")) setLangState("fr");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(KEY, l);
    setLangState(l);
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, t: (k: TKey, v?: Vars) => translate(lang, k, v) }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
