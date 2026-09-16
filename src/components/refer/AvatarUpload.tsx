import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { verifyMediaFiles } from "@/lib/media-safety";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

/** Resolves a stored avatar path to a temporary viewable URL. */
export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }
    void supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
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
}: {
  path: string | null | undefined;
  name?: string | null | undefined;
  className?: string | undefined;
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
        "grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name ?? "Profile picture"} className="size-full object-cover" loading="lazy" />
      ) : initials ? (
        initials
      ) : (
        <User className="size-1/2" aria-hidden />
      )}
    </span>
  );
}

export function AvatarUpload({
  userId,
  path,
  name,
  onUploaded,
}: {
  userId: string;
  path: string | null | undefined;
  name?: string | null | undefined;
  onUploaded: (path: string) => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

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
        <Avatar path={path} name={name} className="size-20 ring-2 ring-border" />
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
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>
    </div>
  );
}
