import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProject, useProposals } from "@/lib/ash.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useTrackView } from "@/lib/activity";
import { ComingSoon } from "@/components/refer/ComingSoon";

export const Route = createFileRoute("/_authenticated/freelance/$projectId")({
  head: () => ({
    meta: [
      { title: "Project brief — Coming soon" },
      { name: "description", content: "ASH Freelance is coming soon. Proposals are not open yet." },
      { property: "og:title", content: "Project brief — Coming soon" },
      {
        property: "og:description",
        content: "ASH Freelance is coming soon. Proposals are not open yet.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectSoon,
});

// Freelance is blocked behind a coming soon screen. Point this route back at
// ProjectDetail to re-enable the feature.
function ProjectSoon() {
  return (
    <ComingSoon
      icon={Briefcase}
      eyebrow="ASH FREELANCE"
      titleEn="Freelance"
      titleFr="Freelance"
      bodyEn="Freelance project briefs are not open yet. Budget, deadline and skills will appear here once Freelance launches."
      bodyFr="Les briefs de projets freelance ne sont pas encore ouverts. Budget, échéance et compétences apparaîtront au lancement."
      features={[
        {
          icon: Briefcase,
          en: "Full project brief and budget",
          fr: "Brief et budget complets du projet",
        },
      ]}
    />
  );
}

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const { data: project, isLoading } = useProject(projectId);
  const proposals = useProposals(projectId);

  useTrackView(
    { event_type: "view", surface: "freelance", target_type: "project", target_id: projectId },
    Boolean(project),
  );

  const [cover, setCover] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);

  if (isLoading) return <LoadingState label={tx("Loading…", "Chargement…")} />;
  if (!project) {
    return (
      <EmptyState
        title={tx("Project not found", "Projet introuvable")}
        action={
          <Button asChild variant="outline">
            <Link to="/freelance">{tx("Back", "Retour")}</Link>
          </Button>
        }
      />
    );
  }

  async function submitProposal() {
    const value = Number(amount);
    if (cover.trim().length < 20 || !Number.isFinite(value) || value <= 0) {
      toast.error(
        tx("Add a message and a valid amount.", "Ajoutez un message et un montant valide."),
      );
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { error } = await supabase.from("freelance_proposals").insert({
        project_id: projectId,
        freelancer_id: auth.user.id,
        cover_letter: cover.trim(),
        amount: Math.round(value),
        delivery_days: Math.max(1, Number(days) || 7),
      });
      if (error) {
        toast.error(
          error.code === "23505"
            ? tx("You already applied to this project.", "Vous avez déjà postulé.")
            : tx("Could not send the proposal.", "Envoi impossible."),
        );
        return;
      }
      toast.success(tx("Proposal sent!", "Proposition envoyée !"));
      setCover("");
      setAmount("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["freelance-proposals", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["freelance-proposals", "mine"] }),
        queryClient.invalidateQueries({ queryKey: ["freelance-project", projectId] }),
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Link
        to="/freelance"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {tx("Projects", "Projets")}
      </Link>

      <header className="tile space-y-3 p-5">
        <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {project.category}
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {project.title}
        </h1>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {project.description}
        </p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: tx("Budget", "Budget"), value: formatXAF(project.budget) },
            {
              label: tx("Deadline", "Délai"),
              value: `${project.deadline_days} ${tx("days", "jours")}`,
            },
            { label: tx("Location", "Lieu"), value: project.city ?? project.location_type },
            { label: tx("Proposals", "Propositions"), value: String(project.proposals_count) },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 font-display text-sm font-extrabold text-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        {project.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {project.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {project.status === "OPEN" ? (
        <section className="tile space-y-4 p-5">
          <h2 className="font-display text-lg font-bold text-foreground">
            {tx("Send a proposal", "Envoyer une proposition")}
          </h2>
          <div className="space-y-2">
            <Label htmlFor="cover">{tx("Your message", "Votre message")}</Label>
            <Textarea
              id="cover"
              rows={5}
              value={cover}
              maxLength={2000}
              onChange={(event) => setCover(event.target.value)}
              placeholder={tx(
                "Explain how you will deliver this project.",
                "Expliquez comment vous allez livrer ce projet.",
              )}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">{tx("Your price (XAF)", "Votre prix (XAF)")}</Label>
              <Input
                id="amount"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">{tx("Delivery (days)", "Livraison (jours)")}</Label>
              <Input
                id="days"
                inputMode="numeric"
                value={days}
                onChange={(event) => setDays(event.target.value)}
              />
            </div>
          </div>
          <Button className="w-full" disabled={busy} onClick={() => void submitProposal()}>
            {tx("Send proposal", "Envoyer la proposition")}
          </Button>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          {tx("Proposals received", "Propositions reçues")}
        </h2>
        {(proposals.data ?? []).length === 0 ? (
          <EmptyState title={tx("No visible proposals", "Aucune proposition visible")} />
        ) : (
          <ul className="space-y-3">
            {(proposals.data ?? []).map((row) => (
              <li key={row.id} className="tile space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display font-extrabold text-foreground">
                    {formatXAF(row.amount)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.delivery_days} {tx("days", "jours")} · {row.status}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {row.cover_letter}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
