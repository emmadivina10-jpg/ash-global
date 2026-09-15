import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Film, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/refer/AvatarUpload";
import { useMyProviderProfile } from "@/lib/marketplace.queries";
import { useCreateSpotlight } from "@/lib/spotlight.queries";
import { useI18n } from "@/lib/i18n";

function useMyIdentity() {
  return useQuery({
    queryKey: ["profile", "spotlight-identity"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      return (data as { full_name: string; avatar_url: string | null } | null) ?? null;
    },
  });
}

/**
 * Facebook-style "create a Spotlight" row: tapping it opens a composer where a
 * member writes a caption and attaches photos or videos.
 */
export function SpotlightComposer({
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
} = {}) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { data: identity } = useMyIdentity();
  const { data: provider } = useMyProviderProfile();
  const create = useCreateSpotlight();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; video: boolean }[]>([]);
  const [asBusiness, setAsBusiness] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setPreviews([]);
    setFiles([]);
    setCaption("");
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).slice(0, 4 - files.length);
    setFiles((current) => [...current, ...picked]);
    setPreviews((current) => [
      ...current,
      ...picked.map((file) => ({ url: URL.createObjectURL(file), video: file.type.startsWith("video/") })),
    ]);
  };

  const removeAt = (index: number) => {
    const preview = previews[index];
    if (preview) URL.revokeObjectURL(preview.url);
    setFiles((current) => current.filter((_, i) => i !== index));
    setPreviews((current) => current.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (files.length === 0) {
      toast.error(fr ? "Ajoutez une photo ou une vidéo." : "Add a photo or a video.");
      return;
    }
    try {
      await create.mutateAsync({
        caption,
        files,
        providerId: asBusiness && provider ? provider.id : null,
      });
      toast.success(fr ? "Votre Spotlight est en ligne." : "Your Spotlight is live.");
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : fr
            ? "Publication impossible pour le moment."
            : "Could not publish right now.",
      );
    }
  };

  const displayName = provider && asBusiness ? provider.business_name : (identity?.full_name ?? "ASH");

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full touch-manipulation items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 text-left shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
        >
          <Avatar path={identity?.avatar_url ?? null} name={displayName} className="size-9" />
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {fr ? "Partagez un Spotlight…" : "Share a spotlight…"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary">
            <ImagePlus className="size-3.5" aria-hidden />
            {fr ? "Photo / Vidéo" : "Photo / Video"}
          </span>
        </button>
      )}


      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden />
              {fr ? "Créer un Spotlight" : "Create a Spotlight"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar path={identity?.avatar_url ?? null} name={displayName} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
                {provider ? (
                  <button
                    type="button"
                    onClick={() => setAsBusiness((value) => !value)}
                    className="text-[11px] font-semibold text-primary"
                  >
                    {asBusiness
                      ? fr
                        ? "Publier en mon nom"
                        : "Post as myself"
                      : fr
                        ? "Publier comme entreprise"
                        : "Post as my business"}
                  </button>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {fr ? "Publication personnelle" : "Personal post"}
                  </p>
                )}
              </div>
            </div>

            <Textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={4}
              maxLength={600}
              placeholder={
                fr
                  ? "Que voulez-vous partager ? Offre, nouveauté, coulisses…"
                  : "What do you want to share? An offer, a new drop, behind the scenes…"
              }
            />

            {previews.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {previews.map((preview, index) => (
                  <div
                    key={preview.url}
                    className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted"
                  >
                    {preview.video ? (
                      <video src={preview.url} muted playsInline className="size-full object-cover" />
                    ) : (
                      <img src={preview.url} alt="" className="size-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-background/85 text-foreground"
                      aria-label={fr ? "Retirer" : "Remove"}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="touch-manipulation"
                disabled={files.length >= 4}
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus className="size-4" aria-hidden />
                {fr ? "Photo" : "Photo"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="touch-manipulation"
                disabled={files.length >= 4}
                onClick={() => inputRef.current?.click()}
              >
                <Film className="size-4" aria-hidden />
                {fr ? "Vidéo" : "Video"}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              {fr
                ? "Jusqu’à 4 fichiers, 50 Mo maximum par fichier."
                : "Up to 4 files, 50 MB maximum per file."}
            </p>

            <Button
              type="button"
              size="lg"
              className="w-full touch-manipulation"
              disabled={create.isPending}
              onClick={() => void submit()}
            >
              {create.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {fr ? "Publier" : "Publish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
