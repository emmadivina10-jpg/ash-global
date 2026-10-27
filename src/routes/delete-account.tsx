import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { PublicInfoShell } from "@/components/refer/PublicInfoShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { deletionRequestSchema } from "@/lib/deletion-request";
import { submitDeletionRequest } from "@/lib/deletion-request.functions";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Request Account or Data Deletion — ASH Glo" },
      {
        name: "description",
        content:
          "Request deletion of your ASH Glo account and personal data, or personalization history only, without signing in. Identity verification and legal retention apply.",
      },
      { property: "og:title", content: "ASH Glo Account & Data Deletion Request" },
      {
        property: "og:description",
        content:
          "Public privacy request form for ASH Glo, operated by ASH Global Technologies. No login required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/delete-account" }],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const { tx } = useI18n();
  const submit = useServerFn(submitDeletionRequest);
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<"ACCOUNT" | "PERSONALIZATION">("ACCOUNT");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = deletionRequestSchema.safeParse({ email, scope });
    if (!parsed.success) {
      setError(
        tx(
          "Enter the email registered to your ASH Glo account.",
          "Saisissez l’adresse e-mail de votre compte ASH Glo.",
        ),
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await submit({ data: parsed.data });
      if (!result.ok) {
        setError(
          result.error === "RATE_LIMITED"
            ? tx(
                "Too many requests. Please wait 15 minutes and try again.",
                "Trop de demandes. Attendez 15 minutes avant de réessayer.",
              )
            : tx(
                "Your request could not be recorded. Please try again or contact official Support.",
                "Votre demande n’a pas pu être enregistrée. Réessayez ou contactez l’assistance officielle.",
              ),
        );
        return;
      }
      setReference(result.reference);
      setEmail("");
    } catch {
      setError(
        tx(
          "Your request could not be recorded. Please try again or contact official Support.",
          "Votre demande n’a pas pu être enregistrée. Réessayez ou contactez l’assistance officielle.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <PublicInfoShell
      eyebrow="ASH Global Technologies"
      title={tx(
        "ASH Glo Account & Data Deletion",
        "ASH Glo — Suppression du compte et des données",
      )}
      description={tx(
        "Request account and personal data deletion without signing in. ASH reviews each request and verifies ownership before taking action.",
        "Demandez la suppression du compte et des données sans connexion. ASH examine chaque demande et vérifie l’identité avant toute action.",
      )}
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {tx("How to request deletion", "Comment demander la suppression")}
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
            <li>
              {tx(
                "Enter your registered email below and choose what you want deleted.",
                "Saisissez votre e-mail enregistré et choisissez les données à supprimer.",
              )}
            </li>
            <li>
              {tx(
                "Submit the request and keep its reference. ASH Support will contact the registered email to verify account ownership. Never send a password, PIN, payment details or identity document in this form.",
                "Envoyez la demande et conservez sa référence. L’assistance ASH vous contactera à l’adresse enregistrée pour vérifier que le compte vous appartient. N’envoyez jamais de mot de passe, code, coordonnées de paiement ou pièce d’identité dans ce formulaire.",
              )}
            </li>
            <li>
              {tx(
                "After verification, staff review the scope, unresolved obligations and legal retention requirements, and confirm the actual outcome. Receipt of a request is not confirmation of deletion.",
                "Après vérification, l’équipe examine la demande, les obligations en cours et la conservation légale, puis confirme le résultat réel. La réception ne confirme pas la suppression.",
              )}
            </li>
          </ol>
        </section>
        <section className="border-y border-border py-6">
          {reference ? (
            <div role="status" className="space-y-3">
              <CheckCircle2 className="size-7 text-success" aria-hidden />
              <h2 className="text-lg font-semibold">
                {tx("Request recorded", "Demande enregistrée")}
              </h2>
              <p className="font-semibold">
                {tx("Reference", "Référence")} : {reference}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {tx(
                  "Your request is in the ASH Support review queue. Identity verification is required. Your account and data have not been deleted. Processing follows the Privacy Policy and applicable legal retention requirements.",
                  "Votre demande figure dans la file d’examen de l’assistance ASH. Une vérification d’identité est nécessaire. Votre compte et vos données n’ont pas été supprimés. Le traitement suit la politique de confidentialité et la conservation légale applicable.",
                )}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <h2 className="text-lg font-semibold">
                {tx("Submit a deletion request", "Envoyer une demande de suppression")}
              </h2>
              <fieldset className="space-y-3" disabled={busy}>
                <legend className="mb-2 text-sm font-semibold">
                  {tx("What would you like deleted?", "Que souhaitez-vous supprimer ?")}
                </legend>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="scope"
                    value="ACCOUNT"
                    checked={scope === "ACCOUNT"}
                    onChange={() => setScope("ACCOUNT")}
                    className="mt-1 accent-primary"
                  />
                  {tx(
                    "My account and associated personal data",
                    "Mon compte et les données personnelles associées",
                  )}
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="scope"
                    value="PERSONALIZATION"
                    checked={scope === "PERSONALIZATION"}
                    onChange={() => setScope("PERSONALIZATION")}
                    className="mt-1 accent-primary"
                  />
                  {tx(
                    "Only personalization activity and interest signals — keep my account",
                    "Uniquement l’activité de personnalisation et les centres d’intérêt — conserver mon compte",
                  )}
                </label>
              </fieldset>
              <div className="space-y-2">
                <Label htmlFor="deletion-email">
                  {tx("Registered email address", "Adresse e-mail du compte")}
                </Label>
                <Input
                  id="deletion-email"
                  type="email"
                  autoComplete="email"
                  maxLength={200}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={busy}
                  aria-describedby="deletion-email-help"
                />
                <p id="deletion-email-help" className="text-xs text-muted-foreground">
                  {tx(
                    "Used only to identify your account and follow up on this request.",
                    "Utilisée uniquement pour identifier votre compte et suivre cette demande.",
                  )}
                </p>
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {busy
                  ? tx("Submitting…", "Envoi…")
                  : tx("Request deletion", "Demander la suppression")}
              </Button>
            </form>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            {tx("What is deleted or retained", "Données supprimées ou conservées")}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {tx(
              "Account requests cover the sign-in account, profile information and associated personal data and uploaded content, subject to verified ownership and lawful exceptions. Permanent account erasure is not operational yet: approvals remain blocked until safe deletion and retention safeguards are ready. You can still record a request for review and follow-up; there is no automatic deletion or guaranteed completion date.",
              "Les demandes de compte portent sur l’accès, le profil, les données personnelles et les contenus associés, sous réserve de vérification et des exceptions légales. L’effacement définitif du compte n’est pas encore opérationnel : les approbations restent bloquées jusqu’à la mise en place d’une suppression sûre et de la conservation légale. Vous pouvez enregistrer une demande pour examen et suivi ; aucune suppression automatique ni date garantie n’est annoncée.",
            )}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            {tx(
              "Data-only requests cover personalization activity history and interest signals, without closing your account. Posts, messages, friends, bookings, referrals, wallet and payment records are not included in this option. Signed-in members can also clear personalization history in Settings.",
              "Les demandes de données seules portent sur l’historique de personnalisation et les centres d’intérêt, sans fermer le compte. Publications, messages, amis, réservations, parrainages, portefeuille et paiements ne sont pas inclus. Les membres connectés peuvent aussi effacer l’historique de personnalisation dans les paramètres.",
            )}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            {tx(
              "Payment and accounting records, refunds, disputes and unresolved obligations may be retained where legally required. Fraud, abuse and safety records are retained for 24 months, or longer for an active case or a legal requirement. Other mandatory periods depend on the applicable law; no universal 90-day deletion promise applies. Independent copies held by other members and lawful records may remain. See the Privacy Policy for details.",
              "Les registres de paiement et de comptabilité, remboursements, litiges et obligations en cours peuvent être conservés selon la loi. Les données de fraude, d’abus et de sécurité sont conservées 24 mois, ou plus pour un dossier actif ou une obligation légale. Les autres durées dépendent du droit applicable ; aucune suppression universelle sous 90 jours n’est promise. Les copies indépendantes d’autres membres et les registres légaux peuvent subsister. Consultez la politique de confidentialité.",
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/privacy">{tx("Privacy Policy", "Politique de confidentialité")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/support">{tx("Contact Support", "Contacter l’assistance")}</Link>
            </Button>
          </div>
        </section>
      </div>
    </PublicInfoShell>
  );
}
