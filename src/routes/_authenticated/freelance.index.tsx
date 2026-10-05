import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Briefcase, MapPin, Plus, Search, Star, Users, Clock, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
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

  const [q, setQ] = useState("");
  const [where, setWhere] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const allProjects = projects.data ?? [];
  const categories = useMemo(() => Array.from(new Set(allProjects.map((p) => p.category).filter(Boolean))).slice(0, 8), [allProjects]);
  const term = q.trim().toLowerCase();
  const place = where.trim().toLowerCase();
  const filteredProjects = allProjects.filter((p: any) =>
    (!cat || p.category === cat) &&
    (!term || `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(term)) &&
    (!place || `${p.city ?? ""} ${p.country ?? ""} ${p.location ?? ""}`.toLowerCase().includes(place)),
  );
  const filteredTalent = (freelancers.data ?? []).filter((t: any) =>
    (!term || `${t.headline} ${t.bio ?? ""} ${t.skills.join(" ")}`.toLowerCase().includes(term)) &&
    (!place || `${t.city ?? ""} ${t.country ?? ""}`.toLowerCase().includes(place)),
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-gold p-5 text-primary-foreground shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">ASH Freelance</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              {fr ? "Votre prochain travail commence ici" : "Your next gig starts here"}
            </h1>
            <p className="mt-1 text-sm opacity-90">
              {fr ? "Trouvez du travail payé ou recrutez les meilleurs talents." : "Find paid work, or hire the talent you need."}
            </p>
          </div>
          <Button asChild size="sm" variant="secondary" className="rounded-full">
            <Link to="/create">
              <Plus className="size-4" aria-hidden />
              {fr ? "Publier un projet" : "Post a project"}
            </Link>
          </Button>
        </div>
        <div className="relative mt-5 grid gap-2 rounded-2xl bg-card p-2 text-foreground shadow-lg sm:grid-cols-[1fr_1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl px-3">
            <Search className="size-4 text-primary" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={fr ? "Métier, compétence ou mot-clé" : "Job title, skill or keyword"} className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
          </label>
          <label className="flex items-center gap-2 rounded-xl px-3 sm:border-l sm:border-border">
            <MapPin className="size-4 text-primary" aria-hidden />
            <Input value={where} onChange={(e) => setWhere(e.target.value)} placeholder={fr ? "Ville ou pays" : "City or country"} className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
          </label>
          <Button className="h-11 rounded-xl px-6 font-bold">{fr ? "Rechercher" : "Find work"}</Button>
        </div>
      </section>

      {categories.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button onClick={() => setCat(null)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${!cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"}`}>
            {fr ? "Tout" : "All"}
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c === cat ? null : c)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">{fr ? "Projets" : "Projects"}</TabsTrigger>
          <TabsTrigger value="talent">{fr ? "Talents" : "Talent"}</TabsTrigger>
          <TabsTrigger value="proposals">{fr ? "Mes offres" : "My proposals"}</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          {projects.isLoading ? (
            <LoadingState label={fr ? "Chargement des projets…" : "Loading projects…"} />
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="size-5" aria-hidden />}
              title={fr ? "Aucun projet ouvert" : "No open projects"}
              description={fr ? "Publiez le premier projet et recevez des propositions." : "Post the first project and start receiving proposals."}
            />
          ) : (
            <ul className="space-y-3">
              {filteredProjects.map((project: any) => (
                <li key={project.id}>
                  <Link
                    to="/freelance/$projectId"
                    params={{ projectId: project.id }}
                    className="tile flex h-full flex-col gap-2 border-l-4 border-l-primary p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-bold text-primary">{project.title}</h2>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                        {project.category}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{project.deadline_days} {fr ? "jours" : "days"}</span>
                      <span className="inline-flex items-center gap-1"><FileText className="size-3.5" aria-hidden />{project.proposals_count} {fr ? "propositions" : "proposals"}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-2 text-sm">
                      <span className="font-display font-extrabold text-foreground">{formatXAF(project.budget)}</span>
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{fr ? "Postuler" : "Apply"}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="talent" className="mt-4">
          {filteredTalent.length === 0 ? (
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
              {filteredTalent.map((person: any) => (
                <li key={person.id} className="tile flex flex-col gap-2 p-4">
                  <h2 className="font-semibold text-foreground">{person.headline}</h2>
                  <p className="text-xs text-muted-foreground">
                    {person.city ?? person.country} · {person.years_experience}
                    {fr ? " an(s)" : " yrs"}
                  </p>
                  {person.bio ? <p className="line-clamp-3 text-sm text-muted-foreground">{person.bio}</p> : null}
                  <div className="flex flex-wrap gap-1.5">
                    {person.skills.slice(0, 4).map((skill: string) => (
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
