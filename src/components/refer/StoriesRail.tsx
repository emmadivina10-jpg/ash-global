import { useRef, useState } from "react";
import { BadgeCheck, Clock3, Globe2, Loader2, Plus, Search, Sparkles, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./AvatarUpload";
import { StoryViewer } from "./StoryViewer";
import { SpotlightComposer } from "./SpotlightComposer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useCreateStory,
  useMemberSearch,
  useStories,
  type SocialAuthor,
  type StoryAudience,
} from "@/lib/social.queries";
import { useSpotlightFeed, type SpotlightEntry } from "@/lib/spotlight.queries";
import { useProfile } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * One rail, two distinct things:
 *  - Stories: 24-hour moments, round avatar ring, they expire.
 *  - Spotlight: lasting highlights from members and vendors, gold badge.
 * The first tile lets the member choose which one to create.
 */
export function StoriesRail() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { data } = useStories();
  const { data: spotlight } = useSpotlightFeed(12);
  const { data: profile } = useProfile();
  const create = useCreateStory();
  const fileRef = useRef<HTMLInputElement>(null);

  const [chooser, setChooser] = useState(false);
  const [spotlightComposer, setSpotlightComposer] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [reelIndex, setReelIndex] = useState<number | null>(null);
  // Stories are open to everyone by default; the member can hide from some
  // people, or flip it around and pick exactly who may watch.
  const [audience, setAudience] = useState<StoryAudience>("ALL");
  const [chosen, setChosen] = useState<SocialAuthor[]>([]);
  const [blocked, setBlocked] = useState<SocialAuthor[]>([]);
  const [search, setSearch] = useState("");
  const { data: matches } = useMemberSearch(search);

  const picked = audience === "ALL" ? blocked : chosen;
  const setPicked = audience === "ALL" ? setBlocked : setChosen;

  function togglePerson(person: SocialAuthor) {
    setPicked((current) =>
      current.some((entry) => entry.id === person.id)
        ? current.filter((entry) => entry.id !== person.id)
        : [...current, person],
    );
  }

  function resetStoryComposer() {
    setFile(null);
    setPreview(null);
    setCaption("");
    setAudience("ALL");
    setChosen([]);
    setBlocked([]);
    setSearch("");
  }

  const groups = data?.groups ?? [];
  const me = data?.me ?? null;
  const highlights = spotlight ?? [];

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      toast.error(fr ? "Choisissez une photo." : "Please choose a photo.");
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  function publish() {
    if (!file) return;
    if (audience === "SELECT" && chosen.length === 0) {
      toast.error(fr ? "Choisissez au moins une personne." : "Pick at least one person.");
      return;
    }
    create.mutate(
      {
        file,
        caption,
        audience,
        allowIds: chosen.map((person) => person.id),
        blockIds: blocked.map((person) => person.id),
      },
      {
        onSuccess: () => {
          toast.success(fr ? "Story publiée — 24 h" : "Story posted — live for 24 h");
          resetStoryComposer();
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not post."),
      },
    );
  }

  return (
    <>
      <div className="-mx-4 flex snap-x items-stretch gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setChooser(true)}
          className="relative w-[112px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm"
        >
          <span className="block h-[132px] w-full overflow-hidden bg-muted">
            <Avatar
              path={profile?.avatar_url}
              name={profile?.full_name}
              className="size-full rounded-none object-cover"
            />
          </span>
          <span className="flex h-[58px] items-end justify-center pb-2">
            <span className="text-[12px] font-bold text-foreground">{fr ? "Créer" : "Create"}</span>
          </span>
          <span className="brand-gradient absolute left-1/2 top-[110px] grid size-9 -translate-x-1/2 place-items-center rounded-full border-[3px] border-card text-primary-foreground">
            <Plus className="size-4" aria-hidden />
          </span>
        </button>

        {groups.map((group, index) => {
          const cover = group.stories[group.stories.length - 1]?.url;
          return (
            <button
              key={group.author.id}
              type="button"
              onClick={() => setViewerIndex(index)}
              className="relative h-[190px] w-[112px] shrink-0 snap-start overflow-hidden rounded-2xl bg-muted text-left shadow-sm"
            >
              {cover ? (
                <img src={cover} alt="" className="size-full object-cover" loading="lazy" />
              ) : (
                <span className="block size-full bg-gradient-to-b from-muted to-secondary" />
              )}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
              <span
                className={cn(
                  "absolute left-2 top-2 grid size-9 place-items-center rounded-full border-[3px] bg-card",
                  group.seen ? "border-muted-foreground/50" : "border-primary",
                )}
              >
                <Avatar path={group.author.avatar_url} name={group.author.name} className="size-full rounded-full" />
              </span>
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-white">
                <Clock3 className="size-2.5" aria-hidden />
                24h
              </span>
              <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-[12px] font-bold leading-tight text-white drop-shadow">
                {group.author.id === me ? (fr ? "Vous" : "Your story") : group.author.name}
              </span>
            </button>
          );
        })}

        {highlights.length > 0 ? (
          <span className="mx-1 my-3 w-px shrink-0 bg-border" aria-hidden />
        ) : null}

        {highlights.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => (onOpenSpotlight ? onOpenSpotlight(index) : setPreviewEntry(entry))}
            className="relative h-[190px] w-[112px] shrink-0 snap-start overflow-hidden rounded-2xl border border-primary/30 bg-muted text-left shadow-sm"
          >
            {entry.media_type === "video" ? (
              <video src={entry.url} muted playsInline className="size-full object-cover" />
            ) : (
              <img src={entry.url} alt="" className="size-full object-cover" loading="lazy" />
            )}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
            <span className="brand-gradient absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary-foreground">
              <Sparkles className="size-2.5" aria-hidden />
              {fr ? "Spot" : "Spot"}
            </span>
            <span className="absolute inset-x-2 bottom-2 space-y-0.5">
              <span className="flex items-center gap-1 text-[12px] font-bold leading-tight text-white drop-shadow">
                <span className="line-clamp-1">{entry.provider.business_name}</span>
                {entry.provider.is_verified ? (
                  <BadgeCheck className="size-3 shrink-0 text-primary" aria-hidden />
                ) : null}
              </span>
              {entry.caption ? (
                <span className="line-clamp-1 text-[10px] text-white/80">{entry.caption}</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />

      {/* Choose which kind of moment to share. */}
      <Dialog open={chooser} onOpenChange={setChooser}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{fr ? "Partager un moment" : "Share a moment"}</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => {
              setChooser(false);
              fileRef.current?.click();
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Clock3 className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">{fr ? "Story" : "Story"}</span>
              <span className="block text-xs text-muted-foreground">
                {fr ? "Une photo qui disparaît après 24 heures." : "One photo that disappears after 24 hours."}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setChooser(false);
              setSpotlightComposer(true);
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-card p-3 text-left transition-colors hover:border-primary"
          >
            <span className="brand-gradient grid size-10 shrink-0 place-items-center rounded-full text-primary-foreground">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">Spotlight</span>
              <span className="block text-xs text-muted-foreground">
                {fr
                  ? "Photos ou vidéos qui restent — offres, nouveautés, coulisses."
                  : "Photos or videos that stay — offers, drops, behind the scenes."}
              </span>
            </span>
          </button>
        </DialogContent>
      </Dialog>

      <SpotlightComposer hideTrigger open={spotlightComposer} onOpenChange={setSpotlightComposer} />

      <Dialog
        open={Boolean(file)}
        onOpenChange={(open) => {
          if (!open) resetStoryComposer();
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{fr ? "Créer une story" : "Create a story"}</DialogTitle>
          </DialogHeader>
          {preview ? (
            <img src={preview} alt="" className="max-h-[50vh] w-full rounded-2xl object-contain" />
          ) : null}
          <Input
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, 200))}
            placeholder={fr ? "Dites quelque chose (facultatif)" : "Say something (optional)"}
            aria-label={fr ? "Légende" : "Caption"}
          />
          <p className="text-xs text-muted-foreground">
            {fr ? "Visible 24 heures. Vous verrez qui l'a regardé." : "Live for 24 hours. You'll see who watched it."}
          </p>

          {/* Who can watch — everyone by default, friends or not. */}
          <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
            <p className="text-xs font-bold text-foreground">
              {fr ? "Qui peut regarder" : "Who can watch"}
            </p>
            <div className="flex gap-2">
              {([
                { id: "ALL" as const, icon: Globe2, en: "Everyone", fr: "Tout le monde" },
                { id: "SELECT" as const, icon: Search, en: "Only chosen", fr: "Choisis" },
              ]).map((option) => {
                const Icon = option.icon;
                const active = audience === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setAudience(option.id)}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors",
                      active
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {fr ? option.fr : option.en}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {audience === "ALL"
                ? fr
                  ? "Tout membre ASH peut la voir, ami ou non. Vous pouvez bloquer certaines personnes."
                  : "Any ASH member can watch, friend or not. You can block certain people."
                : fr
                  ? "Seules les personnes choisies pourront la voir."
                  : "Only the people you pick will be able to watch."}
            </p>

            {picked.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {picked.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => togglePerson(person)}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground"
                  >
                    {audience === "ALL" ? (
                      <UserMinus className="size-3" aria-hidden />
                    ) : null}
                    {person.name}
                    <X className="size-3" aria-hidden />
                  </button>
                ))}
              </div>
            ) : null}

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                audience === "ALL"
                  ? fr
                    ? "Bloquer quelqu'un — tapez un nom"
                    : "Block someone — type a name"
                  : fr
                    ? "Ajouter quelqu'un — tapez un nom"
                    : "Add someone — type a name"
              }
              aria-label={fr ? "Rechercher un membre" : "Search a member"}
            />
            {search.trim().length >= 2 ? (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {(matches ?? []).map((person) => {
                  const on = picked.some((entry) => entry.id === person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => togglePerson(person)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                        on ? "bg-primary/10 text-primary" : "hover:bg-secondary",
                      )}
                    >
                      <Avatar path={person.avatar_url} name={person.name} className="size-7 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{person.name}</span>
                      {on ? <span>{fr ? "Retirer" : "Remove"}</span> : null}
                    </button>
                  );
                })}
                {(matches ?? []).length === 0 ? (
                  <p className="px-2 py-1 text-[11px] text-muted-foreground">
                    {fr ? "Aucun membre trouvé." : "No member found."}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <Button onClick={publish} disabled={create.isPending} className="touch-manipulation">
            {create.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {fr ? "Publier" : "Share"}
          </Button>
        </DialogContent>
      </Dialog>

      {reelIndex !== null ? (
        <SpotlightReels
          entries={highlights}
          startIndex={reelIndex}
          onClose={() => setReelIndex(null)}
        />
      ) : null}


      {viewerIndex !== null ? (
        <StoryViewer
          groups={groups}
          startIndex={viewerIndex}
          currentUserId={me}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </>
  );
}
