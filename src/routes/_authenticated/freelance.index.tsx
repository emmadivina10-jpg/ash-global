import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, Plus, Star, Users } from "lucide-react";
import { useFreelancers, useMyProposals, useProjects } from "@/lib/ash.queries";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/freelance/")({
  head: () => ({
    meta: [
      { title: "ASH Freelance — hire talent or find paid work" },
      { name: "description", content: "Post a project, receive proposals from vetted freelancers, or offer your own skills and get hired on ASH." },
      { property: "og:title", content: "ASH Freelance — hire talent or find paid work" },
      { property: "og:description", content: "Projects, proposals and freelance talent in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FreelancePage,
});

function FreelancePage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const projects = useProjects("OPEN");
  const freelancers = useFreelancers();
  const myProposals = useMyProposals();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {fr ? "ASH Freelance" : "ASH Freelance"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fr ? "Trouvez du travail ou recrutez les meilleurs talents." : "Find paid work, or hire the talent you need."}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/create">
            <Plus className="size-4" aria-hidden />
            {fr ? "Publier un projet" : "Post a project"}
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">{fr ? "Projets" : "Projects"}</TabsTrigger>
          <TabsTrigger value="talent">{fr ? "Talents" : "Talent"}</TabsTrigger>
          <TabsTrigger value="proposals">{fr ? "Mes offres" : "My proposals"}</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          {projects.isLoading ? (
            <LoadingState label={fr ? "Chargement des projets…" : "Loading projects…"} />
          ) : (projects.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Briefcase className="size-5" aria-hidden />}
              title={fr ? "Aucun projet ouvert" : "No open projects"}
              description={fr ? "Publiez le premier projet et recevez des propositions." : "Post the first project and start receiving proposals."}
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {(projects.data ?? []).map((project) => (
                <li key={project.id}>
                  <Link
                    to="/freelance/$projectId"
                    params={{ projectId: project.id }}
                    className="tile flex h-full flex-col gap-2 p-4 transition hover:border-primary/40"
                  >
                    <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {project.category}
                    </span>
                    <h2 className="font-semibold text-foreground">{project.title}</h2>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-2 text-sm">
                      <span className="font-display font-extrabold text-foreground">{formatXAF(project.budget)}</span>
                      <span className="text-muted-foreground">
                        {project.proposals_count} {fr ? "propositions" : "proposals"} · {project.deadline_days}
                        {fr ? "j" : "d"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="talent" className="mt-4">
          {(freelancers.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" aria-hidden />}
              title={fr ? "Aucun freelance publié" : "No published freelancers"}
              description={fr ? "Créez votre profil freelance et soyez trouvé." : "Publish your freelance profile and get discovered."}
              action={
                <Button asChild>
                  <Link to="/create">{fr ? "Créer mon profil" : "Create my profile"}</Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(freelancers.data ?? []).map((person) => (
                <li key={person.id} className="tile flex flex-col gap-2 p-4">
                  <h2 className="font-semibold text-foreground">{person.headline}</h2>
                  <p className="text-xs text-muted-foreground">
                    {person.city ?? person.country} · {person.years_experience}
                    {fr ? " an(s)" : " yrs"}
                  </p>
                  {person.bio ? <p className="line-clamp-3 text-sm text-muted-foreground">{person.bio}</p> : null}
                  <div className="flex flex-wrap gap-1.5">
                    {person.skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2 text-sm">
                    <span className="font-display font-extrabold text-foreground">
                      {fr ? "dès" : "from"} {formatXAF(person.starting_price)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Star className="size-3.5 fill-gold text-gold" aria-hidden />
                      {person.rating_avg.toFixed(1)} ({person.rating_count})
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="proposals" className="mt-4">
          {(myProposals.data ?? []).length === 0 ? (
            <EmptyState
              title={fr ? "Aucune proposition envoyée" : "No proposals sent"}
              description={fr ? "Postulez à un projet ouvert pour démarrer." : "Apply to an open project to get started."}
            />
          ) : (
            <ul className="space-y-3">
              {(myProposals.data ?? []).map((row: any) => (
                <li key={row.id} className="tile flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{row.project?.title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatXAF(row.amount)} · {row.delivery_days} {fr ? "jours" : "days"}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
