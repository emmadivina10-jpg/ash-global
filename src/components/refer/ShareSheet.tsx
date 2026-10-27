import { useState } from "react";
import { Copy, Flame, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSocialPost } from "@/lib/social.queries";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/activity";

export const SHARE_SITE = "https://ashglogroup.company";

/** Public link that previews the exact shared item (not the app landing). */
export function shareLink(kind: "post" | "spotlight" | "store", id: string) {
  return kind === "store" ? `${SHARE_SITE}/s/${id}` : `${SHARE_SITE}/share/${kind}/${id}`;
}

/**
 * Facebook-style share: post it to your own Feed with a note, copy the link,
 * or send it through other apps. Links open the shared item itself.
 */
export function ShareSheet({
  open,
  onOpenChange,
  url,
  title,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  targetType: string;
  targetId: string;
}) {
  const { tx } = useI18n();
  const [note, setNote] = useState("");
  const create = useCreateSocialPost();

  function track(channel: string) {
    trackEvent({
      event_type: `share_${channel}`,
      surface: "feed",
      target_type: targetType,
      target_id: targetId,
    });
  }

  async function toFeed() {
    try {
      await create.mutateAsync({
        caption: `${note.trim() ? `${note.trim()}\n\n` : ""}${title}\n${url}`,
        files: [],
      });
      track("feed");
      toast.success(tx("Shared to your Feed", "Partagé sur votre fil"));
      setNote("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tx("Could not share", "Partage impossible"));
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      track("copy");
      toast.success(tx("Link copied", "Lien copié"));
    } catch {
      toast.error(tx("Could not copy", "Copie impossible"));
    }
  }

  async function native() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        track("native");
        onOpenChange(false);
      } catch {
        /* dismissed */
      }
    } else void copy();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{tx("Share", "Partager")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder={tx("Say something about this…", "Dites quelque chose à ce sujet…")}
            rows={3}
          />
          <p className="truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {title}
          </p>
          <Button className="w-full rounded-full" onClick={toFeed} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Flame className="size-4" />}
            {tx("Share to Feed", "Partager sur le fil")}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-full" onClick={copy}>
              <Copy className="size-4" />
              {tx("Copy link", "Copier le lien")}
            </Button>
            <Button variant="outline" className="rounded-full" onClick={native}>
              <Share2 className="size-4" />
              {tx("Other apps", "Autres apps")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
