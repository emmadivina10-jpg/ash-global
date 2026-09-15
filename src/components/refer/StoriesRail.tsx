import { useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./AvatarUpload";
import { StoryBubble, StoryViewer } from "./StoryViewer";
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
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-20 shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative grid size-[68px] place-items-center overflow-hidden rounded-full border-2 border-dashed border-primary/40 bg-muted">
            <Avatar path={profile?.avatar_url} name={profile?.full_name} className="size-full rounded-full" />
            <span className="brand-gradient absolute bottom-0 right-0 grid size-6 place-items-center rounded-full border-2 border-background text-primary-foreground">
              <Plus className="size-3.5" aria-hidden />
            </span>
          </span>
          <span className="w-full truncate text-center text-[11px] font-bold text-primary">
            {fr ? "Créer" : "Create"}
          </span>
        </button>

        {groups.map((group, index) => (
          <StoryBubble
            key={group.author.id}
            name={group.author.id === me ? (fr ? "Vous" : "You") : group.author.name}
            avatar={group.author.avatar_url}
            image={group.stories[group.stories.length - 1]?.url}
            seen={group.seen}
            onClick={() => setViewerIndex(index)}
          />
        ))}
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
