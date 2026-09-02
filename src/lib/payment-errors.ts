/** Turns TchokoPay error codes and failure categories into something a payer can act on. */
export function paymentErrorMessage(code: string | null | undefined, fr: boolean, providerMessage?: string | null): string {
  switch (code) {
    case "PAYMENT_PROVIDER_NOT_CONFIGURED":
      return fr
        ? "Les paiements ne sont pas encore connectés. Aucun montant n'a été prélevé."
        : "Payments are not connected yet. Nothing has been charged.";
    case "UNAUTHORIZED":
      return fr
        ? "Le prestataire de paiement a refusé nos identifiants. Aucun montant n'a été prélevé."
        : "The payment provider rejected our credentials. Nothing has been charged.";
    case "INVALID_REQUEST":
      return (
        providerMessage ??
        (fr
          ? "Ce numéro ne correspond pas au réseau choisi, ou le montant est hors limites."
          : "That number doesn't match the network you picked, or the amount is out of range.")
      );
    case "FORBIDDEN":
      return fr
        ? "Ce réseau n'est pas disponible pour ce paiement, ou trop de demandes ont été envoyées à ce numéro."
        : "That network isn't available for this payment, or too many prompts were sent to this number.";
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return fr ? "Trop de tentatives. Réessayez dans un instant." : "Too many attempts. Try again in a moment.";
    case "MOMO_DETAILS_REQUIRED":
      return fr ? "Choisissez un réseau et saisissez votre numéro." : "Pick a network and enter your number.";
    case "PROVIDER_UNREACHABLE":
    case "SERVER_ERROR":
      return fr
        ? "Le prestataire de paiement est injoignable. Réessayez dans un instant."
        : "The payment provider is unreachable. Try again in a moment.";
    default:
      return providerMessage ?? (fr ? "Le paiement n'a pas pu démarrer." : "The payment could not be started.");
  }
}

/** Explains a FAILED collection using TchokoPay's failure category. */
export function failureMessage(category: string | null | undefined, fr: boolean): string {
  switch (category) {
    case "ABANDONED":
      return fr
        ? "La demande n'a pas été validée sur le téléphone. Réessayez."
        : "The prompt wasn't approved on the phone. Try again.";
    case "DECLINED":
      return fr
        ? "Le réseau a refusé le paiement (solde ou code PIN). Réessayez."
        : "The network declined the payment (balance or PIN). Try again.";
    case "SYSTEM":
      return fr ? "Panne côté réseau. Réessayez dans un instant." : "A network-side failure. Try again in a moment.";
    default:
      return fr ? "Le paiement n'a pas abouti. Réessayez." : "The payment did not go through. Try again.";
  }
}
