import { useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./AvatarUpload";
import { StoryViewer } from "./StoryViewer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateStory, useStories } from "@/lib/social.queries";
import { useProfile } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";

/**
 * The Facebook-style story rail at the top of ASH Spotlight. The first tile
 * always creates a story ("Create Spotlight"); the rest open the viewer.
 */
export function StoriesRail() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { data } = useStories();
  const { data: profile } = useProfile();
  const create = useCreateStory();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const groups = data?.groups ?? [];
  const me = data?.me ?? null;

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
    create.mutate(
      { file, caption },
      {
        onSuccess: () => {
          toast.success(fr ? "Spotlight publié — 24 h" : "Spotlight posted — live for 24 h");
          setFile(null);
          setPreview(null);
          setCaption("");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not post."),
      },
    );
  }

  return (
    <>
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
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
            <span className="text-[12px] font-bold text-foreground">{fr ? "Créer" : "Create story"}</span>
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
                <Avatar
                  path={group.author.avatar_url}
                  name={group.author.name}
                  className="size-full rounded-full"
                />
              </span>
              <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-[12px] font-bold leading-tight text-white drop-shadow">
                {group.author.id === me ? (fr ? "Vous" : "Your story") : group.author.name}
              </span>
            </button>
          );
        })}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />

      <Dialog
        open={Boolean(file)}
        onOpenChange={(open) => {
          if (!open) {
            setFile(null);
            setPreview(null);
            setCaption("");
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{fr ? "Créer un Spotlight" : "Create Spotlight"}</DialogTitle>
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
          <Button onClick={publish} disabled={create.isPending} className="touch-manipulation">
            {create.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {fr ? "Publier" : "Share"}
          </Button>
        </DialogContent>
      </Dialog>

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
