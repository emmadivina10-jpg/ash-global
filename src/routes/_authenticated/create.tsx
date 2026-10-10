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
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();

  return (
    <div className="relative mx-auto w-full max-w-2xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{tx("Create", "Créer")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tx("Publish a deal, an event, a project or your freelance profile.", "Publiez une offre, un événement, un projet ou votre profil freelance.")}
        </p>
      </header>

      <Tabs defaultValue="deal">
        <TabsList className="w-full">
          <TabsTrigger value="deal" className="flex-1">
            {tx("Deal", "Offre")}
          </TabsTrigger>
          <TabsTrigger value="event" className="flex-1">
            {tx("Event", "Événement")}
          </TabsTrigger>
          <TabsTrigger value="project" className="flex-1">
            {tx("Project", "Projet")}
          </TabsTrigger>
          <TabsTrigger value="freelancer" className="flex-1">
            {tx("Freelance", "Freelance")}
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
            {tx("Coming Soon!", "Bientôt disponible !")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            {tx("Deal, event, project and freelance profile creation will be available soon.", "La création d'offres, d'événements, de projets et de profils freelance sera disponible prochainement.")}
          </p>

          <Button
            className="mt-7 h-12 w-full rounded-2xl text-base font-semibold"
            onClick={() => void navigate({ to: "/feed" })}
          >
            {tx("Return to Feed", "Retour au fil")}
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
      toast.error(tx("Check the title and prices.", "Vérifiez le titre et les prix."));
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
        toast.error(databaseMessage(tx("Could not publish the deal", "Publication impossible"), error));
        return;
      }
      toast.success(tx("Deal published!", "Offre publiée !"));
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      void navigate({ to: "/deals" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tile space-y-4 p-5">
      <Field id="deal-title" label={tx("Deal title", "Titre de l'offre")}>
        <Input id="deal-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field id="deal-desc" label={tx("Description", "Description")}>
        <Textarea
          id="deal-desc"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="deal-original" label={tx("Normal price (XAF)", "Prix normal (XAF)")}>
          <Input
            id="deal-original"
            inputMode="numeric"
            value={form.original}
            onChange={(e) => setForm({ ...form, original: e.target.value })}
          />
        </Field>
        <Field id="deal-price" label={tx("Deal price (XAF)", "Prix promo (XAF)")}>
          <Input
            id="deal-price"
            inputMode="numeric"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </Field>
        <Field id="deal-city" label={tx("City", "Ville")}>
          <Input id="deal-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field id="deal-limit" label={tx("Claim limit", "Nombre max")}>
          <Input
            id="deal-limit"
            inputMode="numeric"
            value={form.limit}
            onChange={(e) => setForm({ ...form, limit: e.target.value })}
          />
        </Field>
        <Field id="deal-days" label={tx("Runs for (days)", "Durée (jours)")}>
          <Input
            id="deal-days"
            inputMode="numeric"
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
          />
        </Field>
      </div>
      <Button className="w-full" disabled={busy} onClick={() => void submit()}>
        {tx("Publish deal", "Publier l'offre")}
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
      toast.error(tx("Title and date are required.", "Titre et date requis."));
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
        toast.error(databaseMessage(tx("Could not publish the event", "Publication impossible"), error));
        return;
      }
      toast.success(tx("Event published!", "Événement publié !"));
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void navigate({ to: "/events" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tile space-y-4 p-5">
      <Field id="ev-title" label={tx("Title", "Titre")}>
        <Input id="ev-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field id="ev-desc" label={tx("Description", "Description")}>
        <Textarea
          id="ev-desc"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="ev-start" label={tx("Date and time", "Date et heure")}>
          <Input
            id="ev-start"
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
        </Field>
        <Field id="ev-venue" label={tx("Venue", "Lieu")}>
          <Input id="ev-venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </Field>
        <Field id="ev-city" label={tx("City", "Ville")}>
          <Input id="ev-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field id="ev-price" label={tx("Ticket price (0 = free)", "Prix du billet (0 = gratuit)")}>
          <Input
            id="ev-price"
            inputMode="numeric"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </Field>
        <Field id="ev-cap" label={tx("Capacity", "Places")}>
          <Input
            id="ev-cap"
            inputMode="numeric"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
        </Field>
      </div>
      <Button className="w-full" disabled={busy} onClick={() => void submit()}>
        {tx("Publish event", "Publier l'événement")}
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
      toast.error(tx("Title, description and budget are required.", "Titre, description et budget requis."));
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
        toast.error(databaseMessage(tx("Could not publish the project", "Publication impossible"), error));
        return;
      }
      toast.success(tx("Project published!", "Projet publié !"));
      void queryClient.invalidateQueries({ queryKey: ["freelance-projects"] });
      void navigate({ to: "/freelance" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tile space-y-4 p-5">
      <Field id="pr-title" label={tx("Project title", "Titre du projet")}>
        <Input id="pr-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field id="pr-desc" label={tx("What you need", "Ce dont vous avez besoin")}>
        <Textarea
          id="pr-desc"
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="pr-budget" label={tx("Budget (XAF)", "Budget (XAF)")}>
          <Input
            id="pr-budget"
            inputMode="numeric"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
        </Field>
        <Field id="pr-days" label={tx("Deadline (days)", "Délai (jours)")}>
          <Input
            id="pr-days"
            inputMode="numeric"
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
          />
        </Field>
        <Field id="pr-skills" label={tx("Skills (comma separated)", "Compétences (séparées par ,)")}>
          <Input id="pr-skills" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
        </Field>
        <Field id="pr-city" label={tx("City", "Ville")}>
          <Input id="pr-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
      </div>
      <Button className="w-full" disabled={busy} onClick={() => void submit()}>
        {tx("Post project", "Publier le projet")}
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
      toast.error(tx("Add a clear headline.", "Ajoutez une accroche claire."));
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
        toast.error(databaseMessage(tx("Could not save your profile", "Enregistrement impossible"), error));
        return;
      }
      toast.success(tx("Freelance profile published!", "Profil freelance publié !"));
      void queryClient.invalidateQueries({ queryKey: ["freelancers"] });
      void queryClient.invalidateQueries({ queryKey: ["freelancer-profile", "mine"] });
      void navigate({ to: "/freelance" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tile space-y-4 p-5">
      <Field id="fl-headline" label={tx("Headline", "Accroche")}>
        <Input
          id="fl-headline"
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          placeholder={tx("Frontend developer — React / TypeScript", "Développeur frontend React / TypeScript")}
        />
      </Field>
      <Field id="fl-bio" label={tx("About you", "À propos")}>
        <Textarea id="fl-bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="fl-skills" label={tx("Skills (comma separated)", "Compétences (séparées par ,)")}>
          <Input id="fl-skills" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
        </Field>
        <Field id="fl-city" label={tx("City", "Ville")}>
          <Input id="fl-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field id="fl-start" label={tx("Starting from (XAF)", "À partir de (XAF)")}>
          <Input
            id="fl-start"
            inputMode="numeric"
            value={form.starting}
            onChange={(e) => setForm({ ...form, starting: e.target.value })}
          />
        </Field>
        <Field id="fl-years" label={tx("Years of experience", "Années d'expérience")}>
          <Input
            id="fl-years"
            inputMode="numeric"
            value={form.years}
            onChange={(e) => setForm({ ...form, years: e.target.value })}
          />
        </Field>
      </div>
      <Button className="w-full" disabled={busy} onClick={() => void submit()}>
        {tx("Publish my profile", "Publier mon profil")}
      </Button>
    </div>
  );
}
