import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useTrackView } from "@/lib/activity";
import {
  useApplyToJob,
  useJob,
  useJobApplications,
  useSetApplicationStatus,
  openJobConversation,
} from "@/lib/hub.queries";
import { ComingSoon } from "@/components/refer/ComingSoon";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job opening — Coming soon" },
      { name: "description", content: "ASH Jobs are coming soon. Applications are not open yet." },
      { property: "og:title", content: "Job opening — Coming soon" },
      { property: "og:description", content: "ASH Jobs are coming soon. Applications are not open yet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobSoon,
});

// Jobs are blocked behind a coming soon screen. Point this route back at
// JobDetail to re-enable the feature.
function JobSoon() {
  return (
    <ComingSoon
      icon={Briefcase}
      eyebrow="ASH JOBS"
      titleEn="Jobs"
      titleFr="Emplois"
      bodyEn="ASH Jobs are not live yet. Full role details and in-app applications will open once Jobs launch."
      bodyFr="ASH Jobs n'est pas encore actif. Les détails du poste et les candidatures s'ouvriront au lancement."
      features={[
        { icon: Briefcase, en: "Full role description", fr: "Description complète du poste" },
        { icon: MessageSquare, en: "Message the employer", fr: "Écrivez à l'employeur" },
      ]}
    />
  );
}

function JobDetail() {
  const { jobId } = Route.useParams();
  const { lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const job = useJob(jobId);
  const applications = useJobApplications(jobId);

  useTrackView(
    { event_type: "view", surface: "jobs", target_type: "job", target_id: jobId, category: job.data?.category ?? null },
    Boolean(job.data),
  );
  const apply = useApplyToJob();
  const setStatus = useSetApplicationStatus();
  const [coverLetter, setCoverLetter] = useState("");
  const [phone, setPhone] = useState("");

  if (job.isLoading) return <LoadingState label={fr ? "Chargement…" : "Loading…"} />;
  if (!job.data)
    return (
      <EmptyState
        title={fr ? "Offre introuvable" : "Job not found"}
        action={
          <Button asChild>
            <Link to="/jobs">{fr ? "Voir les offres" : "Browse jobs"}</Link>
          </Button>
        }
      />
    );

  const row = job.data;
  const mine = row.is_mine;
  const alreadyApplied = !mine && (applications.data ?? []).length > 0;

  async function submit() {
    if (coverLetter.trim().length < 20) {
      toast.error(fr ? "Écrivez quelques lignes de motivation." : "Write a few lines about yourself.");
      return;
    }
    try {
      await apply.mutateAsync({ jobId, coverLetter, phone });
      toast.success(fr ? "Candidature envoyée." : "Application sent.");
      setCoverLetter("");
      setPhone("");
    } catch {
      toast.error(fr ? "Envoi impossible — avez-vous déjà postulé ?" : "Could not send — have you already applied?");
    }
  }

  async function contactPoster() {
    try {
      const conversationId = await openJobConversation(jobId);
      void navigate({ to: "/messages", search: { c: conversationId } } as never);
    } catch {
      toast.error(fr ? "Impossible d'ouvrir la discussion." : "Could not open the conversation.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {fr ? "Offres" : "Jobs"}
      </Link>

      <header className="tile space-y-2 p-5">
        {row.image_url ? <img src={row.image_url} alt="" className="mb-4 aspect-[16/9] w-full rounded-lg object-cover" /> : null}
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {row.employment_type}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {row.location_type}
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">{row.title}</h1>
        <p className="text-sm text-muted-foreground">{row.company}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            {row.city ?? row.country}
          </span>
          <span className="font-display font-extrabold text-foreground">
            {row.salary_min || row.salary_max
              ? `${formatXAF(row.salary_min ?? row.salary_max ?? 0)}${row.salary_max && row.salary_min ? ` – ${formatXAF(row.salary_max)}` : ""}`
              : fr
                ? "À négocier"
                : "Negotiable"}
          </span>
        </div>
      </header>

      {!mine ? (
        <Button onClick={() => void contactPoster()} className="w-full sm:w-auto">
          <MessageSquare className="size-4" aria-hidden />
          {fr ? "Contacter le recruteur" : "Message job poster"}
        </Button>
      ) : null}

      <section className="tile space-y-2 p-5">
        <h2 className="font-semibold text-foreground">{fr ? "Description" : "About the role"}</h2>
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{row.description}</p>
      </section>

      {mine ? (
        <section className="tile space-y-3 p-5">
          <h2 className="font-semibold text-foreground">
            {fr ? "Candidatures" : "Applications"} ({(applications.data ?? []).length})
          </h2>
          {(applications.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {fr ? "Aucune candidature pour le moment." : "No applications yet."}
            </p>
          ) : (
            <ul className="space-y-3">
              {(applications.data ?? []).map((application) => (
                <li key={application.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8">
                      <AvatarImage src={application.applicant.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>{application.applicant.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {application.applicant.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {application.contact_phone ?? "—"} · {application.status}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {application.cover_letter}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="touch-manipulation"
                      onClick={() =>
                        setStatus.mutate({ id: application.id, jobId, status: "ACCEPTED" })
                      }
                    >
                      {fr ? "Retenir" : "Shortlist"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="touch-manipulation"
                      onClick={() =>
                        setStatus.mutate({ id: application.id, jobId, status: "DECLINED" })
                      }
                    >
                      {fr ? "Refuser" : "Decline"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : alreadyApplied ? (
        <section className="tile p-5">
          <p className="text-sm text-muted-foreground">
            {fr
              ? "Votre candidature a été envoyée. L'employeur vous répondra ici."
              : "Your application is in. The employer will get back to you here."}
          </p>
        </section>
      ) : (
        <section className="tile space-y-3 p-5">
          <h2 className="font-semibold text-foreground">{fr ? "Postuler" : "Apply"}</h2>
          <Textarea
            value={coverLetter}
            onChange={(event) => setCoverLetter(event.target.value)}
            rows={6}
            placeholder={fr ? "Pourquoi vous ? Quelques lignes suffisent." : "Why you? A few lines is enough."}
          />
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={fr ? "Téléphone (optionnel)" : "Phone (optional)"}
          />
          <Button onClick={submit} disabled={apply.isPending} className="w-full touch-manipulation">
            {apply.isPending ? (fr ? "Envoi…" : "Sending…") : fr ? "Envoyer ma candidature" : "Send application"}
          </Button>
        </section>
      )}
    </div>
  );
}
