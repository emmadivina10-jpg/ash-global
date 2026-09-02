import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/freelance/$projectId")({
  head: () => ({
    meta: [
      { title: "Project brief — ASH Freelance" },
      { name: "description", content: "Read the full brief, budget and required skills for this freelance project, then send your proposal on ASH." },
      { property: "og:title", content: "Project brief — ASH Freelance" },
      { property: "og:description", content: "Budget, deadline and skills for this freelance project." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const { data: project, isLoading } = useProject(projectId);
  const proposals = useProposals(projectId);

  const [cover, setCover] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);

  if (isLoading) return <LoadingState label={fr ? "Chargement…" : "Loading…"} />;
  if (!project) {
    return (
      <EmptyState
        title={fr ? "Projet introuvable" : "Project not found"}
        action={
          <Button asChild variant="outline">
            <Link to="/freelance">{fr ? "Retour" : "Back"}</Link>
          </Button>
        }
      />
    );
  }

  async function submitProposal() {
    const value = Number(amount);
    if (cover.trim().length < 20 || !Number.isFinite(value) || value <= 0) {
      toast.error(fr ? "Ajoutez un message et un montant valide." : "Add a message and a valid amount.");
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
            ? fr ? "Vous avez déjà postulé." : "You already applied to this project."
            : fr ? "Envoi impossible." : "Could not send the proposal.",
        );
        return;
      }
      toast.success(fr ? "Proposition envoyée !" : "Proposal sent!");
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
      <Link to="/freelance" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {fr ? "Projets" : "Projects"}
      </Link>

      <header className="tile space-y-3 p-5">
        <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {project.category}
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{project.title}</h1>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{project.description}</p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: fr ? "Budget" : "Budget", value: formatXAF(project.budget) },
            { label: fr ? "Délai" : "Deadline", value: `${project.deadline_days} ${fr ? "jours" : "days"}` },
            { label: fr ? "Lieu" : "Location", value: project.city ?? project.location_type },
            { label: fr ? "Propositions" : "Proposals", value: String(project.proposals_count) },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 font-display text-sm font-extrabold text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
        {project.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {project.skills.map((skill) => (
              <span key={skill} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {skill}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {project.status === "OPEN" ? (
        <section className="tile space-y-4 p-5">
          <h2 className="font-display text-lg font-bold text-foreground">{fr ? "Envoyer une proposition" : "Send a proposal"}</h2>
          <div className="space-y-2">
            <Label htmlFor="cover">{fr ? "Votre message" : "Your message"}</Label>
            <Textarea
              id="cover"
              rows={5}
              value={cover}
              maxLength={2000}
              onChange={(event) => setCover(event.target.value)}
              placeholder={fr ? "Expliquez comment vous allez livrer ce projet." : "Explain how you will deliver this project."}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">{fr ? "Votre prix (XAF)" : "Your price (XAF)"}</Label>
              <Input id="amount" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">{fr ? "Livraison (jours)" : "Delivery (days)"}</Label>
              <Input id="days" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} />
            </div>
          </div>
          <Button className="w-full" disabled={busy} onClick={() => void submitProposal()}>
            {fr ? "Envoyer la proposition" : "Send proposal"}
          </Button>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          {fr ? "Propositions reçues" : "Proposals received"}
        </h2>
        {(proposals.data ?? []).length === 0 ? (
          <EmptyState title={fr ? "Aucune proposition visible" : "No visible proposals"} />
        ) : (
          <ul className="space-y-3">
            {(proposals.data ?? []).map((row) => (
              <li key={row.id} className="tile space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display font-extrabold text-foreground">{formatXAF(row.amount)}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.delivery_days} {fr ? "jours" : "days"} · {row.status}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.cover_letter}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
