import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, ImagePlus, MapPin, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { EMPLOYMENT_TYPES, LOCATION_TYPES, usePostJob, useJobs } from "@/lib/hub.queries";
import { ComingSoon } from "@/components/refer/ComingSoon";

export const Route = createFileRoute("/_authenticated/jobs/")({
  head: () => ({
    meta: [
      { title: "ASH Jobs — Coming soon" },
      { name: "description", content: "Job postings and in-app applications are coming soon to ASH." },
      { property: "og:title", content: "ASH Jobs — Coming soon" },
      { property: "og:description", content: "Job postings and in-app applications are coming soon to ASH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobsSoon,
});

// Jobs are blocked behind a coming soon screen. Point this route back at
// JobsPage to re-enable the feature.
function JobsSoon() {
  return (
    <ComingSoon
      icon={Briefcase}
      eyebrow="ASH JOBS"
      titleEn="Jobs"
      titleFr="Emplois"
      bodyEn="Job postings and in-app applications are coming soon to ASH Hub."
      bodyFr="Les offres d'emploi et les candidatures dans l'app arrivent bientôt sur ASH Hub."
      features={[
        { icon: Search, en: "Browse open roles", fr: "Parcourez les postes ouverts" },
        { icon: Briefcase, en: "Apply without leaving ASH", fr: "Postulez sans quitter ASH" },
      ]}
    />
  );
}

function JobsPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [search, setSearch] = useState("");
  const [employmentType, setEmploymentType] = useState("ALL");
  const jobs = useJobs({ search, employmentType });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {tx("ASH Jobs", "ASH Jobs")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx("Post a role for free, or apply right inside the app.", "Publiez une offre gratuitement, ou postulez directement dans l'app.")}
          </p>
        </div>
        <PostJobDialog fr={fr} />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tx("Role or company", "Poste ou entreprise")}
            className="pl-9"
          />
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ key: "ALL", en: "All", fr: "Tout" }, ...EMPLOYMENT_TYPES].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setEmploymentType(item.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              employmentType === item.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {tx(item.en, item.fr)}
          </button>
        ))}
      </div>

      {jobs.isLoading ? (
        <LoadingState label={tx("Loading jobs…", "Chargement des offres…")} />
      ) : (jobs.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Briefcase className="size-5" aria-hidden />}
          title={tx("No open roles", "Aucune offre ouverte")}
          description={tx("Post the first role — it's free.", "Publiez la première offre, c'est gratuit.")}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(jobs.data ?? []).map((job) => (
            <li key={job.id}>
              <Link
                to="/jobs/$jobId"
                params={{ jobId: job.id }}
                className="tile flex h-full flex-col gap-2 overflow-hidden p-0 transition hover:border-primary/40"
              >
                {job.image_url ? <img src={job.image_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" /> : null}
                <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {job.employment_type}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {job.location_type}
                  </span>
                </div>
                <h2 className="font-semibold text-foreground">{job.title}</h2>
                <p className="text-sm text-muted-foreground">{job.company}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden />
                    {job.city ?? job.country}
                  </span>
                  <span className="font-display font-extrabold text-foreground">
                    {job.salary_min || job.salary_max
                      ? `${formatXAF(job.salary_min ?? job.salary_max ?? 0)}${job.salary_max && job.salary_min ? ` – ${formatXAF(job.salary_max)}` : ""}`
                      : tx("Negotiable", "À négocier")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {job.applications_count} {tx("applicants", "candidature(s)")}
                </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostJobDialog({ fr }: { fr: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [locationType, setLocationType] = useState("ONSITE");
  const [city, setCity] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [email, setEmail] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const post = usePostJob();

  async function submit() {
    if (title.trim().length < 3 || company.trim().length < 2 || description.trim().length < 20) {
      toast.error(fr ? "Complétez le poste, l'entreprise et la description." : "Fill in role, company and description.");
      return;
    }
    try {
      await post.mutateAsync({
        title,
        company,
        description,
        employment_type: employmentType,
        location_type: locationType,
        city,
        salary_min: salaryMin ? Number(salaryMin) : null,
        salary_max: salaryMax ? Number(salaryMax) : null,
        apply_deadline: null,
        contact_email: email.trim() || null,
        imageFile,
      });
      toast.success(fr ? "Offre publiée." : "Job posted.");
      setOpen(false);
      setTitle("");
      setCompany("");
      setDescription("");
      setCity("");
      setSalaryMin("");
      setSalaryMax("");
      setEmail("");
      setImageFile(null);
    } catch {
      toast.error(fr ? "Publication impossible." : "Could not post the job.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="touch-manipulation">
          <Plus className="size-4" aria-hidden />
          {fr ? "Publier une offre" : "Post a job"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>{fr ? "Nouvelle offre" : "New job posting"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={fr ? "Intitulé du poste" : "Job title"} />
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={fr ? "Entreprise" : "Company"} />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder={fr ? "Missions, profil recherché…" : "Responsibilities, who you're looking for…"}
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              {EMPLOYMENT_TYPES.map((item) => (
                <option key={item.key} value={item.key}>
                  {tx(item.en, item.fr)}
                </option>
              ))}
            </select>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              {LOCATION_TYPES.map((item) => (
                <option key={item.key} value={item.key}>
                  {tx(item.en, item.fr)}
                </option>
              ))}
            </select>
          </div>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={fr ? "Ville" : "City"} />
          <div className="flex gap-2">
            <Input
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder={fr ? "Salaire min" : "Salary min"}
            />
            <Input
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder={fr ? "Salaire max" : "Salary max"}
            />
          </div>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder={fr ? "Email de contact (optionnel)" : "Contact email (optional)"}
          />
          <div className="rounded-lg border border-dashed border-border p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
              <ImagePlus className="size-4 text-primary" aria-hidden />
              {fr ? "Ajouter une image (optionnel)" : "Add one image (optional)"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {imageFile ? (
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{imageFile.name}</span>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => setImageFile(null)} aria-label={fr ? "Retirer l'image" : "Remove image"}>
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
          <Button onClick={submit} disabled={post.isPending} className="w-full touch-manipulation">
            {post.isPending ? (fr ? "Publication…" : "Posting…") : fr ? "Publier l'offre" : "Post the job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
