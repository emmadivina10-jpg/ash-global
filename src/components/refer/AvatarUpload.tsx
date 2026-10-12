import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { verifyMediaFiles } from "@/lib/media-safety";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reviewIdentityPhoto } from "@/lib/identity.functions";
import { announceIdentityDenial, IDENTITY_DENIED } from "@/lib/identity-client";
import { useI18n } from "@/lib/i18n";

const MAX_BYTES = 5 * 1024 * 1024;
const avatarUrlCache = new Map<string, { url: string; expiresAt: number }>();
const pendingAvatarUrls = new Map<string, Promise<string | null>>();

export async function resolveAvatarUrl(path: string) {
  if (path.startsWith("http")) return path;
  const cached = avatarUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const pending = pendingAvatarUrls.get(path);
  if (pending) return pending;
  const request = supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24).then(({ data }) => {
    const url = data?.signedUrl ?? null;
    if (url) avatarUrlCache.set(path, { url, expiresAt: Date.now() + 23 * 60 * 60 * 1000 });
    pendingAvatarUrls.delete(path);
    return url;
  });
  pendingAvatarUrls.set(path, request);
  return request;
}

/** Resolves a stored avatar path to a temporary viewable URL. */
export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    void resolveAvatarUrl(path).then((next) => {
      if (!cancelled) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}

export function Avatar({
  path,
  name,
  className,
  online = false,
  hasUpdate = false,
}: {
  path: string | null | undefined;
  name?: string | null | undefined;
  className?: string | undefined;
  online?: boolean | undefined;
  hasUpdate?: boolean | undefined;
}) {
  const url = useAvatarUrl(path);
  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={cn(
        "relative grid size-11 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-muted-foreground",
        hasUpdate && "brand-gradient p-[2px]",
        className,
      )}
    >
      <span className={cn("relative z-[1] grid size-full place-items-center overflow-hidden rounded-full bg-muted", hasUpdate && "ring-2 ring-background")}>
        {url ? (
          <img src={url} alt={name ?? "Profile picture"} className="size-full object-cover" loading="lazy" decoding="async" />
        ) : initials ? (
          initials
        ) : (
          <User className="size-1/2" aria-hidden />
        )}
      </span>
      {online ? (
        <span
          className="absolute bottom-[3%] right-[3%] z-[2] size-[25%] min-h-2 min-w-2 rounded-full bg-success ring-2 ring-background"
          aria-label="Online"
          role="img"
        />
      ) : null}
    </span>
  );
}

export function AvatarUpload({
  userId,
  path,
  name,
  online = false,
  onUploaded,
}: {
  userId: string;
  path: string | null | undefined;
  name?: string | null | undefined;
  online?: boolean | undefined;
  onUploaded: (path: string) => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image is too large — 5MB maximum.");
      return;
    }

    setBusy(true);
    setDenied(false);
    try {
      await verifyMediaFiles([file], "PROFILE_AVATAR");
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "This photo could not be checked.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const objectPath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      setBusy(false);
      toast.error(`Upload failed: ${error.message}`);
      return;
    }
    try {
      const identity = await reviewIdentityPhoto({ data: { path: objectPath } });
      if (!identity.ok) {
        setDenied(true);
        announceIdentityDenial(identity);
        throw new Error(IDENTITY_DENIED);
      }
      await onUploaded(objectPath);
      if (path && !path.startsWith("http")) await supabase.storage.from("avatars").remove([path]);
      toast.success("Profile picture updated.");
    } catch (saveError) {
      await supabase.storage.from("avatars").remove([objectPath]);
      toast.error(saveError instanceof Error ? saveError.message : "Could not save your picture.");
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar path={path} name={name} online={online} className="size-20 ring-2 ring-border" />
        {busy ? (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-foreground/50">
            <Loader2 className="size-5 animate-spin text-background" aria-hidden />
          </span>
        ) : null}
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Camera className="size-4" aria-hidden />
          {path ? "Change photo" : "Add photo"}
        </Button>
        <p className="mt-1.5 text-xs text-muted-foreground">JPG or PNG, up to 5MB.</p>
        {denied && <p role="alert" className="mt-2 text-sm font-semibold text-destructive">Denied</p>}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>
    </div>
  );
}

/**
 * An avatar the member can tap to open the photo full-screen. Without a
 * stored photo it renders the plain avatar and is not clickable.
 */
export function AvatarPhoto({
  path,
  name,
  online,
  hasUpdate,
  className,
}: {
  path: string | null | undefined;
  name?: string | null | undefined;
  online?: boolean | undefined;
  hasUpdate?: boolean | undefined;
  className?: string | undefined;
}) {
  const { tx } = useI18n();
  const [open, setOpen] = useState(false);
  const url = useAvatarUrl(open ? path : null);
  const label = tx("View profile photo", "Voir la photo de profil");

  const avatar = <Avatar path={path} name={name} online={online} hasUpdate={hasUpdate} className={className} />;

  return (
    <>
      {path ? (
        <button
          type="button"
          aria-label={label}
          title={label}
          onClick={() => setOpen(true)}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {avatar}
        </button>
      ) : (
        avatar
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          overlayClassName="bg-foreground/40 backdrop-blur-md duration-300 motion-reduce:animate-none"
          className="grid h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-none place-items-center overflow-hidden border-0 bg-transparent p-0 shadow-none duration-300 motion-reduce:animate-none"
        >
          <DialogTitle className="sr-only">{name ?? tx("Profile photo", "Photo de profil")}</DialogTitle>
          {url ? (
            <img
              src={url}
              alt={name ?? tx("Profile photo", "Photo de profil")}
              className="size-[min(80vw,70dvh)] max-w-none rounded-full object-cover shadow-raised"
            />
          ) : (
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
