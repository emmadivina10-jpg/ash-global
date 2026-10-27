import { useMemo, useState } from "react";
import { Check, Copy, Flame, Loader2, Mail, MessageCircle, Search, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSocialPost, useFriendships } from "@/lib/social.queries";
import { openMemberConversation } from "@/lib/contact-vendor";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useProfile } from "@/lib/queries";
import { trackEvent } from "@/lib/activity";
import { Avatar } from "./AvatarUpload";

export const SHARE_SITE = "https://ashglogroup.company";

/** Public link that previews the exact shared item (not the app landing). */
export function shareLink(kind: "post" | "spotlight" | "store", id: string) {
  return kind === "store" ? `${SHARE_SITE}/s/${id}` : `${SHARE_SITE}/share/${kind}/${id}`;
}

/**
 * Social-app share sheet: send to ASH members in chat, post to your Feed,
 * or share out of ASH (WhatsApp, Facebook, X, email, copy, other apps).
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
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState<Record<string, "busy" | "done">>({});
  const create = useCreateSocialPost();
  const { data: profile } = useProfile();
  const { data: friendships } = useFriendships();
  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (friendships?.friends ?? [])
      .map((f) => f.other)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [friendships, query]);

  function track(channel: string) {
    trackEvent({
      event_type: "share",
      surface: "feed",
      target_type: targetType,
      target_id: targetId,
      metadata: { channel },
    });
  }

  const message = `${note.trim() ? `${note.trim()}\n` : ""}${title}\n${url}`;

  async function sendTo(memberId: string) {
    if (sent[memberId]) return;
    setSent((s) => ({ ...s, [memberId]: "busy" }));
    try {
      const conversationId = await openMemberConversation(memberId);
      const { data: auth } = await supabase.auth.getUser();
      if (!conversationId || !auth.user) throw new Error("no chat");
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: auth.user.id,
        body: message,
        metadata: { source: "ash_share", target_type: targetType, target_id: targetId, url },
      });
      if (error) throw error;
      track("chat");
      setSent((s) => ({ ...s, [memberId]: "done" }));
    } catch {
      setSent((s) => {
        const { [memberId]: _, ...rest } = s;
        return rest;
      });
      toast.error(tx("Could not send", "Envoi impossible"));
    }
  }

  async function toFeed() {
    try {
      await create.mutateAsync({ caption: message, files: [] });
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
      } catch {
        /* dismissed */
      }
    } else void copy();
  }

  const enc = encodeURIComponent;
  const outside = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${title} ${url}`)}`, icon: MessageCircle },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, icon: Share2 },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`, icon: Send },
    { label: tx("Email", "E-mail"), href: `mailto:?subject=${enc(title)}&body=${enc(url)}`, icon: Mail },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setSent({});
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-lg gap-0 overflow-y-auto rounded-2xl p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-center text-lg font-extrabold">{tx("Share", "Partager")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-4 pt-4">
          <div className="flex items-center gap-3">
            <Avatar path={profile?.avatar_url} name={profile?.full_name} className="size-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{profile?.full_name ?? tx("You", "Vous")}</p>
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                <Flame className="size-3" aria-hidden />
                {tx("Feed", "Fil")}
              </span>
            </div>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder={tx("Say something about this…", "Dites quelque chose à ce sujet…")}
            rows={3}
            className="resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
          <p className="line-clamp-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {title}
          </p>
          <div className="flex justify-end">
            <Button className="rounded-lg px-6" onClick={toFeed} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {tx("Share now", "Partager maintenant")}
            </Button>
          </div>
        </div>

        <section className="mt-4 space-y-2 border-t border-border px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-extrabold">{tx("Send in ASH chat", "Envoyer dans le chat ASH")}</h3>
            <div className="relative w-40">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tx("Search", "Rechercher")}
                className="h-8 rounded-full pl-8 text-xs"
              />
            </div>
          </div>
          {people.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {tx("Add friends to send them things in chat.", "Ajoutez des amis pour leur envoyer du contenu.")}
            </p>
          ) : (
            <ul className="flex gap-3 overflow-x-auto pb-1">
              {people.map((p) => (
                <li key={p.id} className="w-[4.5rem] shrink-0 text-center">
                  <button
                    type="button"
                    onClick={() => void sendTo(p.id)}
                    className="flex w-full flex-col items-center gap-1"
                    aria-label={`${tx("Send to", "Envoyer à")} ${p.name}`}
                  >
                    <span className="relative">
                      <Avatar path={p.avatar_url} name={p.name} className="size-14" />
                      <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
                        {sent[p.id] === "busy" ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : sent[p.id] === "done" ? (
                          <Check className="size-3" />
                        ) : (
                          <Send className="size-2.5" />
                        )}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-[11px] leading-tight">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-3 space-y-2 border-t border-border px-4 pb-5 pt-4">
          <h3 className="text-base font-extrabold">{tx("Share to", "Partager sur")}</h3>
          <div className="flex gap-4 overflow-x-auto pb-1">
            <button type="button" onClick={toFeed} className="flex w-16 shrink-0 flex-col items-center gap-1 text-[11px]">
              <span className="grid size-14 place-items-center rounded-full gold-gradient text-primary-foreground">
                <Flame className="size-6" />
              </span>
              {tx("Your Feed", "Votre fil")}
            </button>
            <button type="button" onClick={copy} className="flex w-16 shrink-0 flex-col items-center gap-1 text-[11px]">
              <span className="grid size-14 place-items-center rounded-full bg-secondary">
                <Copy className="size-6" />
              </span>
              {tx("Copy link", "Copier le lien")}
            </button>
            {outside.map((o) => (
              <a
                key={o.label}
                href={o.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track(o.label)}
                className="flex w-16 shrink-0 flex-col items-center gap-1 text-[11px]"
              >
                <span className="grid size-14 place-items-center rounded-full bg-secondary">
                  <o.icon className="size-6" />
                </span>
                {o.label}
              </a>
            ))}
            <button type="button" onClick={native} className="flex w-16 shrink-0 flex-col items-center gap-1 text-[11px]">
              <span className="grid size-14 place-items-center rounded-full bg-secondary">
                <Share2 className="size-6" />
              </span>
              {tx("More", "Plus")}
            </button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
