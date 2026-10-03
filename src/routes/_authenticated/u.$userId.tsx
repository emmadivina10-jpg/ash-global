import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SafetyMenu } from "@/components/refer/SafetyMenu";
import { BlockUserDialog } from "@/components/refer/BlockUserDialog";
import { MessageSquare, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/refer/AvatarUpload";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { SocialPostOwnerActions } from "@/components/refer/SocialPostOwnerActions";
import { Button } from "@/components/ui/button";
import { openMemberConversation } from "@/lib/contact-vendor";
import {
  useFriendships,
  useMemberPosts,
  useMemberProfile,
  useSendFriendRequest,
} from "@/lib/social.queries";
import { useI18n } from "@/lib/i18n";
import { useTrackView } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/u/$userId")({
  head: () => ({
    meta: [
      { title: "Member profile — ASH" },
      { name: "description", content: "See an ASH member's photos, badge and posts, and message them." },
      { property: "og:title", content: "Member profile — ASH" },
      { property: "og:description", content: "See an ASH member's photos, badge and posts." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemberProfilePage,
});

function MemberProfilePage() {
  const { userId } = Route.useParams();
  const { lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const { data: person, isLoading } = useMemberProfile(userId);
  const { data: posts } = useMemberPosts(userId);
  const { data: graph } = useFriendships();
  const send = useSendFriendRequest();

  useTrackView(
    { event_type: "profile_view", surface: "profile", target_type: "profile", target_id: userId, author_id: userId },
    Boolean(person),
  );

  const me = graph?.me ?? null;
  const isMe = me === userId;
  const [unblockOpen, setUnblockOpen] = useState(false);
  const blocked = useQuery({
    queryKey: ["my-block", userId],
    enabled: Boolean(me) && !isMe,
    queryFn: async () => {
      const { data } = await supabase.from("user_blocks").select("id").eq("blocked_id", userId).maybeSingle();
      return Boolean(data);
    },
  });
  const iBlocked = blocked.data === true;
  const linked =
    (graph?.friends ?? []).some((f) => f.other.id === userId) ||
    (graph?.incoming ?? []).some((f) => f.other.id === userId) ||
    (graph?.outgoing ?? []).some((f) => f.other.id === userId);

  async function message() {
    const conversationId = await openMemberConversation(userId);
    if (!conversationId) {
      toast.error(fr ? "Impossible d'ouvrir la discussion." : "Could not open the chat.");
      return;
    }
    void navigate({ to: "/messages", search: { c: conversationId } } as never);
  }

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</p>;
  }

  if (!person) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        {fr ? "Ce membre est introuvable." : "We could not find this member."}
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <header className="tile flex items-center gap-4 p-5">
        <Avatar path={person.avatar_url} name={person.name} online={person.online} hasUpdate={person.has_update} className="size-20" />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 font-display text-xl font-bold text-foreground">
            <span className="truncate">{person.name}</span>
            <VerifiedBadge tier={person.verified_tier} until={person.verified_until} size={18} />
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {(posts ?? []).length} {fr ? "publications" : "posts"}
          </p>
        </div>
        {isMe ? null : (
          <SafetyMenu targetType="USER" targetId={userId} targetUserId={iBlocked ? null : userId} targetName={person.name} />
        )}
      </header>

      {!isMe && iBlocked ? (
        <div className="tile flex items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            {fr ? "Vous avez bloqué ce membre. Son contenu est masqué." : "You blocked this member. Their content is hidden."}
          </p>
          <Button variant="outline" size="sm" onClick={() => setUnblockOpen(true)}>
            {fr ? "Débloquer" : "Unblock User"}
          </Button>
          <BlockUserDialog
            open={unblockOpen}
            onOpenChange={setUnblockOpen}
            targetUserId={userId}
            targetName={person.name}
            source="profile"
            unblock
          />
        </div>
      ) : null}

      {isMe || iBlocked ? null : (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => void message()}>
            <MessageSquare className="size-4" aria-hidden />
            {fr ? "Message" : "Message"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={linked || send.isPending}
            onClick={() =>
              send.mutate(userId, {
                onSuccess: () => toast.success(fr ? "Demande envoyée" : "Request sent"),
                onError: () => toast.error(fr ? "Échec de l'envoi" : "Could not send"),
              })
            }
          >
            <UserPlus className="size-4" aria-hidden />
            {linked ? (fr ? "Déjà lié" : "Already linked") : fr ? "Ajouter" : "Add friend"}
          </Button>
        </div>
      )}

      <section className="space-y-3">
        {(posts ?? []).length === 0 ? (
          <p className="tile p-6 text-center text-sm text-muted-foreground">
            {fr ? "Aucune publication pour le moment." : "No posts yet."}
          </p>
        ) : (
          (posts ?? []).map((post) => (
            <article key={post.id} className="tile overflow-hidden">
              <div className="flex items-start gap-2 px-4 py-3">
                {post.caption ? (
                  <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-foreground">{post.caption}</p>
                ) : <span className="flex-1" />}
                {isMe ? <SocialPostOwnerActions postId={post.id} caption={post.caption} /> : null}
              </div>
              {post.images.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/post/$postId", params: { postId: post.id } })}
                  className={`grid w-full gap-0.5 ${post.images.length > 1 ? "aspect-square grid-cols-2 grid-rows-2" : "grid-cols-1"}`}
                >
                  {post.images.map((src, index) => (
                    <img
                      key={index}
                      src={src}
                      alt=""
                      loading="lazy"
                      className={`size-full min-h-0 bg-muted object-cover ${
                        post.images.length === 2 ? "row-span-2" : post.images.length === 3 && index === 0 ? "col-span-2" : ""
                      }`}
                    />
                  ))}
                </button>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
