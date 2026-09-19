import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "Create on ASH — deals, events, projects and freelance profiles" },
      {
        name: "description",
        content:
          "Publish a deal, list an event with tickets, post a freelance project or build your freelancer profile on ASH in a few taps.",
      },
      { property: "og:title", content: "Create on ASH — deals, events, projects and profiles" },
      { property: "og:description", content: "Publish deals, ticketed events, projects and freelance profiles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreatePage,
});

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`Authentication check failed: ${error.message}`);
  if (!data.user) throw new Error("Your session has expired. Please sign in again.");
  return data.user;
}

function databaseMessage(prefix: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${message}`;
}

function CreatePage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();

  return (
    <div className="relative mx-auto w-full max-w-2xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{fr ? "Créer" : "Create"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fr
            ? "Publiez une offre, un événement, un projet ou votre profil freelance."
            : "Publish a deal, an event, a project or your freelance profile."}
        </p>
      </header>

      <Tabs defaultValue="deal">
        <TabsList className="w-full">
          <TabsTrigger value="deal" className="flex-1">
            {fr ? "Offre" : "Deal"}
          </TabsTrigger>
          <TabsTrigger value="event" className="flex-1">
            {fr ? "Événement" : "Event"}
          </TabsTrigger>
          <TabsTrigger value="project" className="flex-1">
            {fr ? "Projet" : "Project"}
          </TabsTrigger>
          <TabsTrigger value="freelancer" className="flex-1">
            {fr ? "Freelance" : "Freelance"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deal" className="mt-4">
          <DealForm fr={fr} />
        </TabsContent>
        <TabsContent value="event" className="mt-4">
          <EventForm fr={fr} />
        </TabsContent>
        <TabsContent value="project" className="mt-4">
          <ProjectForm fr={fr} />
        </TabsContent>
        <TabsContent value="freelancer" className="mt-4">
          <FreelancerForm fr={fr} />
        </TabsContent>
      </Tabs>

      {/* Coming Soon gate: keeps the existing Create experience intact for later while
          temporarily blocking access to it with a clear full-screen notice. */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/65 p-5 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-coming-soon-title"
      >
        <div className="w-full max-w-lg px-4 py-8 text-center sm:py-10">
          <h2 id="create-coming-soon-title" className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            {fr ? "Bientôt disponible !" : "Coming Soon!"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            {fr
              ? "La création d'offres, d'événements, de projets et de profils freelance sera disponible prochainement."
              : "Deal, event, project and freelance profile creation will be available soon."}
          </p>

          <Button
            className="mt-7 h-12 w-full rounded-2xl text-base font-semibold"
            onClick={() => void navigate({ to: "/feed" })}
          >
            {fr ? "Retour au fil" : "Return to Feed"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function DealForm({ fr }: { fr: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "OTHER",
    original: "",
    price: "",
    city: "",
    limit: "50",
    days: "7",
  });
  const [busy, setBusy] = useState(false);

  async function submit() {
    const original = Number(form.original);
    const price = Number(form.price);
    if (form.title.trim().length < 3 || !(original > 0) || !(price > 0) || price >= original) {
      toast.error(fr ? "Vérifiez le titre et les prix." : "Check the title and prices.");
      return;
    }
    setBusy(true);
    try {
      const user = await getAuthenticatedUser();
      const { error } = await supabase.from("deals").insert({
        owner_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        original_price: Math.round(original),
        deal_price: Math.round(price),
        city: form.city.trim() || null,
        starts_at: new Date().toISOString(),
        ends_at: inDays(Math.max(1, Number(form.days) || 7)),
        claim_limit: Math.max(1, Number(form.limit) || 50),
        is_active: true,
      });
      if (error) {
        toast.error(databaseMessage(fr ? "Publication impossible" : "Could not publish the deal", error));
        return;
      }
      toast.success(fr ? "Offre publiée !" : "Deal published!");
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      void navigate({ to: "/deals" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tile space-y-4 p-5">
      <Field id="deal-title" label={fr ? "Titre de l'offre" : "Deal title"}>
        <Input id="deal-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field id="deal-desc" label={fr ? "Description" : "Description"}>
        <Textarea
          id="deal-desc"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="deal-original" label={fr ? "Prix normal (XAF)" : "Normal price (XAF)"}>
          <Input
            id="deal-original"
            inputMode="numeric"
            value={form.original}
            onChange={(e) => setForm({ ...form, original: e.target.value })}
          />
        </Field>
        <Field id="deal-price" label={fr ? "Prix promo (XAF)" : "Deal price (XAF)"}>
          <Input
            id="deal-price"
            inputMode="numeric"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </Field>
        <Field id="deal-city" label={fr ? "Ville" : "City"}>
          <Input id="deal-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field id="deal-limit" label={fr ? "Nombre max" : "Claim limit"}>
          <Input
            id="deal-limit"
            inputMode="numeric"
            value={form.limit}
            onChange={(e) => setForm({ ...form, limit: e.target.value })}
          />
        </Field>
        <Field id="deal-days" label={fr ? "Durée (jours)" : "Runs for (days)"}>
          <Input
            id="deal-days"
            inputMode="numeric"
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
          />
        </Field>
      </div>
      <Button className="w-full" disabled={busy} onClick={() => void submit()}>
        {fr ? "Publier l'offre" : "Publish deal"}
      </Button>
    </div>
  );
}

function EventForm({ fr }: { fr: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "COMMUNITY",
    venue: "",
    city: "",
    startsAt: "",
    price: "",
    capacity: "100",
  });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (form.title.trim().length < 3 || !form.startsAt) {
      toast.error(fr ? "Titre et date requis." : "Title and date are required.");
      return;
    }
    const price = Number(form.price) || 0;
    setBusy(true);
    try {
      const user = await getAuthenticatedUser();
      const { error } = await supabase.from("events").insert({
        organizer_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        venue: form.venue.trim() || null,
        city: form.city.trim() || null,
        starts_at: new Date(form.startsAt).toISOString(),
        is_free: price <= 0,
        ticket_price: Math.max(0, Math.round(price)),
        ticket_capacity: Math.max(1, Number(form.capacity) || 100),
        is_published: true,
      });
      if (error) {
        toast.error(databaseMessage(fr ? "Publication impossible" : "Could not publish the event", error));
        return;
      }
      toast.success(fr ? "Événement publié !" : "Event published!");
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void navigate({ to: "/events" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tile space-y-4 p-5">
      <Field id="ev-title" label={fr ? "Titre" : "Title"}>
        <Input id="ev-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field id="ev-desc" label={fr ? "Description" : "Description"}>
        <Textarea
          id="ev-desc"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="ev-start" label={fr ? "Date et heure" : "Date and time"}>
          <Input
            id="ev-start"
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
        </Field>
        <Field id="ev-venue" label={fr ? "Lieu" : "Venue"}>
          <Input id="ev-venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </Field>
        <Field id="ev-city" label={fr ? "Ville" : "City"}>
          <Input id="ev-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field id="ev-price" label={fr ? "Prix du billet (0 = gratuit)" : "Ticket price (0 = free)"}>
          <Input
            id="ev-price"
            inputMode="numeric"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </Field>
        <Field id="ev-cap" label={fr ? "Places" : "Capacity"}>
          <Input
            id="ev-cap"
            inputMode="numeric"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
        </Field>
      </div>
      <Button className="w-full" disabled={busy} onClick={() => void submit()}>
        {fr ? "Publier l'événement" : "Publish event"}
      </Button>
    </div>
  );
}

function ProjectForm({ fr }: { fr: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "WEB_DEV",
    budget: "",
    days: "14",
    skills: "",
    city: "",
  });
  const [busy, setBusy] = useState(false);

  async function submit() {
    const budget = Number(form.budget);
    if (form.title.trim().length < 3 || form.description.trim().length < 20 || !(budget > 0)) {
      toast.error(fr ? "Titre, description et budget requis." : "Title, description and budget are required.");
      return;
    }
    setBusy(true);
    try {
      const user = await getAuthenticatedUser();
      const { error } = await supabase.from("freelance_projects").insert({
        client_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        budget: Math.round(budget),
        deadline_days: Math.max(1, Number(form.days) || 14),
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        city: form.city.trim() || null,
        status: "OPEN",
      });
      if (error) {
        toast.error(databaseMessage(fr ? "Publication impossible" : "Could not publish the project", error));
        return;
      }
      toast.success(fr ? "Projet publié !" : "Project published!");
      void queryClient.invalidateQueries({ queryKey: ["freelance-projects"] });
      void navigate({ to: "/freelance" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tile space-y-4 p-5">
      <Field id="pr-title" label={fr ? "Titre du projet" : "Project title"}>
        <Input id="pr-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field id="pr-desc" label={fr ? "Ce dont vous avez besoin" : "What you need"}>
        <Textarea
          id="pr-desc"
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="pr-budget" label={fr ? "Budget (XAF)" : "Budget (XAF)"}>
          <Input
            id="pr-budget"
            inputMode="numeric"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
        </Field>
        <Field id="pr-days" label={fr ? "Délai (jours)" : "Deadline (days)"}>
          <Input
            id="pr-days"
            inputMode="numeric"
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
          />
        </Field>
        <Field id="pr-skills" label={fr ? "Compétences (séparées par ,)" : "Skills (comma separated)"}>
          <Input id="pr-skills" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
        </Field>
        <Field id="pr-city" label={fr ? "Ville" : "City"}>
          <Input id="pr-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
      </div>
      <Button className="w-full" disabled={busy} onClick={() => void submit()}>
        {fr ? "Publier le projet" : "Post project"}
      </Button>
    </div>
  );
}

function FreelancerForm({ fr }: { fr: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ headline: "", bio: "", skills: "", city: "", starting: "", years: "1" });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (form.headline.trim().length < 5) {
      toast.error(fr ? "Ajoutez une accroche claire." : "Add a clear headline.");
      return;
    }
    setBusy(true);
    try {
      const user = await getAuthenticatedUser();
      const { error } = await supabase.from("freelancer_profiles").upsert(
        {
          user_id: user.id,
          headline: form.headline.trim(),
          bio: form.bio.trim() || null,
          skills: form.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          city: form.city.trim() || null,
          starting_price: Math.max(0, Math.round(Number(form.starting) || 0)),
          years_experience: Math.max(0, Number(form.years) || 0),
          is_published: true,
        },
        { onConflict: "user_id" },
      );
      if (error) {
        toast.error(databaseMessage(fr ? "Enregistrement impossible" : "Could not save your profile", error));
        return;
      }
      toast.success(fr ? "Profil freelance publié !" : "Freelance profile published!");
      void queryClient.invalidateQueries({ queryKey: ["freelancers"] });
      void queryClient.invalidateQueries({ queryKey: ["freelancer-profile", "mine"] });
      void navigate({ to: "/freelance" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tile space-y-4 p-5">
      <Field id="fl-headline" label={fr ? "Accroche" : "Headline"}>
        <Input
          id="fl-headline"
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          placeholder={fr ? "Développeur frontend React / TypeScript" : "Frontend developer — React / TypeScript"}
        />
      </Field>
      <Field id="fl-bio" label={fr ? "À propos" : "About you"}>
        <Textarea id="fl-bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="fl-skills" label={fr ? "Compétences (séparées par ,)" : "Skills (comma separated)"}>
          <Input id="fl-skills" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
        </Field>
        <Field id="fl-city" label={fr ? "Ville" : "City"}>
          <Input id="fl-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field id="fl-start" label={fr ? "À partir de (XAF)" : "Starting from (XAF)"}>
          <Input
            id="fl-start"
            inputMode="numeric"
            value={form.starting}
            onChange={(e) => setForm({ ...form, starting: e.target.value })}
          />
        </Field>
        <Field id="fl-years" label={fr ? "Années d'expérience" : "Years of experience"}>
          <Input
            id="fl-years"
            inputMode="numeric"
            value={form.years}
            onChange={(e) => setForm({ ...form, years: e.target.value })}
          />
        </Field>
      </div>
      <Button className="w-full" disabled={busy} onClick={() => void submit()}>
        {fr ? "Publier mon profil" : "Publish my profile"}
      </Button>
    </div>
  );
}
