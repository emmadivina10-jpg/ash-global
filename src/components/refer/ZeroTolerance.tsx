const ZERO_TOLERANCE: Array<[string, string]> = [
  ["Harassment and bullying", "Harcèlement et intimidation"],
  ["Threats", "Menaces"],
  ["Hate or discriminatory content", "Contenu haineux ou discriminatoire"],
  [
    "Sexual exploitation or inappropriate sexual content",
    "Exploitation sexuelle ou contenu sexuel inapproprié",
  ],
  ["Violence or encouragement of violence", "Violence ou incitation à la violence"],
  ["Scams and fraud", "Arnaques et fraude"],
  ["Illegal activity", "Activités illégales"],
  ["Spam", "Spam"],
  [
    "Abusive behavior and other objectionable content",
    "Comportement abusif et autres contenus répréhensibles",
  ],
];

/** Zero-tolerance rules shown before registration and before first use. */
export function ZeroTolerance({ fr }: { fr: boolean }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm font-semibold text-foreground">
        {fr ? "ASH Glo applique une tolérance zéro pour :" : "ASH Glo has zero tolerance for:"}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {ZERO_TOLERANCE.map(([en, frText]) => (
          <li key={en}>{fr ? frText : en}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {fr
          ? "Les contenus signalés sont examinés par l'équipe ASH Trust & Safety. Les infractions peuvent entraîner la suppression du contenu, une suspension ou la fermeture du compte."
          : "Reported content is reviewed by ASH Trust & Safety. Violations can lead to content removal, suspension or account termination."}
      </p>
    </div>
  );
}
