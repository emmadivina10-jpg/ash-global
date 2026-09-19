import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitSupportTicket } from "@/lib/support.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { PublicInfoShell } from "@/components/refer/PublicInfoShell";

export const Route = createFileRoute("/support")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Contact ASH Glo Support" },
      {
        name: "description",
        content:
          "Reach ASH Global Technologies about ASH Glo payments, withdrawals, bookings, privacy, safety or your account.",
      },
      { property: "og:title", content: "Contact ASH Glo Support" },
      { property: "og:description", content: "Questions about payments, withdrawals or bookings? Message our team." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/support" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/support" }],
  }),
  component: SupportPage,
});

const CATEGORIES = ["GENERAL", "PAYMENT", "WITHDRAWAL", "BOOKING", "ACCOUNT", "BUG"] as const;

function SupportPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const send = useServerFn(submitSupportTicket);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("GENERAL");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail((current) => current || (data.user?.email ?? ""));
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (profile?.full_name) setName((current) => current || profile.full_name);
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await send({ data: { name, email, subject, category, message } });
      if (!result.ok) {
        const map: Record<string, string> = {
          MISSING_FIELDS: fr ? "Remplissez tous les champs." : "Please fill in every field.",
          INVALID_EMAIL: fr ? "Adresse e-mail invalide." : "That email address looks invalid.",
          RATE_LIMITED: fr ? "Trop de messages. Réessayez plus tard." : "Too many messages. Try again later.",
        };
        toast.error(map[result.error] ?? result.error);
        return;
      }
      setReference(result.reference);
      setSubject("");
      setMessage("");
    } catch {
      toast.error(fr ? "Envoi impossible." : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicInfoShell
      eyebrow={fr ? "Aide aux membres" : "Member care"}
      title={fr ? "Support ASH" : "ASH Support"}
      description={fr ? "Obtenez de l’aide pour votre compte, vos réservations et vos paiements Mobile Money." : "Get help with your account, bookings and Mobile Money payments."}
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <LifeBuoy className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-foreground">
            {fr ? "Nous sommes là pour vous aider" : "We’re here to help"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {fr
              ? "Écrivez-nous et conservez votre référence pour le suivi."
              : "Send us a message and keep your reference for follow-up."}
          </p>
        </div>
      </div>

      {reference ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto size-9 text-primary" aria-hidden />
          <h2 className="mt-3 font-display text-lg font-extrabold text-foreground">
            {fr ? "Message reçu" : "Message received"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {fr ? "Référence" : "Reference"} <span className="font-semibold text-foreground">{reference}</span>.{" "}
            {fr
              ? "Notre réponse arrivera à votre adresse e-mail."
              : "Our reply will arrive at your email address."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => setReference(null)}>
              {fr ? "Nouveau message" : "New message"}
            </Button>
            <Button asChild>
              <Link to="/">{fr ? "Retour" : "Back home"}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="support-name">{fr ? "Nom" : "Name"}</Label>
              <Input id="support-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-email">{fr ? "E-mail" : "Email"}</Label>
              <Input
                id="support-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support-category">{fr ? "Catégorie" : "Category"}</Label>
            <select
              id="support-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support-subject">{fr ? "Objet" : "Subject"}</Label>
            <Input id="support-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support-message">{fr ? "Message" : "Message"}</Label>
            <Textarea
              id="support-message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {fr ? "Envoyer" : "Send message"}
          </Button>
        </form>
      )}
    </PublicInfoShell>
  );
}
