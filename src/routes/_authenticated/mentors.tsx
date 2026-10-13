import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  useBecomeMentor,
  useMentorRequests,
  useMentors,
  useRequestMentor,
  type Mentor,
} from "@/lib/hub.queries";

export const Route = createFileRoute("/_authenticated/mentors")({
  head: () => ({
    meta: [
      { title: "ASH Mentors — learn from people a step ahead" },
      {
        name: "description",
        content:
          "Book a mentoring session with experienced ASH members, or share your own skills and mentor the next generation.",
      },
      { property: "og:title", content: "ASH Mentors — learn from people a step ahead" },
      { property: "og:description", content: "Request or offer mentoring sessions inside ASH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MentorsPage,
});

function MentorsPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const mentors = useMentors();
  const requests = useMentorRequests();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            ASH Mentors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx(
              "Learn from members a step ahead of you — or share what you know.",
              "Apprenez de membres qui ont une longueur d'avance — ou partagez votre expérience.",
            )}
          </p>
        </div>
        <BecomeMentorDialog fr={fr} />
      </header>

      {mentors.isLoading ? (
        <LoadingState label={tx("Loading mentors…", "Chargement des mentors…")} />
      ) : (mentors.data ?? []).length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-5" aria-hidden />}
          title={tx("No mentors yet", "Aucun mentor pour l'instant")}
          description={tx(
            "Be the first to offer your help.",
            "Soyez le premier à proposer votre aide.",
          )}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(mentors.data ?? []).map((mentor) => (
            <MentorCard key={mentor.id} mentor={mentor} fr={fr} />
          ))}
        </ul>
      )}

      {(requests.data ?? []).length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">
            {tx("Mentoring requests", "Demandes de mentorat")}
          </h2>
          <ul className="space-y-2">
            {(requests.data ?? []).map((request) => (
              <li
                key={request.id}
                className="tile flex flex-wrap items-center justify-between gap-2 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{request.topic}</p>
                  <p className="text-xs text-muted-foreground">{request.person.name}</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {request.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MentorCard({ mentor, fr }: { mentor: Mentor; fr: boolean }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const request = useRequestMentor();

  async function submit() {
    if (topic.trim().length < 3) {
      toast.error(fr ? "Indiquez le sujet." : "Add a topic.");
      return;
    }
    try {
      await request.mutateAsync({ mentorId: mentor.id, topic, message });
      toast.success(fr ? "Demande envoyée." : "Request sent.");
      setOpen(false);
      setTopic("");
      setMessage("");
    } catch {
      toast.error(fr ? "Envoi impossible." : "Could not send the request.");
    }
  }

  return (
    <li className="tile flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <Avatar className="size-10">
          <AvatarImage src={mentor.person.avatar_url ?? undefined} alt="" />
          <AvatarFallback>{mentor.person.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{mentor.person.name}</p>
          <p className="truncate text-xs text-muted-foreground">{mentor.city ?? mentor.country}</p>
        </div>
      </div>
      <p className="text-sm font-medium text-foreground">{mentor.headline}</p>
      {mentor.bio ? (
        <p className="line-clamp-3 text-sm text-muted-foreground">{mentor.bio}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {mentor.skills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
          >
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="font-display text-sm font-extrabold text-foreground">
          {mentor.is_free ? (fr ? "Gratuit" : "Free") : formatXAF(mentor.session_price)}
        </span>
        {mentor.is_mine ? (
          <span className="text-xs text-muted-foreground">
            {fr ? "Votre profil" : "Your profile"}
          </span>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="touch-manipulation">
                {fr ? "Demander une session" : "Request a session"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain">
              <DialogHeader>
                <DialogTitle>{fr ? "Demande de mentorat" : "Mentoring request"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder={
                    fr ? "Sujet (ex. lancer ma boutique)" : "Topic (e.g. launching my shop)"
                  }
                />
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  placeholder={
                    fr
                      ? "Où en êtes-vous ? Que cherchez-vous ?"
                      : "Where are you now, and what do you need?"
                  }
                />
                <Button
                  onClick={submit}
                  disabled={request.isPending}
                  className="w-full touch-manipulation"
                >
                  {request.isPending
                    ? fr
                      ? "Envoi…"
                      : "Sending…"
                    : fr
                      ? "Envoyer"
                      : "Send request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </li>
  );
}

function BecomeMentorDialog({ fr }: { fr: boolean }) {
  const [open, setOpen] = useState(false);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const become = useBecomeMentor();

  async function submit() {
    if (headline.trim().length < 5) {
      toast.error(fr ? "Ajoutez une accroche." : "Add a headline.");
      return;
    }
    try {
      await become.mutateAsync({
        headline,
        bio,
        skills: skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
          .slice(0, 8),
        availability: availability.trim() || "FLEXIBLE",
        is_free: isFree,
        session_price: price ? Number(price) : 0,
        city,
      });
      toast.success(fr ? "Profil de mentor publié." : "Mentor profile published.");
      setOpen(false);
    } catch {
      toast.error(fr ? "Publication impossible." : "Could not publish your profile.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="touch-manipulation">
          <Sparkles className="size-4" aria-hidden />
          {fr ? "Devenir mentor" : "Become a mentor"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>{fr ? "Votre profil de mentor" : "Your mentor profile"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            placeholder={
              fr
                ? "Accroche (ex. J'aide les coiffeuses à grandir)"
                : "Headline (e.g. I help stylists grow)"
            }
          />
          <Textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={5}
            placeholder={
              fr ? "Votre parcours en quelques lignes" : "A few lines about your experience"
            }
          />
          <Input
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder={fr ? "Compétences, séparées par des virgules" : "Skills, comma separated"}
          />
          <Input
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            placeholder={fr ? "Disponibilités (ex. week-ends)" : "Availability (e.g. weekends)"}
          />
          <Input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder={fr ? "Ville" : "City"}
          />
          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
            <span className="text-sm text-foreground">
              {fr ? "Sessions gratuites" : "Free sessions"}
            </span>
            <Switch checked={isFree} onCheckedChange={setIsFree} />
          </div>
          {!isFree ? (
            <Input
              value={price}
              onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder={fr ? "Prix par session" : "Price per session"}
            />
          ) : null}
          <Button
            onClick={submit}
            disabled={become.isPending}
            className="w-full touch-manipulation"
          >
            {become.isPending ? (fr ? "Enregistrement…" : "Saving…") : fr ? "Publier" : "Publish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
